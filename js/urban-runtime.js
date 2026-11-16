/* URB-01: bairro pequeno jogável, third-person real com Three.js local.
 * Executável standalone serializado pelo gerador. Não é o Godfather completo.
 */
(function(root){
'use strict';
function gameForgeUrban3DBoot(){
 'use strict';
 const T=THREE,R=GameForgeUrbanRules,spec=GAME_SPEC;
 const $=id=>document.getElementById(id),canvas=$('game');
 const SIM_DT=1/60, MAX_STEPS=5,keys=new Set(),touch={up:false,down:false,left:false,right:false,fire:false};
 const blockers=[
  {x:-10,z:-8,w:5,d:6},{x:10,z:-8,w:5,d:6},
  {x:-10,z:9,w:5,d:5},{x:10,z:9,w:5,d:5},
  {x:-10,z:0,w:5,d:3},{x:10,z:0,w:5,d:3}
 ];
 const door={x:-6.7,z:-7.4};
 const saveKey='gameforge-urban-v1-'+String(spec.title||'projeto').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').slice(0,54);
 let renderer=null,scene,camera,hero,guard,guardMesh,buildingDoor,beacon;
 try{
  renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'default',alpha:false});
 }catch(e){
  if(typeof gameForgeSoftwareRenderer==='function'){
   try{renderer=gameForgeSoftwareRenderer(T,canvas);}catch(_){}
  }
 }
 if(!renderer){
  $('overlay-title').textContent='WebGL não disponível';
  $('overlay-sub').textContent='Este protótipo 3D precisa de WebGL. Tente um navegador com aceleração gráfica.';
  $('start').disabled=true;
  return;
 }
 renderer.setClearColor(0x9db5bd);
 if(renderer.shadowMap)renderer.shadowMap.enabled=false;
 scene=new T.Scene();
 scene.background=new T.Color(0x9db5bd);
 scene.fog=new T.Fog(0x9db5bd,21,75);
 camera=new T.PerspectiveCamera(65,16/9,.1,90);
 scene.add(new T.HemisphereLight(0xdcecff,0x394650,2.1));
 const sunlight=new T.DirectionalLight(0xffe2ba,2.0);
 sunlight.position.set(-8,17,6);scene.add(sunlight);
 const materials={};
 const material=(color)=>materials[color]||(materials[color]=new T.MeshLambertMaterial({color}));
 function box(x,y,z,w,h,d,color,parent=scene){
  const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 }
 function sphere(x,y,z,r,color,parent=scene){
  const mesh=new T.Mesh(new T.SphereGeometry(r,9,7),material(color));
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 }
 box(0,-.24,0,36,.42,36,0x465852);
 box(0,-.07,0,7,.05,36,0x3e4750); // rua vertical
 box(0,-.045,0,36,.04,6,0x3e4750); // cruzamento
 for(let z=-16;z<=16;z+=4){
  box(-.1,-.008,z,.12,.016,1.7,0xc8c2ab);
 }
 for(let x=-16;x<=16;x+=4){
  box(x,0,-.1,1.7,.015,.12,0xc8c2ab);
 }
 for(let x of [-5.7,5.7]){
  box(x,-.02,-11,.34,.08,10,0x8e9799);
  box(x,-.02,10,.34,.08,9,0x8e9799);
 }
 const buildingColors=[0x866c5c,0x82776e,0x636a74,0x7c7564,0x8e6553,0x6c7e84];
 blockers.forEach((p,i)=>{
  box(p.x,2.15,p.z,p.w,4.3,p.d,buildingColors[i]);
  box(p.x,4.38,p.z,p.w+.45,.22,p.d+.45,0x303b45);
  for(let f=-1;f<=1;f++){
   const z=p.z+f*p.d*.27;
   const side=p.x<0?p.x+p.w/2+.011:p.x-p.w/2-.011;
   box(side,2.45,z,.03,.68,.57,0x7ea9b8);
  }
 });
 // Porta do armazém: posicionada no lado externo do prédio capturável.
 buildingDoor=box(-7.49,1.18,-7.4,.1,2.35,1.38,0x63534a);
 box(-7.42,2.62,-7.4,.1,.36,2.25,0xd6a75b);
 for(let z of [-12,-2,12]){
  for(let x of [-4.5,4.5]){
   box(x,1.45,z,.09,2.9,.09,0x57636a);
   sphere(x,2.95,z,.22,0xffd798);
  }
 }
 // Carro estático: decorativo, não dirigível nesta etapa.
 box(5, .42,-5.6,1.6,.56,3.1,0x5a7885);
 box(5, .92,-5.8,1.35,.55,1.45,0x2a3d4a);
 for(let z of [-6.55,-4.55])for(let x of [4.2,5.8])
  box(x,.22,z,.14,.44,.48,0x1a252b);
 // Marcação do objetivo e volumes de teste.
 beacon=new T.Mesh(new T.ConeGeometry(.44,.95,5),material(0xf6c35e));
 beacon.position.set(door.x,3.7,door.z);scene.add(beacon);
 function character(shirt,skin,pants){
  const g=new T.Group(),limbs=[];
  box(0,1.37,0,.84,.97,.43,shirt,g);
  box(0,2.02,0,.62,.24,.48,skin,g);
  sphere(0,2.18,0,.28,skin,g);
  for(let x of [-.25,.25]){
   const leg=box(x,.5,0,.28,.92,.31,pants,g);limbs.push(leg);
  }
  for(let x of [-.57,.57]){
   const arm=box(x,1.31,-.05,.25,.9,.29,shirt,g);limbs.push(arm);
  }
  box(.55,1.02,-.41,.21,.14,.61,0x24292e,g);
  g.userData.legs=limbs;return g;
 }
 hero=character(0x334a5e,0xd5b093,0x272e37);
 guard=character(0x824f42,0xbd927b,0x3d4345);
 scene.add(hero);scene.add(guard);
 const initial=()=>({
  x:0,z:9,heading:0,health:100,cash:1000,ammo:12,reserve:48,
  guardHp:75,guardDefeated:false,captured:false,
  missionComplete:false,rewardGranted:false
 });
 let progress=initial(),state='menu',paused=false,frames=0,simulationSteps=0;
 let last=0,acc=0,walkPhase=0,clock=0,attackCooldown=0,invulnerable=0,
     fireCooldown=0,reloadRemaining=0,saveCooldown=0,guardAttack=0,guardPhase=0;
 let saveEnabled=true,saveStatus='novo',cameraOccluded=false;
 let guardBrain={x:0,z:1.5,homeX:0,homeZ:1.5,mode:'patrol'};
 function readSave(){
  try{
   const raw=window.localStorage?.getItem(saveKey);
   if(!raw)return null;
   return R.load(JSON.parse(raw));
  }catch(_){return null;}
 }
 function save(){
  try{
   const data={version:1,...progress};
   window.localStorage?.setItem(saveKey,JSON.stringify(data));
   saveStatus='salvo';saveEnabled=true;
  }catch(_){saveStatus='indisponível';saveEnabled=false;}
 }
 function restore(){
  const old=readSave();
  if(old){progress={...progress,...old};saveStatus='recuperado';}
 }
 restore();
 function reset(newGame){
  if(newGame){progress=initial();try{window.localStorage?.removeItem(saveKey);}catch(_){}}
  state='play';paused=false;acc=0;last=0;keys.clear();
  $('pause').textContent='Pausar';
  fireCooldown=0;attackCooldown=0;reloadRemaining=0;invulnerable=0;
  hero.position.set(progress.x,0,progress.z);
  guard.visible=!progress.guardDefeated;
  guard.position.set(0,0,1.5);
  guardBrain={x:0,z:1.5,homeX:0,homeZ:1.5,mode:'patrol'};
  $('overlay').classList.add('hidden');
  canvas.focus?.();updateHud();save();
 }
 function resize(){
  const width=Math.max(320,Math.min(1200,canvas.clientWidth||960));
  const height=Math.max(180,Math.round(width*9/16));
  renderer.setPixelRatio?.(Math.min(window.devicePixelRatio||1,1.3));
  renderer.setSize(width,height,false);
  camera.aspect=width/height;camera.updateProjectionMatrix();
 }
 resize();window.addEventListener('resize',resize);
 function notice(message){
  $('message').textContent=message;
 }
 function updateHud(){
  $('health').textContent=Math.round(progress.health);
  $('score').textContent='$'+Math.round(progress.cash);
  $('ammo').textContent=progress.ammo+'/'+progress.reserve;
  $('level').textContent='Bairro 1';
  $('timer').textContent=Math.floor(clock)+'s';
  const m=progress.missionComplete?'Missão concluída — estabelecimento conquistado':
   progress.guardDefeated?'Aproxime-se do armazém e pressione E':
   'Missão: derrote o guarda e capture o armazém';
  $('mission').textContent=m;
  $('control-help').textContent='WASD/setas mover · ESPAÇO atirar · R recarregar · E interagir · P pausar';
  beacon.visible=!progress.captured;
  beacon.position.y=3.65+Math.sin(clock*2.6)*.18;
  buildingDoor.material=material(progress.captured?0x56ba93:0x63534a);
 }
 function start(){
  if(state==='menu')reset(false);
  else if(state==='victory'||state==='gameover')reset(true);
 }
 function pause(){
  if(state!=='play')return;
  paused=!paused;acc=0;last=0;keys.clear();
  $('pause').textContent=paused?'Continuar':'Pausar';
  notice(paused?'Jogo pausado':'Exploração retomada');
  save();
 }
 function interact(){
  if(state!=='play'||paused)return;
  const near=Math.hypot(progress.x-door.x,progress.z-door.z)<2.2;
  const result=R.capture(progress,near);
  if(result.changed){
   progress=result.state;save();
   state='victory';
   $('overlay-title').textContent='Primeira missão concluída!';
   $('overlay-sub').textContent='Armazém capturado. Recompensa única: $450. Esta é apenas a primeira área jogável; a campanha completa ainda será desenvolvida.';
   $('start').textContent='Recomeçar demonstração';
   $('overlay').classList.remove('hidden');
   notice('Missão completa! Progresso salvo.');
  }else notice(!near?'Chegue até a porta do armazém.':!progress.guardDefeated?'Elimine o guarda antes da captura.':'Armazém já conquistado.');
  updateHud();
 }
 function reload(){
  if(state!=='play'||paused||reloadRemaining>0||progress.ammo>=12||progress.reserve<=0)return;
  reloadRemaining=.9;notice('Recarregando...');
 }
 function fire(){
  if(state!=='play'||paused||fireCooldown>0||reloadRemaining>0)return;
  if(progress.ammo<=0){notice('Sem balas no pente. Pressione R.');return;}
  fireCooldown=.25;progress.ammo--;
  if(!progress.guardDefeated&&R.canHit(progress,guard.position,blockers)){
   progress.guardHp=Math.max(0,progress.guardHp-25);
   guardPhase=1;notice('Guarda atingido! '+progress.guardHp+' HP');
   if(progress.guardHp===0){
    progress.guardDefeated=true;guard.visible=false;
    notice('Guarda neutralizado. Interaja com o armazém (E).');
   }
  }else notice('Disparo efetuado — sem alvo na mira.');
  save();updateHud();
 }
 $('start').addEventListener('click',start);
 $('pause').addEventListener('click',pause);
 $('restart').addEventListener('click',()=>{
  $('start').textContent='Jogar agora';reset(true);notice('Novo jogo iniciado.');
 });
 $('overlay-sub').textContent='Bairro 3D em terceira pessoa. Derrote o guarda (espaço), vá ao armazém e pressione E para capturar. Salva o progresso neste navegador.';
 $('mission').textContent='Missão: derrote o guarda e capture o armazém';
 const handled=new Set(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','r','e','p','escape']);
 window.addEventListener('keydown',event=>{
  const target=event.target?.tagName?.toLowerCase();
  if(target==='input'||target==='textarea')return;
  const key=String(event.key).toLowerCase();
  if(handled.has(key))event.preventDefault?.();
  if(key==='p'||key==='escape'){if(!event.repeat)pause();return;}
  if(key==='e'&&!event.repeat){interact();return;}
  if(key==='r'&&!event.repeat){reload();return;}
  if(key===' '&&!event.repeat)fire();
  keys.add(key);
 });
 window.addEventListener('keyup',event=>keys.delete(String(event.key).toLowerCase()));
 window.addEventListener('blur',()=>{keys.clear();if(state==='play'&&!paused)pause();});
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){keys.clear();if(state==='play'&&!paused)pause();}
 });
 for(const el of document.querySelectorAll('[data-control]')){
  const action=el.getAttribute('data-control');
  const release=()=>{if(action in touch)touch[action]=false;};
  el.addEventListener('pointerdown',event=>{
   event.preventDefault?.();
   if(action==='fire'){
    if(progress.guardDefeated&&Math.hypot(progress.x-door.x,progress.z-door.z)<2.2)interact();
    else fire();
   }else if(action in touch)touch[action]=true;
  });
  el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);el.addEventListener('pointerleave',release);
 }
 function simulate(dt){
  clock+=dt;
  fireCooldown=Math.max(0,fireCooldown-dt);invulnerable=Math.max(0,invulnerable-dt);
  attackCooldown=Math.max(0,attackCooldown-dt);guardPhase=Math.max(0,guardPhase-dt);
  if(reloadRemaining>0){
   reloadRemaining=Math.max(0,reloadRemaining-dt);
   if(reloadRemaining===0){
    const take=Math.min(12-progress.ammo,progress.reserve);
    progress.ammo+=take;progress.reserve-=take;notice('Arma carregada.');
    save();
   }
  }
  let dx=0,dz=0;
  if(keys.has('w')||keys.has('arrowup')||touch.up)dz--;
  if(keys.has('s')||keys.has('arrowdown')||touch.down)dz++;
  if(keys.has('a')||keys.has('arrowleft')||touch.left)dx--;
  if(keys.has('d')||keys.has('arrowright')||touch.right)dx++;
  const len=Math.hypot(dx,dz);
  if(len>0){
   dx/=len;dz/=len;
   progress.heading=Math.atan2(dx,-dz);
   const moved=R.move(progress,dx*dt*5,dz*dt*5,blockers,17,.4);
   progress.x=moved.x;progress.z=moved.z;walkPhase+=dt*12;
  }
  if((keys.has(' ')||touch.fire)&&fireCooldown<=0)fire();
  hero.position.set(progress.x,0,progress.z);
  hero.rotation.y=-progress.heading;
  const stride=len>0?Math.sin(walkPhase)*.38:0;
  hero.userData.legs[0].rotation.x=stride;
  hero.userData.legs[1].rotation.x=-stride;
  hero.userData.legs[2].rotation.x=-stride*.6;
  hero.userData.legs[3].rotation.x=stride*.6;
  if(!progress.guardDefeated){
   guardBrain=R.guardStep(guardBrain,{x:progress.x,z:progress.z},dt,blockers);
   guard.position.x=guardBrain.x;guard.position.z=guardBrain.z;
   guard.rotation.y=-guardBrain.heading;
   if(guardBrain.canAttack&&attackCooldown===0&&invulnerable===0){
    progress.health=Math.max(0,progress.health-12);
    attackCooldown=1.15;invulnerable=.4;
    notice('Você sofreu 12 de dano. Afaste-se do guarda!');
    save();
    if(progress.health===0){
     state='gameover';keys.clear();
     $('overlay-title').textContent='Você foi derrotado';
     $('overlay-sub').textContent='Recomece a demonstração para tentar a missão novamente.';
     $('start').textContent='Recomeçar';$('overlay').classList.remove('hidden');
    }
   }
  }
  if(saveCooldown>0)saveCooldown-=dt;
  if(len>0&&saveCooldown<=0){saveCooldown=1.5;save();}
  updateHud();
 }
 function draw(){
  guard.visible=!progress.guardDefeated;
  const eye={x:progress.x,y:1.45,z:progress.z};
  const desired=R.cameraPosition(eye,{x:progress.x+2.6,y:4.4,z:progress.z+6.5},blockers);
  camera.position.lerp(new T.Vector3(desired.x,desired.y,desired.z),.16);
  const safe=R.cameraPosition(eye,camera.position,blockers);
  camera.position.set(safe.x,safe.y,safe.z);
  cameraOccluded=desired.occluded||safe.occluded;
  camera.lookAt(progress.x,1.25,progress.z-2.5);
  renderer.render(scene,camera);
 }
 let prevFrame=0,accumulator=0;
 function frame(now){
  requestAnimationFrame(frame);frames++;
  const elapsed=Math.max(0,(now-(prevFrame||now))/1000);prevFrame=now;
  if(state==='play'&&!paused){
   accumulator+=Math.min(.25,elapsed);
   let steps=0;
   while(accumulator+1e-9>=SIM_DT&&steps<MAX_STEPS&&state==='play'&&!paused){
    simulate(SIM_DT);simulationSteps++;steps++;accumulator-=SIM_DT;
   }
   if(steps===MAX_STEPS&&accumulator>=SIM_DT)accumulator=0;
  }else accumulator=0;
  draw();
 }
 hero.position.set(progress.x,0,progress.z);
 guard.position.set(0,0,1.5);
 guard.visible=!progress.guardDefeated;
 const firstCamera=R.cameraPosition({x:progress.x,y:1.45,z:progress.z},
  {x:progress.x+2.6,y:4.4,z:progress.z+6.5},blockers);
 camera.position.set(firstCamera.x,firstCamera.y,firstCamera.z);
 updateHud();
 notice('Um bairro, uma missão. W/S/A/D: mover; espaço: atirar; E: interagir.');
 window.__gameforgeTelemetry=()=>({
  dimension:'3d',genre:'urban-action',camera:'third-person',state,paused,frames,
  simulationHz:60,simulationSteps,stage:1,stages:1,clock,
  health:progress.health,score:progress.cash,ammo:progress.ammo,
  reserve:progress.reserve,player:{x:progress.x,y:0,z:progress.z,heading:progress.heading},
  enemies:progress.guardDefeated?0:1,enemyHp:progress.guardHp,
  guardMode:progress.guardDefeated?'defeated':guardBrain.mode,
  guardWaypoints:progress.guardDefeated?0:(guardBrain.navRoute?.length||0),
  mission:{guardDefeated:progress.guardDefeated,captured:progress.captured,
   complete:progress.missionComplete,rewardGranted:progress.rewardGranted},
  colliders:blockers.length,cameraOccluded,saveStatus,saveEnabled,saveKey,
  prototype:true
 });
 requestAnimationFrame(frame);
}
root.gameForgeUrban3DBoot=gameForgeUrban3DBoot;
if(typeof module!=='undefined')module.exports=gameForgeUrban3DBoot;
})(typeof globalThis!=='undefined'?globalThis:this);
