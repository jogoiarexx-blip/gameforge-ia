/* Pure shared world rules. This factory is serialized into exported offline games. */
function gameForgeWorldRules(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
 // GF-TRAIN-24: segmento contra AABB com margem, sem depender de WebGL.
 function cameraClip(eye,target,solids=[],radius=.24){
  let fraction=1;
  for(const o of solids){
   if(![o?.x,o?.z,o?.w,o?.d].every(Number.isFinite)||o.w<=0||o.d<=0)continue;
   const lowY=Number.isFinite(o.minY)?o.minY:0,highY=Number.isFinite(o.h)?o.h:4.7;
   const box=[[o.x-o.w/2-radius,o.x+o.w/2+radius],[lowY-radius,highY+radius],[o.z-o.d/2-radius,o.z+o.d/2+radius]];
   let enter=0,exit=1,hit=true;
   for(const [i,k] of ['x','y','z'].entries()){
    const d=target[k]-eye[k], [lo,hi]=box[i];
    if(Math.abs(d)<1e-9){if(eye[k]<lo||eye[k]>hi){hit=false;break;}continue;}
    const a=(lo-eye[k])/d,b=(hi-eye[k])/d;
    enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
    if(enter>exit){hit=false;break;}
   }
   if(hit&&exit>=0&&enter<=1)fraction=Math.min(fraction,Math.max(0,enter-.01));
  }
  return {x:eye.x+(target.x-eye.x)*fraction,y:eye.y+(target.y-eye.y)*fraction,
   z:eye.z+(target.z-eye.z)*fraction,occluded:fraction<1};
 }
 function cameraBlend(eye,wanted,current,solids,dt,snap=false){
  const safe=cameraClip(eye,wanted,solids);
  const alpha=snap?1:1-Math.exp(-7*clamp(Number(dt)||0,0,.1));
  const candidate=safe.occluded?safe:{x:current.x+(safe.x-current.x)*alpha,
   y:current.y+(safe.y-current.y)*alpha,z:current.z+(safe.z-current.z)*alpha};
  const final=cameraClip(eye,candidate,solids);
  return {...final,occluded:safe.occluded||final.occluded};
 }
 function cameraTargets(genre,p,mode=0,zoom=1){
  const x=p.x,y=p.y||0,z=p.z,yaw=p.yaw||0,sin=Math.sin(yaw),cos=Math.cos(yaw);
  const scale=clamp(Number(zoom)||1,.7,1.35),speed=clamp(Math.abs(p.speed||0),0,25);
  if(genre==='racing'){
   const distance=(mode===1?5:8+speed*.10)*scale;
   return {eye:{x,y:y+1,z},wanted:{x:x-sin*distance,y:y+(mode===1?3.6:7)*scale,z:z-cos*distance},
    focus:{x:x+sin*4,y:y+1,z:z+cos*4},fov:52+speed*.48};
  }
  if(mode===1){
   return {eye:{x,y:y+1.5,z},wanted:{x:x-sin*5*scale+cos*1.35,y:y+3.2*scale,z:z-cos*5*scale-sin*1.35},
    focus:{x:x+sin*2,y:y+1.25,z:z+cos*2},fov:62};
  }
  return {eye:{x,y:y+1.5,z},wanted:{x,y:y+15*scale,z:z+13*scale},
   focus:{x,y:y+.7,z:z-1.8},fov:52};
 }
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
 // GF-008: zonas sem scripts injetados pelo GDD e com coordenadas proporcionais.
 const ZONES={north:[0,-.28],south:[0,.28],east:[.28,0],west:[-.28,0],center:[0,0]};
 function waypoint(zone,size){
  const vector=ZONES[zone];
  if(!vector)return null;
  const range=clamp(Number(size)||48,32,88);
  return {x:vector[0]*range,z:vector[1]*range};
 }
 function enteredZone(zone,player,size){
  const point=waypoint(zone,size);
  return !!point&&!!player&&Number.isFinite(player.x)&&Number.isFinite(player.z)&&
   Math.hypot(player.x-point.x,player.z-point.z)<=2.5;
 }
 function missionStepReady(step,state){
  if(!step||!state)return false;
  if(step.kind==='reach')return enteredZone(step.zone,state.player,state.size);
  if(step.kind==='eliminate')return state.enemies===0&&!state.pendingReinforcements;
  if(step.kind==='collect')return state.collected>=state.required;
  if(step.kind==='survive')return Number.isFinite(state.elapsedInStep)&&
   state.elapsedInStep>=clamp(Number(step.seconds)||30,5,180);
  return false;
 }
 function dueZoneEvents(events,player,size,fired){
  if(!Array.isArray(events)||events.length>8)return [];
  const used=new Set(Array.isArray(fired)?fired:[]);
  return events.filter(e=>e&&['reinforcements','heal'].includes(e.type)&&
   typeof e.zone==='string'&&Object.prototype.hasOwnProperty.call(ZONES,e.zone)&&
   e.id==='zone-'+e.type+'-'+e.zone&&Number.isInteger(e.amount)&&
   e.amount>=2&&e.amount<=45&&!used.has(e.id)&&enteredZone(e.zone,player,size));
 }
 // GF-009: quest declarativa, sem execucao de texto arbitrario e com limite de recompensa.
 // GF-010 NPC choices: two verified outcomes, optional bounded patrol.
 function npcQuestContract(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!/^npc-stage-(0[1-9]|[1-2]\d|30)$/.test(String(raw.id||''))||
   typeof raw.name!=='string'||raw.name.length<1||raw.name.length>40||/[<>]/.test(raw.name)||
   typeof raw.dialogue!=='string'||raw.dialogue.length>160||/[<>]/.test(raw.dialogue)||
   !Object.prototype.hasOwnProperty.call(ZONES,raw.zone)||
   !Array.isArray(raw.steps)||raw.steps.length<2||raw.steps.length>5||
   !raw.reward||typeof raw.reward!=='object'||(raw.walk!==undefined&&typeof raw.walk!=='boolean')||
   (raw.sideQuest!==undefined&&typeof raw.sideQuest!=='boolean'))
   return null;
  function checkSteps(input){
   if(!Array.isArray(input)||input.length<2||input.length>5)return null;
   const steps=[];
   for(let i=0;i<input.length;i++){
    const step=input[i];
    if(!step||step.id!=='step-'+(i+1)||!['reach','eliminate','collect','survive'].includes(step.kind)||
     typeof step.label!=='string'||step.label.length>90||/[<>]/.test(step.label))return null;
    if(step.kind==='reach'){
     if(!Object.prototype.hasOwnProperty.call(ZONES,step.zone))return null;
     steps.push({id:step.id,kind:step.kind,zone:step.zone,label:step.label});
    }else if(step.kind==='survive'){
     if(!Number.isInteger(step.seconds)||step.seconds<5||step.seconds>180)return null;
     steps.push({id:step.id,kind:step.kind,seconds:step.seconds,label:step.label});
    }else steps.push({id:step.id,kind:step.kind,label:step.label});
   }
   return steps;
  }
  function checkReward(reward){
   if(!reward||!Number.isInteger(reward.score)||reward.score<0||reward.score>500||
    !Number.isInteger(reward.health)||reward.health<0||reward.health>45||
    !Number.isInteger(reward.ammo)||reward.ammo<0||reward.ammo>80)return null;
   return {score:reward.score,health:reward.health,ammo:reward.ammo};
  }
  const steps=checkSteps(raw.steps),reward=checkReward(raw.reward);
  if(!steps||!reward)return null;
  let choices;
  if(raw.choices!==undefined){
   if(!Array.isArray(raw.choices)||raw.choices.length!==2)return null;
   choices=[];
   for(let i=0;i<2;i++){
    const value=raw.choices[i];
    if(!value||value.id!=='choice-'+(i+1)||typeof value.label!=='string'||
     !value.label.trim()||value.label.length>56||/[<>]/.test(value.label))return null;
    if(value.effect!==undefined&&!['aid','threat'].includes(value.effect))return null;
    const choiceSteps=checkSteps(value.steps),choiceReward=checkReward(value.reward);
    if(!choiceSteps||!choiceReward)return null;
    choices.push({id:value.id,label:value.label,steps:choiceSteps,reward:choiceReward,
     ...(value.effect?{effect:value.effect}:{})});
   }
  }
  let routine;
  if(raw.routine!==undefined){
   if(!raw.routine||typeof raw.routine!=='object'||Array.isArray(raw.routine)||!['morning','afternoon','night'].every(k=>
    typeof raw.routine[k]==='string'&&Object.prototype.hasOwnProperty.call(ZONES,raw.routine[k])))return null;
   routine={morning:raw.routine.morning,afternoon:raw.routine.afternoon,night:raw.routine.night};
  }
  return {id:raw.id,name:raw.name,zone:raw.zone,dialogue:raw.dialogue,steps,reward,
   ...(raw.walk===true?{walk:true}:{}),...(choices?{choices}:{}),
   ...(raw.sideQuest===true?{sideQuest:true}:{}),...(routine?{routine}:{})};
 }
 function npcPatrolPosition(quest,elapsed,size){
  const npc=npcQuestContract(quest),base=npc&&waypoint(npc.zone,size);
  if(!base)return null;
  const home={x:base.x+1.6,z:base.z};
  if(!npc.walk||!Number.isFinite(elapsed))return home;
  const radius=clamp(Number(size)||48,32,88)/2-2;
  return {x:clamp(home.x+Math.sin(elapsed*.75)*.8,-radius,radius),
   z:clamp(home.z+(1-Math.cos(elapsed*.75))*.34,-radius,radius)};
 }
 // Um dia simulado dura 90 segundos: manhã/tarde/noite, 30s cada.
 function npcDailyPeriod(elapsed){
  if(!Number.isFinite(elapsed)||elapsed<0)return 'morning';
  return ['morning','afternoon','night'][Math.floor((elapsed%90)/30)];
 }
 function npcRoutineTarget(quest,elapsed,size){
  const npc=npcQuestContract(quest);
  if(!npc)return null;
  if(!npc.routine)return npcPatrolPosition(npc,elapsed,size);
  const target=waypoint(npc.routine[npcDailyPeriod(elapsed)],size);
  return target?{x:target.x+1.6,z:target.z}:null;
 }
 function npcMissionEffect(quest,choiceId,sourceStage){
  const npc=npcQuestContract(quest);
  if(!npc?.choices||!Number.isInteger(sourceStage)||sourceStage<0||sourceStage>=29)return null;
  const choice=npc.choices.find(c=>c.id===choiceId);
  return choice?.effect?{sourceStage,choiceId,kind:choice.effect}:null;
 }
 function npcNear(quest,player,size,radius=2.6,position){
  if(!npcQuestContract(quest))return false;
  const p=position&&Number.isFinite(position.x)&&Number.isFinite(position.z)
   ?position:npcPatrolPosition(quest,0,size);
  return !!p&&player&&Number.isFinite(player.x)&&Number.isFinite(player.z)&&
   Math.hypot(player.x-p.x,player.z-p.z)<=radius;
 }
 function npcReward(quest,state,magazineMax=999,choiceId=null){
  const npc=npcQuestContract(quest);
  if(!npc||!state||!Number.isFinite(state.score)||!Number.isFinite(state.health)||!Number.isFinite(state.ammo))return null;
  let reward=npc.reward;
  if(npc.choices){
   const selected=npc.choices.find(c=>c.id===choiceId);
   if(!selected)return null;
   reward=selected.reward;
  }
  return {score:clamp(state.score+reward.score,0,1e9),
   health:clamp(state.health+reward.health,0,100),
   ammo:clamp(state.ammo+reward.ammo,0,clamp(magazineMax,20,999))};
 }
 // A chave usa ID do projeto, nao o titulo, para separar jogos homonimos.
 function checkpointKey(spec){
  if(!spec||!/^gf-[0-9a-f]{8}-[0-9a-f]{8}$/.test(String(spec.projectId||''))||
   !['arena','fps','rpg'].includes(spec.genre)||spec.dimension!=='3d'||spec.combatEconomy?.enabled)
   return null;
  return 'gameforge-campaign-v1:'+spec.genre+':'+spec.projectId;
 }
 // GF-TRAIN-26: atos contíguos e histórico de decisões concluídas, não de diálogos.
 function campaignPlan(spec){
  const c=spec?.campaignNarrative;
  if(!checkpointKey(spec)||!c||c.version!==1||!Array.isArray(spec.stages)||
   spec.stages.length<2||spec.stages.length>30||!Array.isArray(c.acts)||
   c.acts.length<1||c.acts.length>10||typeof c.alternateEndings!=='boolean')return null;
  let next=0;const acts=[];
  for(const act of c.acts){
   if(!act||act.start!==next||!Number.isInteger(act.end)||act.end<next||act.end>=spec.stages.length||
    typeof act.title!=='string'||!act.title.trim()||act.title.length>80||/[<>]/.test(act.title))return null;
   acts.push({title:act.title,start:act.start,end:act.end});next=act.end+1;
  }
  if(next!==spec.stages.length)return null;
  return {version:1,acts,alternateEndings:c.alternateEndings};
 }
 function campaignHistory(spec,raw,completed){
  const plan=campaignPlan(spec);
  if(!plan)return raw===undefined||raw===null?[]:null;
  if(!Number.isInteger(completed)||completed<0||completed>spec.stages.length||
   !Array.isArray(raw)||raw.length!==completed)return null;
  const history=[];
  for(let i=0;i<completed;i++){
   const entry=raw[i],npc=npcQuestContract(spec.stageConfig?.[i]?.npcQuest);
   if(!entry||entry.stage!==i||!(entry.choice===null||npc?.choices?.some(c=>c.id===entry.choice)))return null;
   if(npc?.choices&&!npc.sideQuest&&entry.choice===null)return null;
   history.push({stage:i,choice:entry.choice});
  }
  return history;
 }
 function campaignCommit(spec,history,stage,choice){
  if(!campaignHistory(spec,history,stage)||!campaignPlan(spec))return null;
  return campaignHistory(spec,[...history,{stage,choice}],stage+1);
 }
 function campaignEnding(spec,history){
  const plan=campaignPlan(spec),validated=campaignHistory(spec,history,spec.stages?.length);
  if(!plan||!validated)return null;
  let aid=0,threat=0,decisions=0;
  for(const entry of validated){
   if(entry.choice)decisions++;
   const npc=npcQuestContract(spec.stageConfig?.[entry.stage]?.npcQuest);
   const effect=npc?.choices?.find(c=>c.id===entry.choice)?.effect;
   if(effect==='aid')aid++;if(effect==='threat')threat++;
  }
  const id=!plan.alternateEndings?'standard':aid>threat?'alliance':threat>aid?'conflict':'neutral';
  const endings={standard:['Jornada concluída','A campanha chegou ao fim.'],
   alliance:['Final — Aliança','As alianças construídas abriram caminho para a reconstrução.'],
   conflict:['Final — Conflito','A vitória teve um custo: as hostilidades continuam.'],
   neutral:['Final — Equilíbrio','A jornada terminou, mas o futuro permanece em aberto.']};
  return {id,title:endings[id][0],epilogue:endings[id][1],aid,threat,decisions,completed:validated.length};
 }
 function campaignSaveFields(spec,data){
  const plan=campaignPlan(spec);
  if(!plan)return data.history===undefined?{}:null;
  if(data.campaignFingerprint!==midStageFingerprint(spec))return null;
  const history=campaignHistory(spec,data.history,data.stage);
  if(!history)return null;
  return {history,campaignFingerprint:data.campaignFingerprint};
 }
 function readCheckpoint(raw,spec){
  if(!checkpointKey(spec)||typeof raw!=='string'||raw.length>(campaignPlan(spec)?6000:1200))return null;
  let data;try{data=JSON.parse(raw);}catch{return null;}
  if(!data||data.version!==1||data.projectId!==spec.projectId||!Number.isInteger(data.stage)||
   data.stage<1||data.stage>=spec.stages?.length)return null;
  const bounded=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
  if(!bounded(data.health,1,100)||!bounded(data.score,0,1e9)||!bounded(data.ammo,0,999)||
   !bounded(data.clock,0,1e7)||!Number.isInteger(data.rpgLevel)||!bounded(data.rpgLevel,1,30)||
   !Number.isInteger(data.rpgXP)||!bounded(data.rpgXP,0,2000)||
   !Number.isInteger(data.rpgPotions)||!bounded(data.rpgPotions,0,9))return null;
  let campaignEffect=null;
  if(data.campaignEffect!==undefined&&data.campaignEffect!==null){
   const effect=data.campaignEffect;
   if(!effect||!Number.isInteger(effect.sourceStage)||effect.sourceStage!==data.stage-1||
    !['choice-1','choice-2'].includes(effect.choiceId)||!['aid','threat'].includes(effect.kind))return null;
   const source=spec.stageConfig?.[effect.sourceStage]?.npcQuest;
   const valid=npcMissionEffect(source,effect.choiceId,effect.sourceStage);
   if(!valid||valid.kind!==effect.kind)return null;
   campaignEffect=valid;
  }
  const campaign=campaignSaveFields(spec,data);if(!campaign)return null;
  if(campaign.history){const prev=campaign.history[data.stage-1];const effect=npcMissionEffect(spec.stageConfig?.[prev?.stage]?.npcQuest,prev?.choice,prev?.stage);if((effect?.kind||null)!==(campaignEffect?.kind||null)||(effect?.choiceId||null)!==(campaignEffect?.choiceId||null))return null;}
  return {version:1,projectId:data.projectId,stage:data.stage,health:data.health,
   score:data.score,ammo:data.ammo,clock:data.clock,rpgLevel:data.rpgLevel,
   rpgXP:data.rpgXP,rpgPotions:data.rpgPotions,
   ...(campaignEffect?{campaignEffect}:{}),...campaign};
 }
 function checkpointPayload(spec,progress){
  if(!checkpointKey(spec))return null;
  return readCheckpoint(JSON.stringify({version:1,projectId:spec.projectId,...progress}),spec);
 }
 // GF-TRAIN-22: contrato declarativo de estado roteirizado, sem código injetado.
 function midStageScript(spec,stage){
  const c=spec.stageConfig?.[stage]||{},size=clamp(Number(spec.worldOptions?.size)||48,32,88);
  const npc=c.npcQuest? npcQuestContract(c.npcQuest):null;
  if((c.npcQuest&&!npc)||c.sideQuest||(Array.isArray(c.sideQuestSteps)&&c.sideQuestSteps.length))return null;
  const events=c.events??[],zones=c.zoneEvents??[],main=c.missionSteps??[];
  if(!Array.isArray(events)||events.length>2||!Array.isArray(zones)||zones.length>8||
   !Array.isArray(main)||main.length>5)return null;
  const ids=new Set();
  for(const e of [...events,...zones]){
   if(!e||ids.has(e.id))return null;ids.add(e.id);
  }
  if(events.some(e=>dueStageEvents([e],120,[]).length!==1)||
   zones.some(e=>!waypoint(e.zone,size)||dueZoneEvents([e],waypoint(e.zone,size),size,[]).length!==1))return null;
  if(main.some((s,i)=>!s||s.id!=='step-'+(i+1)||!['reach','eliminate','collect','survive'].includes(s.kind)||
   typeof s.label!=='string'||(s.kind==='reach'&&!waypoint(s.zone,size))||
   (s.kind==='survive'&&(!Number.isInteger(s.seconds)||s.seconds<5||s.seconds>180))))return null;
  return {npc,events,zones,main,required:!!(npc||events.length||zones.length||main.length)};
 }
 function midStageEligible(spec,stage){
  return !!(checkpointKey(spec)&&Number.isInteger(stage)&&stage>=0&&stage<spec.stages?.length&&
   spec.stages.length>=2&&midStageScript(spec,stage));
 }
 function midStageScriptState(v,spec,size){
  const c=midStageScript(spec,v.stage),s=v.script;
  if(!c)return null;
  if(!s)return c.required?null:{};
  if(typeof s!=='object'||Array.isArray(s)||!Array.isArray(s.fired)||s.fired.length>10||
   new Set(s.fired).size!==s.fired.length)return null;
  const all=[...c.events,...c.zones],fired=new Set(s.fired);
  if(s.fired.some(id=>!all.some(e=>e.id===id))||
   c.events.some(e=>fired.has(e.id)!==(v.stageClock>=e.at)))return null;
  const npc=c.npc, status=s.npcStatus,choice=s.choice;
  if(npc?!['idle','offered','active','completed'].includes(status):status!=='none')return null;
  const accepted=['active','completed'].includes(status);
  const chosen=npc?.choices?.find(x=>x.id===choice);
  if(npc?.choices&&accepted?!chosen:choice!==null)return null;
  const main=npc&&!npc.sideQuest?(chosen?.steps||npc.steps):c.main;
  const side=npc?.sideQuest?(chosen?.steps||npc.steps):[];
  const validIndex=(i,max)=>Number.isInteger(i)&&i>=0&&i<=max;
  const validTime=t=>typeof t==='number'&&Number.isFinite(t)&&t>=0&&t<=v.stageClock;
  if(!validIndex(s.mainIndex,main.length)||!validIndex(s.sideIndex,side.length)||
   !validTime(s.mainStarted)||!validTime(s.sideStarted))return null;
  if(npc){
   const idx=npc.sideQuest?s.sideIndex:s.mainIndex, len=npc.sideQuest?side.length:main.length;
   if(!accepted&&idx!==0||status==='active'&&idx>=len||status==='completed'&&idx!==len)return null;
   if(!s.npcPosition||!['x','z'].every(k=>typeof s.npcPosition[k]==='number'&&
    Number.isFinite(s.npcPosition[k])&&Math.abs(s.npcPosition[k])<=size*.5))return null;
  }else if(s.npcPosition!==null)return null;
  const reload=s.reloadDelay??0;
  if(typeof reload!=='number'||!Number.isFinite(reload)||reload<0||reload>1.3)return null;
  return {script:{fired:[...s.fired],npcStatus:status,choice,mainIndex:s.mainIndex,
   mainStarted:s.mainStarted,sideIndex:s.sideIndex,sideStarted:s.sideStarted,
   npcPosition:npc?{x:s.npcPosition.x,z:s.npcPosition.z}:null,reloadDelay:reload}};
 }
 function midStageKey(spec){
  if(!checkpointKey(spec)||!Array.isArray(spec.stages)||spec.stages.length<2)return null;
  return 'gameforge-midstage-v1:'+spec.genre+':'+spec.projectId;
 }
 function midStageFingerprint(spec){
  const source=JSON.stringify([spec.projectId,spec.genre,spec.stages,
   spec.stageConfig||[],spec.worldOptions||{},spec.tuning||{},spec.features||{},...(campaignPlan(spec)?[campaignPlan(spec)]:[])]);
  let value=2166136261;
  for(let i=0;i<source.length;i++){value^=source.charCodeAt(i);value=Math.imul(value,16777619)>>>0;}
  return value.toString(36);
 }
 function readMidStage(raw,spec){
  if(!midStageKey(spec)||typeof raw!=='string'||raw.length>30000)return null;
  let v;try{v=JSON.parse(raw);}catch{return null;}
  if(!v||typeof v!=='object'||Array.isArray(v)||v.version!==1||
   v.projectId!==spec.projectId||v.fingerprint!==midStageFingerprint(spec)||
   !midStageEligible(spec,v.stage))return null;
  const bounded=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
  const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
  const size=clamp(Number(spec.worldOptions?.size)||48,32,88);
  if(!bounded(v.health,1,100)||!bounded(v.score,0,1e9)||!bounded(v.ammo,0,999)||
   !bounded(v.clock,0,1e7)||!bounded(v.stageClock,.1,1e7)||
   !integer(v.rpgLevel,1,30)||!integer(v.rpgXP,0,2000)||!integer(v.rpgPotions,0,9)||
   !v.player||!bounded(v.player.x,-size*.49,size*.49)||
   !bounded(v.player.z,-size*.49,size*.49)||!bounded(v.player.yaw,-1000,1000)||
   !Array.isArray(v.enemies)||v.enemies.length>(midStageScript(spec,v.stage).required?106:32)||
   !Array.isArray(v.coinsTaken)||v.coinsTaken.length>32)return null;
  const ids=new Set(),coinIds=new Set();
  for(const e of v.enemies){
   if(!e||!integer(e.id,0,midStageScript(spec,v.stage).required?105:64)||ids.has(e.id)||
    !bounded(e.x,-size,size)||!bounded(e.z,-size,size)||!bounded(e.hp,0.01,500))return null;
   ids.add(e.id);
  }
  for(const id of v.coinsTaken){
   if(!integer(id,0,31)||coinIds.has(id))return null;coinIds.add(id);
  }
  const scripted=midStageScriptState(v,spec,size),campaign=campaignSaveFields(spec,v);if(!scripted||!campaign)return null;
  return {version:1,projectId:v.projectId,fingerprint:v.fingerprint,stage:v.stage,
   health:v.health,score:v.score,ammo:v.ammo,clock:v.clock,stageClock:v.stageClock,
   rpgLevel:v.rpgLevel,rpgXP:v.rpgXP,rpgPotions:v.rpgPotions,
   player:{x:v.player.x,z:v.player.z,yaw:v.player.yaw},
   enemies:v.enemies.map(e=>({id:e.id,x:e.x,z:e.z,hp:e.hp})),
   coinsTaken:[...v.coinsTaken],...scripted,...campaign};
 }
 function midStagePayload(spec,progress){
  if(!midStageKey(spec))return null;
  try{return readMidStage(JSON.stringify({version:1,projectId:spec.projectId,
   fingerprint:midStageFingerprint(spec),...progress}),spec);}
  catch{return null;}
 }
 return {clamp,rng,cameraClip,cameraBlend,cameraTargets,moveCircle,crowdDirection,platformRoute,raceProgress,trackRibbon,goalReady,missionReady,
  enemyProfile,dueStageEvents,waypoint,enteredZone,missionStepReady,dueZoneEvents,
  npcQuestContract,npcPatrolPosition,npcDailyPeriod,npcRoutineTarget,npcMissionEffect,
  npcNear,npcReward,campaignPlan,campaignHistory,campaignCommit,campaignEnding,checkpointKey,readCheckpoint,checkpointPayload,
  midStageKey,midStageEligible,midStageFingerprint,readMidStage,midStagePayload};
}
if(typeof module!=='undefined')module.exports=gameForgeWorldRules;
if(typeof globalThis!=='undefined')globalThis.gameForgeWorldRules=gameForgeWorldRules;
