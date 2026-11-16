/* URB-01+ : missões por eventos e objetivos explícitos do Action Model.
 * Renderização offline Three.js; sem chamadas de rede ou código gerado por eval.
 */
(function(root){
'use strict';
function gameForgeUrbanMissionBoot(){
 'use strict';
 const spec=GAME_SPEC,plan=spec.urbanMissions,T=THREE,R=GameForgeUrbanRules,F=GameForgeUrbanMissionFlow,I=GameForgeUrbanInput,S=GameForgeUrbanSave;
 const $=id=>document.getElementById(id),canvas=$('game');
 const blockers=[
  {x:-10,z:-8,w:5,d:6},{x:10,z:-8,w:5,d:6},
  {x:-10,z:9,w:5,d:5},{x:10,z:9,w:5,d:5},
  {x:-10,z:0,w:5,d:3},{x:10,z:0,w:5,d:3}
 ];
 const warehouse={x:-6.7,z:-7.4},keys=new Set(),touch={up:false,down:false,left:false,right:false,fire:false};
 const padControl=I.create(),touchOwners=new Map();
 let padState=I.neutral();
 function clearTouches(){touchOwners.clear();for(const name of Object.keys(touch))touch[name]=false;}
 const storageKey='gameforge-urban-missions-v2-'+String(spec.title||'jogo').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').slice(0,45);
 const saveStore=S.create(()=>window.localStorage,storageKey,raw=>F.restore(plan,raw));
 let renderer=null;
 try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'default'});}
 catch(_){if(typeof gameForgeSoftwareRenderer==='function')try{renderer=gameForgeSoftwareRenderer(T,canvas);}catch(_){}}
 if(!renderer){$('overlay-title').textContent='Gráficos 3D indisponíveis';$('start').disabled=true;return;}
 renderer.setClearColor(0x94b3c3);
 const scene=new T.Scene();scene.background=new T.Color(0x94b3c3);scene.fog=new T.Fog(0x94b3c3,23,75);
 const camera=new T.PerspectiveCamera(66,16/9,.1,85);
 scene.add(new T.HemisphereLight(0xe3f1ff,0x414448,2.2));
 const sun=new T.DirectionalLight(0xffe4c4,1.6);sun.position.set(-8,15,6);scene.add(sun);
 const mats={};
 function material(color){return mats[color]||(mats[color]=new T.MeshLambertMaterial({color}));}
 function box(x,y,z,w,h,d,c,parent=scene){
  const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material(c));mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 }
 function orb(x,y,z,r,c,parent=scene){
  const mesh=new T.Mesh(new T.SphereGeometry(r,9,7),material(c));mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 }
 box(0,-.25,0,36,.46,36,0x62796c);
 box(0,-.02,0,7,.06,36,0x404c5b);
 box(0,0,0,36,.06,6,0x404c5b);
 for(let z=-16;z<=16;z+=4)box(0,.035,z,.13,.01,1.65,0xe7d49b);
 for(let x=-16;x<=16;x+=4)box(x,.04,0,1.6,.01,.12,0xe7d49b);
 const colors=[0x7d8277,0x8e7060,0x666f88,0x9d805b,0x6c8a83,0x756b6c];
 blockers.forEach((p,i)=>{
  box(p.x,2.25,p.z,p.w,4.5,p.d,colors[i]);
  box(p.x,4.53,p.z,p.w+.3,.25,p.d+.3,0x33404a);
  for(let j=-1;j<=1;j++){
   const side=p.x<0?p.x+p.w/2+.008:p.x-p.w/2-.008;
   box(side,2.6,p.z+j*p.d*.25,.02,.68,.55,0x8abac7);
  }
 });
 const door=box(-7.5,1.12,warehouse.z,.08,2.28,1.42,0x715342);
 box(-7.44,2.54,warehouse.z,.13,.36,2.1,0xc5aa70);
 // Carros estáticos: decoração, não simulação de veículos.
 box(4.9,.42,-5.6,1.65,.54,3.1,0x577e92);
 box(4.9,.95,-5.7,1.38,.52,1.45,0x2e4757);
 function actor(shirt){
  const g=new T.Group(),legs=[];
  box(0,1.37,0,.72,.94,.42,shirt,g);orb(0,2.09,0,.29,0xccac8f,g);
  for(const x of [-.23,.23])legs.push(box(x,.53,0,.25,.88,.29,0x333840,g));
  for(const x of [-.52,.52])legs.push(box(x,1.37,-.04,.23,.77,.29,shirt,g));
  g.userData.legs=legs;scene.add(g);return g;
 }
 const hero=actor(0x3e5966);
 const guardGroup=new T.Group(),itemGroup=new T.Group();scene.add(guardGroup);scene.add(itemGroup);
 const marker=new T.Mesh(new T.ConeGeometry(.4,.9,6),material(0xffd36b));scene.add(marker);
 let sim=F.initial(plan),gameState='menu',paused=false,frames=0,simSteps=0,clock=0,walk=0;
 let heading=0,prev=0,acc=0,attackCooldown=0,invuln=0,fireCooldown=0,reloading=0,saveTimer=0,shotNoise=0;
 let guards=[],items=[],lastStepId=null,saveStatus='novo',saveEnabled=true,cameraOccluded=false;
 function save(){
  sim.position={x:sim.position.x,z:sim.position.z};
  const ok=saveStore.write(sim);
  saveStatus=ok?'salvo':'indisponível';saveEnabled=ok;
 }
 function restore(){
  const loaded=saveStore.read();
  if(loaded){sim=loaded;saveStatus='recuperado';}
 }
 restore();
 function clearObjects(group){while(group.children.length)group.remove(group.children[0]);}
 function syncObjects(){
  const active=F.nextStep(plan,sim);
  const stepId=active?.id||null;
  if(stepId===lastStepId)return;
  lastStepId=stepId;guards=[];items=[];clearObjects(guardGroup);clearObjects(itemGroup);
  if(!active)return;
  const done=sim.counts[active.id]||0;
  if(active.action==='eliminate'){
   for(let i=done;i<active.quantity;i++){
    const mesh=actor(0x9d564a);scene.remove(mesh);guardGroup.add(mesh);
    mesh.position.set(active.quantity===1?0:(i-(active.quantity-1)/2)*1.0,0,1.5-i*.7);
    guards.push({mesh,hp:75,id:i,alive:true,brain:{x:mesh.position.x,z:mesh.position.z,homeX:mesh.position.x,homeZ:mesh.position.z,mode:'patrol'}});
   }
  }
  if(active.action==='collect'){
   for(let i=done;i<active.quantity;i++){
    const mesh=box(0,.38,6-i*2,.67,.64,.62,0xe9bd62,itemGroup);
    const label=box(0,.7,6-i*2,.5,.06,.4,0x42566d,itemGroup);
    items.push({mesh,label,id:i,z:6-i*2,collected:false});
   }
  }
 }
 function missionTitle(){return plan[sim.stage]?.title||'Missão urbana';}
 function statusText(){
  const p=F.progress(plan,sim),s=p.step;
  if(!s)return sim.status==='victory'?'Campanha de demonstração concluída!':'Missão concluída.';
  const count=p.steps.find(row=>row.id===s.id)?.done||0;
  if(s.action==='eliminate')return missionTitle()+': derrotar guardas ('+count+'/'+s.quantity+')';
  if(s.action==='collect')return missionTitle()+': recolher provas ('+count+'/'+s.quantity+')';
  if(s.action==='deliver')return missionTitle()+': entregar provas no armazém (E)';
  if(s.action==='capture')return missionTitle()+': capturar armazém (E)';
  return missionTitle();
 }
 function hud(){
  $('health').textContent=Math.round(sim.health);
  $('score').textContent='$'+Math.round(sim.cash);
  $('ammo').textContent=sim.ammo+'/'+sim.reserve;
  $('level').textContent=(sim.stage+1)+'/'+plan.length;
  $('timer').textContent=Math.floor(clock)+'s';
  $('mission').textContent=statusText();
  $('control-help').textContent='WASD/setas mover · ESPAÇO atirar · E interagir · Controle: analógicos mover/mirar, RT tiro, A usar, X recarga, Menu pausa';
  const act=F.nextStep(plan,sim);
  marker.visible=!!act&&['capture','deliver'].includes(act.action);
  marker.position.set(warehouse.x,3.45+Math.sin(clock*2)*.2,warehouse.z);
  door.material=material(sim.status==='victory'?0x66b99d:0x715342);
 }
 function notice(message){$('message').textContent=message;}
 function finishIfNeeded(result){
  sim=result.state;
  if(result.complete){
   gameState=sim.status;keys.clear();paused=false;
   $('overlay-title').textContent=sim.status==='victory'?'Campanha curta concluída!':missionTitle()+' concluída!';
   $('overlay-sub').textContent=sim.status==='victory'?
    'Todas as missões suportadas foram concluídas. Este ainda é um protótipo urbano, não um mundo aberto completo.':
    'Recompensa concedida uma vez. Continue para a próxima missão.';
   $('start').textContent=sim.status==='victory'?'Reiniciar campanha':'Próxima missão';
   $('overlay').classList.remove('hidden');
  }
  if(result.accepted)save();
  lastStepId=null;syncObjects();hud();
 }
 function signal(event){
  const result=F.signal(plan,sim,event);
  if(result.accepted)finishIfNeeded(result);
  return result.accepted;
 }
 function reset(newGame=false){
  if(newGame){
   sim=F.initial(plan);
   saveStore.remove();
  }else if(sim.status==='intermission')sim=F.advance(plan,sim).state;
  else if(sim.status==='victory')sim=F.initial(plan);
  gameState='play';paused=false;clock=0;prev=0;acc=0;keys.clear();clearTouches();
  attackCooldown=0;invuln=0;fireCooldown=0;reloading=0;shotNoise=0;
  lastStepId=null;
  hero.position.set(sim.position.x,0,sim.position.z);
  syncObjects();hud();
  $('pause').textContent='Pausar';$('start').textContent='Continuar';
  $('overlay').classList.add('hidden');canvas.focus?.();save();
 }
 function resize(){
  const w=Math.max(320,Math.min(1200,canvas.clientWidth||960)),h=Math.max(180,Math.round(w*9/16));
  renderer.setPixelRatio?.(Math.min(1.4,window.devicePixelRatio||1));
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
 }
 resize();window.addEventListener('resize',resize);
 $('start').addEventListener('click',()=>reset(false));
 $('restart').addEventListener('click',()=>reset(true));
 $('pause').addEventListener('click',()=>{
  if(gameState!=='play')return;
  paused=!paused;keys.clear();clearTouches();acc=0;prev=0;
  $('pause').textContent=paused?'Continuar':'Pausar';notice(paused?'Pausado':'Retomado');save();
 });
 function interact(){
  if(gameState!=='play'||paused)return;
  const dist=Math.hypot(sim.position.x-warehouse.x,sim.position.z-warehouse.z);
  if(dist>2.3){notice('Aproxime-se da porta do armazém.');return;}
  if(signal({type:'interact',target:'warehouse'}))notice('Objetivo completado!');
  else notice('Ainda existem objetivos necessários antes da entrega/captura.');
 }
 function fire(){
  if(gameState!=='play'||paused||fireCooldown>0||reloading>0)return;
  if(sim.ammo<=0){notice('Munição esgotada: pressione R.');return;}
  fireCooldown=.23;sim.ammo--;shotNoise=1.1;
  const p={x:sim.position.x,z:sim.position.z,heading};
  const targets=guards.filter(g=>g.alive&&R.canHit(p,g.mesh.position,blockers));
  targets.sort((a,b)=>Math.hypot(a.mesh.position.x-p.x,a.mesh.position.z-p.z)-
   Math.hypot(b.mesh.position.x-p.x,b.mesh.position.z-p.z));
  const target=targets[0];
  if(target){
   target.hp=Math.max(0,target.hp-25);
   if(target.hp===0){target.alive=false;target.mesh.visible=false;
    signal({type:'kill',target:'guard'});notice('Inimigo neutralizado.');}
   else notice('Guarda atingido.');
  }else notice('Tiro sem alvo na mira.');
  save();
 }
 function reload(){
  if(gameState!=='play'||paused||sim.ammo===12||sim.reserve<=0||reloading>0)return;
  reloading=.85;notice('Recarregando...');
 }
 $('overlay-sub').textContent=plan.length+' missão(ões) compilada(s) do GDD. Objetivos mudam conforme ações, contagens e condições.';
 const keysAllowed=new Set(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','e','r','p','escape']);
 window.addEventListener('keydown',ev=>{
  const tag=ev.target?.tagName?.toLowerCase();if(tag==='textarea'||tag==='input')return;
  const k=String(ev.key).toLowerCase();if(keysAllowed.has(k))ev.preventDefault?.();
  if(k==='p'||k==='escape'){if(!ev.repeat)$('pause').click();return;}
  if(k==='e'&&!ev.repeat)interact();
  if(k==='r'&&!ev.repeat)reload();
  if(k===' '&&!ev.repeat)fire();
  keys.add(k);
 });
 window.addEventListener('keyup',ev=>keys.delete(String(ev.key).toLowerCase()));
 window.addEventListener('blur',()=>{keys.clear();clearTouches();padControl.clear();padState=I.neutral();if(gameState==='play'&&!paused)$('pause').click();});
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){keys.clear();clearTouches();padControl.clear();padState=I.neutral();if(gameState==='play'&&!paused)$('pause').click();}
 });
 for(const el of document.querySelectorAll('[data-control]')){
  const name=el.getAttribute('data-control');
  const release=event=>{
   if(touchOwners.get(el)!==event.pointerId)return;
   touchOwners.delete(el);if(name in touch)touch[name]=false;
  };
  el.addEventListener('pointerdown',ev=>{
   if(touchOwners.has(el))return;
   ev.preventDefault?.();touchOwners.set(el,ev.pointerId);
   try{el.setPointerCapture?.(ev.pointerId);}catch(_){}
   if(name==='fire'){
    const a=F.nextStep(plan,sim);
    const near=a&&['deliver','capture'].includes(a.action)&&Math.hypot(sim.position.x-warehouse.x,sim.position.z-warehouse.z)<2.3;
    if(near)interact();else{touch.fire=true;fire();}
   }else if(name in touch)touch[name]=true;
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,release);
 }
 function controllerFrame(){
  let pads=[];
  try{if(typeof navigator!=='undefined'&&typeof navigator.getGamepads==='function')pads=navigator.getGamepads()||[];}catch(_){}
  padState=padControl.poll(pads);
  if(!padState.connected)return;
  if(gameState!=='play'){if(padState.begin)$('start').click();return;}
  if(padState.pause||(paused&&padState.begin)){$('pause').click();return;}
  if(!paused){
   if(padState.interact)interact();
   if(padState.reload)reload();
  }
 }
 function simulate(dt){
  clock+=dt;fireCooldown=Math.max(0,fireCooldown-dt);attackCooldown=Math.max(0,attackCooldown-dt);
  shotNoise=Math.max(0,shotNoise-dt);
  invuln=Math.max(0,invuln-dt);
  if(reloading>0){
   reloading=Math.max(0,reloading-dt);
   if(reloading===0){const amount=Math.min(12-sim.ammo,sim.reserve);sim.ammo+=amount;sim.reserve-=amount;save();}
  }
  let dx=0,dz=0;
  if(keys.has('w')||keys.has('arrowup')||touch.up)dz--;
  if(keys.has('s')||keys.has('arrowdown')||touch.down)dz++;
  if(keys.has('a')||keys.has('arrowleft')||touch.left)dx--;
  if(keys.has('d')||keys.has('arrowright')||touch.right)dx++;
  dx+=padState.moveX;dz+=padState.moveZ;
  const len=Math.hypot(dx,dz);
  if(len){
   dx/=len;dz/=len;heading=Math.atan2(dx,-dz);
   sim.position=R.move(sim.position,dx*dt*5,dz*dt*5,blockers,17,.4);
   hero.rotation.y=-heading;walk+=dt*11;
  }
  if(Math.hypot(padState.aimX,padState.aimZ)>.28)
   heading=Math.atan2(padState.aimX,-padState.aimZ);
  hero.rotation.y=-heading;
  if((keys.has(' ')||touch.fire||padState.fire)&&fireCooldown===0)fire();
  hero.position.set(sim.position.x,0,sim.position.z);
  const stride=len?Math.sin(walk)*.38:0;
  hero.userData.legs[0].rotation.x=stride;hero.userData.legs[1].rotation.x=-stride;
  hero.userData.legs[2].rotation.x=-stride*.6;hero.userData.legs[3].rotation.x=stride*.6;
  const active=F.nextStep(plan,sim);
  if(active?.action==='collect'){
   for(const item of items){
    if(item.collected)continue;
    if(Math.hypot(sim.position.x-item.mesh.position.x,sim.position.z-item.z)<1.12){
     item.collected=true;item.mesh.visible=false;item.label.visible=false;
     const accepted=signal({type:'pickup',target:'evidence'});
     if(accepted)notice('Prova recolhida.');
     break;
    }
   }
  }
  for(const g of guards){
   if(!g.alive)continue;
   g.brain=R.guardStep(g.brain,{...sim.position,noise:len>0||shotNoise>0},dt,blockers);
   g.mesh.position.x=g.brain.x;g.mesh.position.z=g.brain.z;
   g.mesh.rotation.y=-g.brain.heading;
   if(g.brain.canAttack&&attackCooldown===0&&invuln===0){
    sim.health=Math.max(1,sim.health-8);attackCooldown=1.4;invuln=.5;save();
    notice('Guarda atacou! '+sim.health+' de vida.');
   }
  }
  saveTimer+=dt;
  if(len&&saveTimer>1.7){saveTimer=0;save();}
  hud();
 }
 let simAccumulator=0,framePrev=0;
 function frame(now){
  requestAnimationFrame(frame);frames++;controllerFrame();
  const delta=Math.max(0,(now-(framePrev||now))/1000);framePrev=now;
  if(gameState==='play'&&!paused){
   simAccumulator+=Math.min(.25,delta);
   let steps=0;
   while(simAccumulator+1e-10>=1/60&&steps<5&&gameState==='play'&&!paused){
    simulate(1/60);simSteps++;simAccumulator-=1/60;steps++;
   }
   if(steps===5&&simAccumulator>=1/60)simAccumulator=0;
  }else simAccumulator=0;
  const eye={x:sim.position.x,y:1.45,z:sim.position.z};
  const desired=R.cameraPosition(eye,{x:sim.position.x+2.6,y:4.6,z:sim.position.z+6.5},blockers);
  camera.position.lerp(new T.Vector3(desired.x,desired.y,desired.z),.16);
  const safe=R.cameraPosition(eye,camera.position,blockers);
  camera.position.set(safe.x,safe.y,safe.z);
  cameraOccluded=desired.occluded||safe.occluded;
  camera.lookAt(sim.position.x,1.2,sim.position.z-2.5);
  renderer.render(scene,camera);
 }
 hero.position.set(sim.position.x,0,sim.position.z);syncObjects();hud();
 $('mission').textContent=statusText();notice('Missões compiladas do GDD. WASD, Espaço, E, R, P.');
 const firstCamera=R.cameraPosition({x:sim.position.x,y:1.45,z:sim.position.z},
  {x:sim.position.x+2.6,y:4.6,z:sim.position.z+6.5},blockers);
 camera.position.set(firstCamera.x,firstCamera.y,firstCamera.z);
 window.__gameforgeTelemetry=()=>({
  dimension:'3d',genre:'urban-action',camera:'third-person',state:gameState,paused,frames,
  simulationHz:60,simulationSteps:simSteps,stage:sim.stage+1,stages:plan.length,clock,
  health:sim.health,score:sim.cash,ammo:sim.ammo,reserve:sim.reserve,
  player:{x:sim.position.x,y:0,z:sim.position.z,heading},enemies:guards.filter(g=>g.alive).length,
  gamepadConnected:padState.connected,guardModes:guards.filter(g=>g.alive).map(g=>g.brain.mode),
  guardWaypoints:guards.filter(g=>g.alive).map(g=>g.brain.navRoute?.length||0),
  mission:{complete:gameState==='victory',step:F.nextStep(plan,sim)?.action||null,
   progress:F.progress(plan,sim).steps,stage:sim.stage+1,rewards:[...sim.rewards]},
  cameraOccluded,saveEnabled,saveStatus,saveKey:storageKey,prototype:true
 });
 requestAnimationFrame(frame);
}
root.gameForgeUrbanMissionBoot=gameForgeUrbanMissionBoot;
if(typeof module!=='undefined')module.exports=gameForgeUrbanMissionBoot;
})(typeof globalThis!=='undefined'?globalThis:this);
