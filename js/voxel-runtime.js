/* GF-VOXEL-01: serializable WebGL creative sandbox runtime, separate from campaign engines. */
function gameForgeVoxelBoot(){
 'use strict';
 const T=THREE,K=gameForgeVoxelKitFactory(),W=gameForgeVoxelWorldFactory(K),cfg=GAME_SPEC.voxel;
 const $=id=>document.getElementById(id),canvas=$('game'),keys=new Set(),touch=new Set();
 let renderer;
 try{renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});}
 catch{$('overlay-title').textContent='WebGL indisponível';$('overlay-sub').textContent='Este protótipo requer WebGL. Nenhum save foi alterado.';$('start').disabled=true;return;}
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(72,16/9,.05,145);
 scene.background=new T.Color(0x90b7d1);scene.fog=new T.Fog(0x90b7d1,30,92);
 const material=new T.MeshBasicMaterial({vertexColors:true});
 const meshes=new Map();let world,player,velocity=0,grounded=false,mined=0,placed=0,selected=2;
 let state='menu',paused=false,last=0,accumulator=0,clock=0,frames=0,saveAt=0,savedStatus='Ainda não salvo',notice='',noticeUntil=0;
 const dir=()=>[Math.sin(player.yaw)*Math.cos(player.pitch),Math.sin(player.pitch),-Math.cos(player.yaw)*Math.cos(player.pitch)];
 const key=W.saveKey(cfg);
 const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),clamp=(a,b,c)=>Math.max(b,Math.min(c,a));
 function getSaved(){try{return W.readSave(localStorage.getItem(key),cfg);}catch{return null;}}
 function say(s){notice=s;noticeUntil=clock+3;$('message').textContent=s;}
 function rebuild(id){
  const [cx,cz]=id.split(',').map(Number),data=world.mesh(cx,cz);
  if(meshes.has(id)){const old=meshes.get(id);scene.remove(old);old.geometry.dispose();}
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.BufferAttribute(data.positions,3));
  geometry.setAttribute('color',new T.BufferAttribute(data.colors,3));geometry.computeBoundingSphere();
  const object=new T.Mesh(geometry,material);scene.add(object);meshes.set(id,object);
 }
 function resize(){const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,innerWidth<700?1:1.35));
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
 }
 function initialize(saved){
  world=saved?.world||W.create(cfg.seed);
  player=saved?.player||world.spawn();
  if(!player)throw Error('Sem ponto seguro de nascimento.');
  mined=saved?.mined||0;placed=saved?.placed||0;
  velocity=0;grounded=false;clock=0;saveAt=0;accumulator=0;
  for(const id of world.chunkKeys())rebuild(id);
  resize();updateCamera();updateHUD();
 }
 function save(){
  if(state!=='play')return false;
  if(world.collides(player.x,player.y,player.z))return false;
  const record={version:1,title:cfg.title,seed:cfg.seed,player:{...player},edits:world.edits(),mined,placed};
  try{localStorage.setItem(key,JSON.stringify(record));savedStatus='Salvo neste navegador';saveAt=clock;return true;}
  catch{savedStatus='Armazenamento indisponível';saveAt=clock;return false;}
 }
 function updateCamera(){
  const d=dir();camera.position.set(player.x,player.y+1.58,player.z);
  camera.lookAt(player.x+d[0],player.y+1.58+d[1],player.z+d[2]);
 }
 function target(){return world.ray([player.x,player.y+1.58,player.z],dir());}
 function act(kind){
  if(state!=='play'||paused)return false;
  const hit=target();if(!hit){say('Aproxime-se de um bloco.');return false;}
  const dirty=kind==='mine'?world.mine(hit):world.place(hit,selected,player);
  if(!dirty){say('Ação inválida: alcance, limite de edições ou colisão.');return false;}
  if(kind==='mine')mined++;else placed++;
  for(const id of dirty)rebuild(id);
  say(kind==='mine'?'Bloco removido':'Bloco colocado');save();updateHUD();return true;
 }
 function updateHUD(){
  $('health').textContent='100';$('score').textContent=String(mined+placed);
  $('ammo').textContent=['','Grama','Terra','Pedra'][selected];$('level').textContent=String(cfg.seed);
  $('timer').textContent=Math.floor(clock)+'s';
  $('mission').textContent='Criativo · removidos '+mined+' · colocados '+placed+' · '+world.edits().length+'/'+W.LIMIT+' edições';
  if(clock>noticeUntil)$('message').textContent=paused?'Pausado · '+savedStatus:('Seed '+cfg.seed+' · '+savedStatus);
  const marks=K.compassMarks(player.yaw,45).filter(m=>m.label);compass.textContent=marks.sort((a,b)=>a.left-b.left).map(m=>m.label).join('    ');
 }
 function moveAxis(axis,delta){
  if(!delta)return true;
  const count=Math.ceil(Math.abs(delta)/.16);
  for(let i=0;i<count;i++){
   const candidate={...player,[axis]:player[axis]+delta/count};
   if(world.collides(candidate.x,candidate.y,candidate.z))return false;
   player[axis]=candidate[axis];
  }
  return true;
 }
 function jump(){if(state==='play'&&!paused&&grounded){velocity=5.8;grounded=false;}}
 function step(dt){
  clock+=dt;
  const pressed=(k,t)=>keys.has(k)||touch.has(t);
  let f=+pressed('KeyW','up')-+pressed('KeyS','down'),s=+pressed('KeyD','right')-+pressed('KeyA','left');
  if(keys.has('ArrowLeft'))player.yaw=wrap(player.yaw-dt*1.8);
  if(keys.has('ArrowRight'))player.yaw=wrap(player.yaw+dt*1.8);
  if(keys.has('ArrowUp'))player.pitch=clamp(player.pitch+dt*1.4,-1.45,1.45);
  if(keys.has('ArrowDown'))player.pitch=clamp(player.pitch-dt*1.4,-1.45,1.45);
  const scale=4.5*dt/(Math.hypot(f,s)||1);
  moveAxis('x',(Math.sin(player.yaw)*f+Math.cos(player.yaw)*s)*scale);
  moveAxis('z',(-Math.cos(player.yaw)*f+Math.sin(player.yaw)*s)*scale);
  velocity=Math.max(-18,velocity-16*dt);const before=velocity;
  if(!moveAxis('y',velocity*dt)){grounded=before<0;velocity=0;}else grounded=false;
  if(keys.has('Space')&&grounded)jump();
  if(clock-saveAt>=5)save();
 }
 function clearInput(){keys.clear();touch.clear();}
 function togglePause(){
  if(state!=='play')return;
  if(!paused)save();paused=!paused;clearInput();accumulator=0;
  $('pause').textContent=paused?'Continuar':'Pausar';updateHUD();
 }
 const buttons=document.querySelector('.buttons'),touchBar=document.querySelector('.touch');
 function button(parent,label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;parent.append(b);b.addEventListener('click',fn);return b;}
 const compass=document.createElement('div');compass.id='voxel-compass';
 compass.style.cssText='position:absolute;top:9px;left:50%;transform:translateX(-50%);background:#142534c4;color:white;font-size:14px;padding:5px 12px;border-radius:6px;pointer-events:none;white-space:pre';
 canvas.parentNode.append(compass);
 const cross=document.createElement('div');cross.textContent='+';cross.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;color:white;text-shadow:0 1px 2px black;font-size:25px';canvas.parentNode.append(cross);
 const mineButton=button(buttons,'Minerar',()=>act('mine'));mineButton.id='voxel-mine';
 const placeButton=button(buttons,'Construir',()=>act('place'));placeButton.id='voxel-place';
 const selectButton=button(buttons,'Material: Terra',()=>{selected=selected%3+1;selectButton.textContent='Material: '+['','Grama','Terra','Pedra'][selected];updateHUD();});
 const saveButton=button(buttons,'Salvar',()=>{save();updateHUD();});saveButton.id='voxel-save';
 const action=touchBar.querySelector('[data-control="fire"]');action.textContent='MINERAR';action.addEventListener('click',()=>act('mine'));
 const rightButtons=document.createElement('div');rightButtons.style.cssText='display:flex;flex-wrap:wrap;gap:4px;max-width:180px';touchBar.append(rightButtons);
 button(rightButtons,'PÔR',()=>act('place'));button(rightButtons,'PULAR',jump);button(rightButtons,'BLOCO',()=>selectButton.click());
 touchBar.querySelectorAll('.pad [data-control]').forEach(b=>{
  const name=b.dataset.control;
  b.addEventListener('pointerdown',e=>{e.preventDefault();touch.add(name);try{b.setPointerCapture(e.pointerId);}catch{}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>touch.delete(name));
 });
 $('control-help').textContent='WASD mover · setas ou arrastar para olhar · Espaço pular · E minerar · Q construir · 1–3 material';
 document.addEventListener('keydown',e=>{
  if(state!=='play')return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  keys.add(e.code);if(e.repeat)return;
  if(e.code==='KeyP')togglePause();
  if(e.code==='KeyE')act('mine');if(e.code==='KeyQ')act('place');
  if(/^Digit[123]$/.test(e.code)){selected=Number(e.code.slice(-1));selectButton.textContent='Material: '+['','Grama','Terra','Pedra'][selected];updateHUD();}
 });
 document.addEventListener('keyup',e=>keys.delete(e.code));
 let drag=null;
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{
  if(state!=='play'||paused)return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,dist:0,button:e.button,type:e.pointerType};
  try{canvas.setPointerCapture(e.pointerId);}catch{}
 });
 canvas.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId||paused)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.dist+=Math.abs(dx)+Math.abs(dy);
  player.yaw=wrap(player.yaw+dx*.005);player.pitch=clamp(player.pitch-dy*.005,-1.45,1.45);
  drag.x=e.clientX;drag.y=e.clientY;
 });
 canvas.addEventListener('pointerup',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  if(drag.dist<5&&drag.type==='mouse')act(drag.button===2?'place':'mine');drag=null;
 });
 canvas.addEventListener('pointercancel',()=>drag=null);
 window.addEventListener('blur',()=>{clearInput();drag=null;if(state==='play')save();});
 window.addEventListener('pagehide',()=>{if(state==='play')save();});
 window.addEventListener('resize',resize);
 $('start').addEventListener('click',()=>{
  const saved=getSaved();initialize(saved);state='play';paused=false;
  savedStatus=saved?'Progresso restaurado':'Ainda não salvo';$('overlay').classList.add('hidden');canvas.focus();say(saved?'Mundo restaurado':'Explore e construa!');
 });
 $('pause').addEventListener('click',togglePause);
 $('restart').addEventListener('click',()=>{
  if(!window.confirm('Apagar o progresso salvo deste mundo e começar novamente?'))return;
  try{localStorage.removeItem(key);}catch{}clearInput();initialize(null);state='play';paused=false;
  $('overlay').classList.add('hidden');$('pause').textContent='Pausar';savedStatus='Novo mundo';say('Novo mundo criado');save();
 });
 function frame(now){
  const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
  if(state==='play'&&!paused){
   accumulator+=dt;let count=0;
   while(accumulator>=1/60&&count++<6){step(1/60);accumulator-=1/60;}
  }
  updateCamera();renderer.render(scene,camera);frames++;updateHUD();requestAnimationFrame(frame);
 }
 const stored=getSaved();
 initialize(stored);$('overlay-title').textContent=cfg.title;$('overlay-sub').textContent='Mundo criativo de 64 × 64 blocos · terreno por seed · explore, mine e construa. Requer WebGL.';
 if(stored)$('start').textContent='Continuar mundo';
 window.__gameforgeTelemetry=()=>({engine:'voxel-v1',state,paused,clock,frames,player:{...player},grounded,mined,placed,edits:world.edits().length,selected,saveStatus:savedStatus,chunks:meshes.size,target:target(),triangles:renderer.info.render.triangles});
 requestAnimationFrame(frame);
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelBoot=gameForgeVoxelBoot;
if(typeof module!=='undefined')module.exports=gameForgeVoxelBoot;
