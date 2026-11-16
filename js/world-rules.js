/* Pure shared world rules. This factory is serialized into exported offline games. */
function gameForgeWorldRules(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
 function moveCircle(p,dx,dz,r,solids,size){
  let x=p.x,z=p.z;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/Math.max(.2,r*.7)));
  const blocked=(a,b)=>solids.some(o=>{const nx=clamp(a,o.x-o.w/2,o.x+o.w/2),nz=clamp(b,o.z-o.d/2,o.z+o.d/2);return (a-nx)**2+(b-nz)**2<r*r-1e-8;});
  for(let i=0;i<steps;i++){const nx=clamp(x+dx/steps,-size/2+r,size/2-r);if(!blocked(nx,z))x=nx;const nz=clamp(z+dz/steps,-size/2+r,size/2-r);if(!blocked(x,nz))z=nz;}
  return {x,z};
 }
 // Direção de perseguição com separação local: evita inimigos empilhados no mesmo ponto.
 // Sem estado e sem RNG; IDs estáveis resolvem pares perfeitamente sobrepostos.
 function crowdDirection(actor,target,actors,spacing=1.15){
  const dx=target.x-actor.x,dz=target.z-actor.z,goalLength=Math.hypot(dx,dz);
  let x=goalLength>1e-8?dx/goalLength:0,z=goalLength>1e-8?dz/goalLength:0;
  let avoidX=0,avoidZ=0;
  for(let i=0;i<actors.length;i++){
   const other=actors[i];
   if(other===actor||other.hp<=0)continue;
   const minDistance=spacing*(actor.boss?1.25:1)+(other.boss?.55:0);
   const px=actor.x-other.x,pz=actor.z-other.z;
   const distSq=px*px+pz*pz;
   if(distSq>=minDistance*minDistance)continue;
   if(distSq<1e-10){
    const ownId=Number.isInteger(actor.id)?actor.id:actors.indexOf(actor);
    const otherId=Number.isInteger(other.id)?other.id:i;
    const sign=ownId===otherId?0:ownId<otherId?-1:1;
    avoidX+=sign;avoidZ+=sign*.5;
   }else{
    const dist=Math.sqrt(distSq),weight=(minDistance-dist)/minDistance;
    avoidX+=px/dist*weight;
    avoidZ+=pz/dist*weight;
   }
  }
  x+=avoidX*1.65;z+=avoidZ*1.65;
  const length=Math.hypot(x,z);
  return length>1e-8?{x:x/length,z:z/length}:{x:0,z:0};
 }
 function platformRoute(seed,stage,size){
  const random=rng((seed||12345)+stage*997),route=[];let y=0,z=0;
  for(let i=0;i<Math.round(clamp(Number(size)||48,32,88)/4)+Math.min(6,Math.floor(stage/5));i++){
   if(i){y=clamp(y+(random()-.45)*1.2,0,3);z=clamp(z+(random()-.5)*1.8,-2.5,2.5);}
   route.push({x:i*5.2,y,z,w:i===0?5:4.2,d:4.4});
  }return route;
 }
 function raceProgress(progress,gate,count,laps){
  let next=progress.next,lap=progress.lap;
  if(gate===next&&lap<laps){next++;if(next===count){next=0;lap++;}}
  return {next,lap,complete:lap>=laps};
 }
 function trackRibbon(rx,rz,width,segments){
  const positions=[],indices=[];
  for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;for(const offset of [-width/2,width/2])positions.push(Math.cos(a)*(rx+offset),.025,Math.sin(a)*(rz+offset));if(i<segments){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}
  return {positions,indices};
 }
 function goalReady(genre,s){return genre==='racing'?!!s.complete:genre==='platform'?s.collected>=s.required:s.enemies===0&&s.collected>=s.required;}
 // Missões extras usam somente informações verificáveis do estado, sem timers de sistema.
 function missionReady(mode,s){
  if(mode==='eliminate')return s.enemies===0;
  if(mode==='collect')return s.collected>=s.required;
  if(mode==='survive')return Number.isFinite(s.elapsed)&&s.elapsed>=clamp(Number(s.seconds)||45,5,180);
  return goalReady('arena',s);
 }
 // GF-007: perfis realmente alteram HP, dano, velocidade e tamanho dos NPCs.
 function enemyProfile(type,index=0){
  const actual=type==='mixed'?['runner','sentinel','brute'][Math.abs(index)%3]:type;
  const profiles={
   runner:{id:'runner',health:0.75,speed:1.75,scale:.88,damage:8},
   brute:{id:'brute',health:2.8,speed:.68,scale:1.27,damage:16},
   sentinel:{id:'sentinel',health:1.65,speed:.86,scale:1.08,damage:12},
   default:{id:'default',health:1,speed:1,scale:1,damage:10}
  };
  return profiles[actual]||profiles.default;
 }
 function dueStageEvents(events,elapsed,fired){
  if(!Array.isArray(events)||!Number.isFinite(elapsed))return [];
  const used=new Set(Array.isArray(fired)?fired:[]);
  return events.filter(e=>e&&['reinforcements','heal'].includes(e.type)&&
   (e.id==='event-'+e.type)&&Number.isInteger(e.at)&&e.at>=5&&e.at<=120&&
   Number.isInteger(e.amount)&&e.amount>=2&&e.amount<=45&&elapsed>=e.at&&!used.has(e.id));
 }
 // A chave usa ID do projeto, nao o titulo, para separar jogos homonimos.
 function checkpointKey(spec){
  if(!spec||!/^gf-[0-9a-f]{8}-[0-9a-f]{8}$/.test(String(spec.projectId||''))||
   !['arena','fps','rpg'].includes(spec.genre)||spec.dimension!=='3d'||spec.combatEconomy?.enabled)
   return null;
  return 'gameforge-campaign-v1:'+spec.genre+':'+spec.projectId;
 }
 function readCheckpoint(raw,spec){
  if(!checkpointKey(spec)||typeof raw!=='string'||raw.length>1200)return null;
  let data;try{data=JSON.parse(raw);}catch{return null;}
  if(!data||data.version!==1||data.projectId!==spec.projectId||!Number.isInteger(data.stage)||
   data.stage<1||data.stage>=spec.stages?.length)return null;
  const bounded=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
  if(!bounded(data.health,1,100)||!bounded(data.score,0,1e9)||!bounded(data.ammo,0,999)||
   !bounded(data.clock,0,1e7)||!Number.isInteger(data.rpgLevel)||!bounded(data.rpgLevel,1,30)||
   !Number.isInteger(data.rpgXP)||!bounded(data.rpgXP,0,2000)||
   !Number.isInteger(data.rpgPotions)||!bounded(data.rpgPotions,0,9))return null;
  return {version:1,projectId:data.projectId,stage:data.stage,health:data.health,
   score:data.score,ammo:data.ammo,clock:data.clock,rpgLevel:data.rpgLevel,
   rpgXP:data.rpgXP,rpgPotions:data.rpgPotions};
 }
 function checkpointPayload(spec,progress){
  if(!checkpointKey(spec))return null;
  return readCheckpoint(JSON.stringify({version:1,projectId:spec.projectId,...progress}),spec);
 }
 return {clamp,rng,moveCircle,crowdDirection,platformRoute,raceProgress,trackRibbon,goalReady,missionReady,
  enemyProfile,dueStageEvents,checkpointKey,readCheckpoint,checkpointPayload};
}
if(typeof module!=='undefined')module.exports=gameForgeWorldRules;
if(typeof globalThis!=='undefined')globalThis.gameForgeWorldRules=gameForgeWorldRules;
