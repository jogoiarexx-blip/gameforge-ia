/* GF-VOXEL-01: serializable WebGL creative sandbox runtime, separate from campaign engines. */
function gameForgeVoxelBoot(){
 'use strict';
 const T=THREE,K=gameForgeVoxelKitFactory(),W=gameForgeVoxelWorldFactory(K),cfg=GAME_SPEC.voxel;
 const E=gameForgeVoxelEconomyFactory(K),resources=cfg.mode==='resources',forest=resources&&cfg.forest===true,materials=resources?[1,2,3,4,5,6,...(forest?[8,10]:[]),...(cfg.storage?[12]:[]),...(cfg.landscape?[29]:[])]:[1,2,3,...(cfg.landscape?[29]:[])];
 const S=gameForgeVoxelSurvivalFactory(K,E),survival=resources&&cfg.survival===true;
 const D=gameForgeVoxelStorageFactory(E),storage=resources&&cfg.storage===true;
 const tools=resources&&cfg.tools===true,advanced=tools&&cfg.advanced===true,U=gameForgeVoxelToolsFactory(E,advanced),A=gameForgeVoxelAdvancedFactory(E,U);
 const $=id=>document.getElementById(id),canvas=$('game'),keys=new Set(),touch=new Set();
 let renderer;
 try{renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});}
 catch{$('overlay-title').textContent='WebGL indisponível';$('overlay-sub').textContent='Este protótipo requer WebGL. Nenhum save foi alterado.';$('start').disabled=true;return;}
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(72,16/9,.05,145);
 scene.background=new T.Color(0x90b7d1);scene.fog=new T.Fog(0x90b7d1,30,92);
 const size=[64,128,256].includes(cfg.size)?cfg.size:64,landscape=cfg.landscape===true,details=landscape&&cfg.details===true,textured=cfg.textures===true,streamed=size>64||landscape||textured;
 const M=gameForgeVoxelMesherFactory(),X=gameForgeVoxelTextureFactory(K);
 const material=textured?X.material(T,cfg.seed,cfg.atlas):new T.MeshBasicMaterial({vertexColors:true});
 const foliageGeometry=new T.BoxGeometry(1,1,1),foliageMaterial=new T.MeshBasicMaterial({color:0xffffff}),foliage=new Map();
 const meshes=new Map(),versions=new Map(),queued=new Set();let wanted=new Set(),streamKey='',epoch=0,worker=null,inflight=null,workerMode='inactive',workerCompleted=0,quality=['low','medium','high'].includes(cfg.quality)?cfg.quality:'medium';
 let world,player,velocity=0,grounded=false,mined=0,placed=0,selected=2;
 let bag=E.initial(),equipped=false,station=0,life=S.initial(),stash=D.initial(),activeChest=null,gear=U.initial(),nextMineAt=0,forge=A.initial(),mining=A.mining(),mineRequest=false;
 const dropMeshes=new Map(),dropGeometry=new T.BoxGeometry(.24,.24,.24),dropMaterial=new T.MeshBasicMaterial({color:0xf5c65c});
 const visuals=gameForgeVoxelActorsFactory(T),daySky=new T.Color(0x90b7d1),nightSky=new T.Color(0x172943);
 let worldTriangles=0,visualX=0,visualZ=0;
 let state='menu',paused=false,last=0,accumulator=0,clock=0,frames=0,saveAt=0,savedStatus='Ainda não salvo',notice='',noticeUntil=0;
 const dir=()=>[Math.sin(player.yaw)*Math.cos(player.pitch),Math.sin(player.pitch),-Math.cos(player.yaw)*Math.cos(player.pitch)];
 const key=W.saveKey(cfg);
 const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),clamp=(a,b,c)=>Math.max(b,Math.min(c,a));
 function getSaved(){try{return W.readSave(localStorage.getItem(key),cfg,E,S,D,U,A);}catch{return null;}}
 function say(s){notice=s;noticeUntil=clock+3;$('message').textContent=s;}
 function discard(id){
  const plants=foliage.get(id);if(plants){scene.remove(plants);plants.dispose();foliage.delete(id);}
  const old=meshes.get(id);if(old){scene.remove(old);old.geometry.dispose();meshes.delete(id);}
 }
 function decorate(id){
  if(!details)return;const [cx,cz]=id.split(',').map(Number),plants=world.decorations(cx,cz);if(!plants.length)return;
  const specs=[];for(const p of plants){
   if(p.kind==='shrub'){specs.push([p.x,p.y+.17,p.z,.55,.34,.50,0x38672b],[p.x+.13,p.y+.36,p.z-.08,.35,.22,.30,0x679845]);}
   else if(p.kind==='flower'){specs.push([p.x,p.y+.20,p.z,.07,.40,.07,0x427c32],[p.x,p.y+.44,p.z,.26,.12,.26,p.variant?0xf4cc4b:0xe9789a]);}
   else {specs.push([p.x-.10,p.y+.17,p.z,.07,.34,.14,0x5d9a3b],[p.x+.10,p.y+.12,p.z+.08,.08,.24,.13,0x428535]);}
  }
  const batch=new T.InstancedMesh(foliageGeometry,foliageMaterial,specs.length),obj=new T.Object3D(),c=new T.Color();
  specs.forEach((v,i)=>{obj.position.set(v[0],v[1],v[2]);obj.scale.set(v[3],v[4],v[5]);obj.updateMatrix();batch.setMatrixAt(i,obj.matrix);batch.setColorAt(i,c.setHex(v[6]));});
  batch.instanceMatrix.needsUpdate=true;batch.instanceColor.needsUpdate=true;batch.computeBoundingSphere();scene.add(batch);foliage.set(id,batch);
 }
 function applyMesh(id,data){
  discard(id);const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.BufferAttribute(data.positions,3));
  geometry.setAttribute('color',new T.BufferAttribute(data.colors,3));
  if(data.uv){geometry.setAttribute('uv',new T.BufferAttribute(data.uv,2));geometry.setAttribute('voxelTile',new T.BufferAttribute(data.tiles,1));}
  geometry.computeBoundingSphere();
  const object=new T.Mesh(geometry,material);object.userData={faces:data.faces,exposed:data.exposed??data.faces};scene.add(object);meshes.set(id,object);decorate(id);
 }
 function buildNow(id){
  const [cx,cz]=id.split(',').map(Number);
  applyMesh(id,streamed?M.build(world.snapshot(cx,cz),cx,cz,textured):world.mesh(cx,cz));
 }
 function rebuild(id){
  if(!streamed){buildNow(id);return;}
  versions.set(id,(versions.get(id)||0)+1);
  if(wanted.has(id))queued.add(id);
 }
 function radius(){return (innerWidth<700?{low:1,medium:2,high:3}:{low:2,medium:3,high:4})[quality];}
 function refreshStream(){
  if(!streamed)return;
  const {cx,cz}=K.chunkOf(player.x,player.z),r=radius(),tag=cx+','+cz+','+r;
  if(tag===streamKey)return;streamKey=tag;
  const list=[];
  for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
   const x=cx+dx,z=cz+dz;if(x<world.MIN/16||x>=world.MAX/16||z<world.MIN/16||z>=world.MAX/16)continue;
   list.push({id:K.key(x,z),d:dx*dx+dz*dz});
  }
  list.sort((a,b)=>a.d-b.d);wanted=new Set(list.map(v=>v.id));
  for(const id of meshes.keys())if(!wanted.has(id))discard(id);
  for(const id of queued)if(!wanted.has(id))queued.delete(id);
  for(const {id} of list)if(!meshes.has(id)&&!(inflight?.id===id&&inflight.epoch===epoch&&inflight.rev===(versions.get(id)||0)))queued.add(id);
  scene.fog.near=Math.max(10,(r-.5)*16);scene.fog.far=r*16+12;
 }
 function initWorker(){
  if(!streamed||worker||workerMode==='fallback')return;
  try{
   const source='const M=('+gameForgeVoxelMesherFactory.toString()+')();onmessage=e=>{const j=e.data;const d=M.build(j.snapshot,j.cx,j.cz,j.textured);postMessage({id:j.id,epoch:j.epoch,rev:j.rev,data:d},[d.positions.buffer,d.colors.buffer,d.uv.buffer,d.tiles.buffer]);}';
   const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
   try{worker=new Worker(url);}finally{URL.revokeObjectURL(url);}
   workerMode='worker';
   worker.onmessage=e=>{
    const j=e.data;inflight=null;
    if(j.epoch===epoch&&wanted.has(j.id)&&j.rev===(versions.get(j.id)||0)){applyMesh(j.id,j.data);workerCompleted++;}
    else if(wanted.has(j.id)&&!meshes.has(j.id))queued.add(j.id);
   };
   worker.onerror=e=>{e.preventDefault();if(inflight&&wanted.has(inflight.id))queued.add(inflight.id);inflight=null;worker.terminate();worker=null;workerMode='fallback';};
  }catch{worker=null;workerMode='fallback';}
 }
 function pumpStream(){
  if(!streamed)return;refreshStream();if(inflight||!queued.size)return;
  const center=K.chunkOf(player.x,player.z);let id=null,best=Infinity;
  for(const k of queued){const [x,z]=k.split(',').map(Number),d=(x-center.cx)**2+(z-center.cz)**2;if(d<best){best=d;id=k;}}
  queued.delete(id);if(!wanted.has(id))return;
  if(!worker){buildNow(id);return;}
  const [cx,cz]=id.split(',').map(Number),snapshot=world.snapshot(cx,cz),job={id,cx,cz,epoch,rev:versions.get(id)||0,textured,snapshot};
  inflight=job;
  try{worker.postMessage(job,[snapshot.buffer]);}catch{inflight=null;worker.terminate();worker=null;workerMode='fallback';queued.add(id);}
 }
 function resize(){const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,innerWidth<700?1:1.35));
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();visuals.resize(camera.aspect);
 }
 function initialize(saved){
  world=saved?.world||W.create(cfg.seed,[],{forest,storage,tools,advanced,size,landscape,details});
  player=saved?.player||world.spawn();
  if(!player)throw Error('Sem ponto seguro de nascimento.');
  mined=saved?.mined||0;placed=saved?.placed||0;
  bag=resources?(saved?.bag||E.initial()):[];equipped=resources&&!!saved?.equipped;selected=saved?.selected||2;station=0;
  gear=saved?.tools||U.initial();forge=saved?.advanced||A.initial();mining=A.mining();mineRequest=false;nextMineAt=0;
  stash=saved?.storage||D.initial();activeChest=null;syncDrops();
  visuals.reset(scene);visualX=player.x;visualZ=player.z;
  life=saved?.survival||S.initial();if(survival){if(!saved)bag=E.change(bag,11,3);S.populate(life,world,player);syncCreatures();}
  velocity=0;grounded=false;clock=0;saveAt=0;accumulator=0;
  epoch++;workerCompleted=0;for(const id of meshes.keys())discard(id);versions.clear();queued.clear();wanted.clear();streamKey='';
  if(streamed){initWorker();refreshStream();const center=K.chunkOf(player.x,player.z),id=K.key(center.cx,center.cz);queued.delete(id);buildNow(id);}
  else for(const id of world.chunkKeys())buildNow(id);
  resize();updateCamera();refreshBag();updateHUD();
 }
 function save(){
  if(state!=='play')return false;
  if(world.collides(player.x,player.y,player.z))return false;
  const record={version:1,title:cfg.title,seed:cfg.seed,...(size>64?{size}:{}),...(landscape?{landscape:true}:{}),...(details?{details:true}:{}),player:{...player},edits:world.edits(),mined,placed,...(survival?{survival:life}:{}),...(storage?{storage:stash}:{}),...(tools?{tools:gear}:{}),...(advanced?{advanced:forge}:{}),...(resources?{mode:'resources',bag,equipped,selected,...(forest?{forest:true,trees:world.forestState()}: {})}:{})};
  try{localStorage.setItem(key,JSON.stringify(record));savedStatus='Salvo neste navegador';saveAt=clock;return true;}
  catch{savedStatus='Armazenamento indisponível';saveAt=clock;return false;}
 }
 function updateCamera(){
  const d=dir();camera.position.set(player.x,player.y+1.58,player.z);
  camera.lookAt(player.x+d[0],player.y+1.58+d[1],player.z+d[2]);
 }
 function syncCreatures(){
  if(!survival)return;
  visuals.sync(scene,life.animals,life.time,player);
  const dark=S.night(life);scene.background.copy(dark?nightSky:daySky);scene.fog.color.copy(scene.background);material.color.setScalar(dark?.53:1);
 }
 function eat(){if(!survival||state!=='play'||paused)return;const next=S.eat(life,bag);if(!next){say('Sem alimento ou fome já satisfeita.');return;}bag=next;say('Alimentado');refreshBag();save();updateHUD();}
 function revive(){const p=world.spawn();if(!p)return false;player=p;S.respawn(life);velocity=0;grounded=false;clearInput();syncCreatures();say('Você renasceu; mundo e inventário preservados.');save();return true;}
 function syncDrops(){
  if(!storage)return;
  const ids=new Set(stash.drops.map(d=>d.uid));
  for(const [id,m] of dropMeshes)if(!ids.has(id)){scene.remove(m);dropMeshes.delete(id);}
  for(const d of stash.drops){let m=dropMeshes.get(d.uid);if(!m){m=new T.Mesh(dropGeometry,dropMaterial);scene.add(m);dropMeshes.set(d.uid,m);}m.position.set(d.x,d.y+.08*Math.sin(clock*4+d.uid),d.z);m.rotation.y=clock*1.2;}
 }
 function chestOpen(){
  if(!storage||state!=='play'||paused)return;
  const h=target();
  if(!h||!D.access(stash,world,player,h.cell)){say('Mire em um baú a até 3 blocos.');return;}
  activeChest=[...h.cell];inventoryPanel.hidden=false;inventoryPanel.style.display='block';clearInput();refreshBag();
 }
 function chestTransfer(id,dir){
  if(!activeChest||state!=='play'||paused)return;
  if(tools&&(U.isTool(id)||(advanced&&id===23))){say('Ferramentas duráveis ficam na mochila.');return;}
  if(dir==='deposit'&&id===7&&equipped&&E.count(bag,7)===1){say('Guarde a picareta antes de depositar.');return;}
  const next=D.transfer(stash,world,player,bag,activeChest,id,1,dir);
  if(!next){say('Baú distante, sem item ou sem espaço.');return;}
  bag=next;save();refreshBag();updateHUD();
 }
 function dropSelected(){
  if(!storage||state!=='play'||paused)return;
  const next=D.drop(stash,bag,player,selected,1,world.MAX);
  if(!next){say('Sem item ou limite de drops atingido.');return;}
  bag=next;say('Item no chão. Afaste-se antes de 1,5 s para deixá-lo lá.');syncDrops();save();refreshBag();
 }
 function target(){return world.ray([player.x,player.y+1.58,player.z],dir());}
 function requestMine(){if(!advanced)return act('mine');if(state!=='play'||paused)return false;mineRequest=true;return true;}
 function act(kind){
  if(state!=='play'||paused)return false;
  const hit=target();
  if(survival&&kind==='mine'){const a=S.target(life,[player.x,player.y+1.58,player.z],dir());if(a&&(!hit||a.distance<hit.distance)){const r=S.hit(life,a.id,bag,equipped,tools?(U.DEFS[gear.active]?.damage||1):null);if(!r.ok)return false;bag=r.bag;if(tools&&gear.active)wearTool();visuals.swing(clock,'attack');syncCreatures();refreshBag();save();say('Criatura atingida');return true;}}
  if(!hit){say('Aproxime-se de um bloco.');return false;}
  let dirty;
  if(resources){
   if(tools&&kind==='mine'&&!U.canMine(gear,hit.id)){say(hit.id===15?'Minério exige picareta de pedra ou ferro.':'Equipe uma picareta.');return false;}
   if(tools&&!advanced&&kind==='mine'&&clock<nextMineAt)return false;
   if(advanced&&kind==='mine'&&hit.id===5&&A.get(forge,hit.cell)){say('Retire o produto do forno antes de quebrá-lo.');return false;}
   const chestAction=storage&&((kind==='place'&&selected===D.CHEST)||(kind==='mine'&&hit.id===D.CHEST));
   const chestResult=chestAction?(kind==='place'?D.place(stash,world,player,bag,hit):D.mine(stash,world,bag,hit)):null;
   const result=chestAction?(chestResult?{ok:true,...chestResult}:{ok:false,reason:'chest'}):E.edit(world,player,bag,hit,kind,selected,equipped,tools?gear.active:null);
   if(!result.ok){say(({pickaxe:'Equipe uma picareta para minerar pedra.', 'inventory-full':'Inventário cheio.', 'missing-materials':'Você não possui este bloco.', 'world-edit':'Não é possível editar este bloco.','plant-site':'Plante sobre terra ou grama, com espaço livre.','chest':'Baú cheio, sem espaço ou ação inválida. Esvazie-o antes de minerar.'})[result.reason]||'Ação inválida.');return false;}
   bag=result.bag;dirty=result.dirty;
   if(tools&&kind==='mine'){nextMineAt=clock+(U.DEFS[gear.active]?.delay||.8);if(gear.active&&([3,15,20,21].includes(hit.id)||(advanced&&gear.active===17&&[8,9].includes(hit.id))||(advanced&&gear.active===18&&[1,2].includes(hit.id))))wearTool();}
  }else dirty=kind==='mine'?world.mine(hit):world.place(hit,selected,player);
  if(!dirty){say('Ação inválida: alcance, limite de edições ou colisão.');return false;}
  if(kind==='mine')mined++;else placed++;
  visuals.swing(clock,kind==='mine'?'mine':'place');
  for(const id of dirty)rebuild(id);
  say(kind==='mine'?(hit.id===8||hit.id===9?'Madeira/folhas removidas':'Bloco removido'):selected===10?'Muda plantada: cresce em 20 s de jogo ativo.':'Bloco colocado');save();refreshBag();updateHUD();return true;
 }
 function wearTool(){const r=U.wear(gear,bag);bag=r.bag;equipped=!!gear.active;if(r.broken)say('Picareta quebrou.');}
 function repairTool(){if(!tools||state!=='play'||paused)return;const r=U.repair(gear,bag,world,player);if(!r){say('Equipe ferramenta desgastada perto da bancada e tenha material de reparo.');return;}bag=r;save();refreshBag();updateHUD();say('Ferramenta reparada.');}
 function armorToggle(){if(!advanced||state!=='play'||paused)return;if(!A.toggleArmor(forge,bag)){say('Fabrique uma armadura de ferro.');return;}save();refreshBag();say(forge.armor?'Armadura equipada':'Armadura guardada');}
 function furnaceCollect(){if(!advanced||state!=='play'||paused)return;const next=A.collect(forge,bag,world,player);if(!next){say('Forno distante, ainda processando ou mochila cheia.');return;}bag=next;save();refreshBag();say('Produto retirado do forno.');}
 function updateHUD(){
  if(advanced){progress.value=mining.duration?mining.elapsed/mining.duration:0;progress.style.display=mining.key?'block':'none';}
  $('health').textContent=survival?String(Math.ceil(life.health)):'100';$('score').textContent=String(mined+placed);
  $('ammo').textContent=E.NAMES[selected]+(resources?' × '+E.count(bag,selected):'');$('level').textContent=String(cfg.seed);
  $('timer').textContent=survival?('Dia '+(Math.floor(life.time/S.PERIOD)+1)+' · '+(S.night(life)?'Noite':'Dia')+' · Fome '+Math.ceil(life.hunger)+'%'):Math.floor(clock)+'s';
  $('mission').textContent=(survival?'Sobrevivência':resources?'Coleta e fabricação':'Criativo')+' · removidos '+mined+' · colocados '+placed+' · '+world.editCount()+'/'+world.LIMIT+' edições';
  if(clock>noticeUntil)$('message').textContent=paused?'Pausado · '+savedStatus:('Seed '+cfg.seed+' · '+savedStatus);
  if(advanced){const j=forge.jobs.length?A.get(forge,A.nearest(world,player)):null;$('mission').textContent+=' · Defesa '+Math.round(A.defense(forge)*100)+'%'+(j?' · Forno '+(j.remaining>0?Math.ceil(j.remaining)+'s':'pronto'):'');}
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
  if(forest){const dirty=world.grow(dt,player);if(dirty.length){for(const id of dirty)rebuild(id);say('Uma muda cresceu!');save();}}
  if(advanced){
   if(A.tick(forge,dt)){say('Processamento do forno concluído.');save();}
   if(mineRequest||keys.has('KeyE')){
    const hit=target(),animal=survival?S.target(life,[player.x,player.y+1.58,player.z],dir()):null;
    if(animal&&(!hit||animal.distance<hit.distance)){act('mine');mineRequest=false;mining=A.mining();}
    else if(!hit||!U.canMine(gear,hit.id)){mineRequest=false;mining=A.mining();}
    else if(A.advance(mining,hit,gear.active,dt)){act('mine');mineRequest=false;mining=A.mining();}
   }else mining=A.mining();
  }
  if(survival){S.tick(life,dt,world,player,!!(f||s),advanced?A.defense(forge):0);if(life.health<=0)revive();}
  if(storage){const r=D.collect(stash,bag,player,dt);if(r.collected){bag=r.bag;syncDrops();say('Coletado: '+r.collected+' item(ns).');refreshBag();save();}}
  if(clock-saveAt>=5)save();
 }
 function clearInput(){keys.clear();touch.clear();mineRequest=false;mining=A.mining();}
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
 const progress=document.createElement('progress');progress.id='voxel-mining-progress';progress.max=1;progress.value=0;progress.style.cssText='position:absolute;top:56%;left:40%;width:20%;pointer-events:none;display:none';canvas.parentNode.append(progress);
 const cross=document.createElement('div');cross.textContent='+';cross.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;color:white;text-shadow:0 1px 2px black;font-size:25px';canvas.parentNode.append(cross);
 const mineButton=button(buttons,'Minerar',requestMine);mineButton.id='voxel-mine';
 const placeButton=button(buttons,'Construir',()=>act('place'));placeButton.id='voxel-place';
 const selectButton=button(buttons,'Material: Terra',()=>selectMaterial(materials[(materials.indexOf(selected)+1)%materials.length]));
 function selectMaterial(id){if(!materials.includes(id))return;selected=id;selectButton.textContent='Material: '+E.NAMES[selected];refreshBag();updateHUD();if(resources)save();}
 const inventoryPanel=document.createElement('section');inventoryPanel.id='voxel-inventory';inventoryPanel.hidden=true;
 inventoryPanel.style.cssText='padding:12px;margin:8px 0;background:#142537;border-radius:10px;border:1px solid #435c73;display:none';
 const bagText=document.createElement('p'),recipeList=document.createElement('div'),stationRow=document.createElement('div'),inventoryTitle=document.createElement('strong');
 inventoryTitle.textContent='Inventário e fabricação';inventoryPanel.append(inventoryTitle,bagText,stationRow,recipeList);
 document.querySelector('footer').after(inventoryPanel);
 const chestPanel=document.createElement('div');chestPanel.id='voxel-chest-panel';inventoryPanel.append(chestPanel);
 const stationButtons={};
 function refreshBag(){
  selectButton.textContent='Material: '+E.NAMES[selected];
  if(!resources)return;
  bagText.textContent=([...(forest?[1,2,3,4,5,6,7,8,10]:[1,2,3,4,5,6,7]),...(survival?[11]:[]),...(storage?[12]:[]),...(tools?[13,14,15,16]:[]),...(advanced?[17,18,19,20,21,22,23]:[]),...(landscape?[29]:[])]).map(id=>E.NAMES[id]+': '+E.count(bag,id)).join(' · ')+(tools?(gear.active?' · '+U.DEFS[gear.active].name+' '+gear.wear[gear.active]+'/'+U.DEFS[gear.active].max:' · Sem ferramenta'):(equipped?' · Picareta equipada':''));
  if(!inventoryPanel.hidden){
   recipeList.replaceChildren();
   for(const {recipe,index} of K.recipesAtStation(E.RECIPES,station)){
    if(recipe.output.id===12&&!storage)continue;
    if(recipe.output.id>=13&&!tools)continue;
    if(recipe.output.id>=17&&!advanced)continue;
    const label=advanced&&A.RECIPES[index]?'Processar '+E.NAMES[recipe.output.id]+' · '+A.RECIPES[index].duration+' s · madeira/carvão':recipe.output.qty+' × '+(tools&&U.isTool(recipe.output.id)?U.DEFS[recipe.output.id].name:E.NAMES[recipe.output.id])+' ('+recipe.requires.map(r=>r.qty+' '+E.NAMES[r.id]).join(' + ')+')';
    const b=button(recipeList,label,()=>craftRecipe(index));b.dataset.recipe=String(index);b.style.margin='4px';
   }
   if(station!==0){const p=document.createElement('p');p.textContent='É necessário estar a até 3 blocos da estação colocada.';recipeList.append(p);}
  }
  chestPanel.replaceChildren();
  if(storage&&activeChest&&!inventoryPanel.hidden){
   const c=D.access(stash,world,player,activeChest);
   if(!c){activeChest=null;return;}
   const title=document.createElement('strong');title.textContent='Baú · '+c.bag.filter(Boolean).length+'/12 pilhas';chestPanel.append(title);
   const ids=[...new Set([...bag,...c.bag].filter(Boolean).map(v=>v.id))].sort((a,b)=>a-b);
   for(const id of ids){
    const line=document.createElement('div');line.style.cssText='display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:4px 0';
    const label=document.createElement('span');label.textContent=E.NAMES[id]+' · Mochila '+E.count(bag,id)+' / Baú '+E.count(c.bag,id);line.append(label);
    if(E.count(bag,id)){const b=button(line,'Guardar 1',()=>chestTransfer(id,'deposit'));b.dataset.deposit=String(id);}
    if(E.count(c.bag,id)){const b=button(line,'Retirar 1',()=>chestTransfer(id,'withdraw'));b.dataset.withdraw=String(id);}
    chestPanel.append(line);
   }
  }
 }
 function craftRecipe(index){
  if(!resources||state!=='play'||paused)return;
  if(!storage&&E.RECIPES[index]?.output.id===12)return;
  if(!tools&&E.RECIPES[index]?.output.id>=13)return;
  if(!advanced&&E.RECIPES[index]?.output.id>=17)return;
  if(advanced&&E.RECIPES[index]?.output.id===23&&E.count(bag,23)>0){say('Você já possui armadura.');return;}
  if(advanced&&A.RECIPES[index]){if(station!==5)return;const next=A.start(forge,bag,world,player,index);if(!next){say('Forno distante/ocupado ou faltam insumos e combustível.');return;}bag=next;save();refreshBag();say('Processamento iniciado.');return;}
  const result=tools?U.craft(gear,bag,index,station,world,player):E.craft(bag,index,station,world,player);
  if(!result.ok){say(result.reason==='owned'?'Você já possui uma ferramenta deste nível.':result.reason==='missing-materials'?'Faltam materiais.':result.reason==='inventory-full'?'Inventário cheio.':'Aproxime-se da estação correta.');return;}
  bag=result.inventory;say('Fabricado: '+E.NAMES[E.RECIPES[index].output.id]);save();refreshBag();updateHUD();
 }
 function toggleInventory(){
  if(!resources||state!=='play')return;
  activeChest=null;inventoryPanel.hidden=!inventoryPanel.hidden;inventoryPanel.style.display=inventoryPanel.hidden?'none':'block';clearInput();refreshBag();
 }
 function equip(){
  if(!resources||state!=='play'||paused)return;
  if(tools){mineRequest=false;mining=A.mining();U.equip(gear,bag);equipped=!!gear.active;say(equipped?U.DEFS[gear.active].name+' equipada':'Ferramenta guardada');save();refreshBag();return;}
  if(E.count(bag,7)<1){say('Fabrique a picareta na bancada primeiro.');return;}
  equipped=!equipped;say(equipped?'Picareta equipada':'Picareta guardada');save();refreshBag();
 }
 if(resources){
  const open=button(buttons,'Inventário (I)',toggleInventory);open.id='voxel-bag';
  const tool=button(buttons,'Equipar/guardar picareta',equip);tool.id='voxel-equip';
  for(const [id,label] of [[0,'Mochila'],[4,'Bancada'],[5,'Forno']]){
   const b=button(stationRow,label,()=>{station=id;refreshBag();});b.dataset.station=String(id);b.style.margin='4px';stationButtons[id]=b;
  }
 }
 if(survival){const food=button(buttons,'Comer (C)',eat);food.id='voxel-eat';}
 if(advanced){const armor=button(buttons,'Armadura (H)',armorToggle);armor.id='voxel-armor';const collect=button(buttons,'Retirar do forno (J)',furnaceCollect);collect.id='voxel-furnace-collect';}
 if(tools){const repair=button(buttons,'Reparar picareta (R)',repairTool);repair.id='voxel-repair';}
 if(storage){const open=button(buttons,'Baú (B)',chestOpen);open.id='voxel-chest';const drop=button(buttons,'Soltar item (G)',dropSelected);drop.id='voxel-drop';}
 if(streamed){const distanceButton=button(buttons,'Visão: '+quality,()=>{quality=['low','medium','high'][(['low','medium','high'].indexOf(quality)+1)%3];distanceButton.textContent='Visão: '+quality;refreshStream();});distanceButton.id='voxel-render-distance';}
 const saveButton=button(buttons,'Salvar',()=>{save();updateHUD();});saveButton.id='voxel-save';
 const action=touchBar.querySelector('[data-control="fire"]');action.textContent='MINERAR';action.addEventListener('click',requestMine);
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
  if(e.code==='KeyE')requestMine();if(e.code==='KeyQ')act('place');
  if(/^Digit[1-6]$/.test(e.code))selectMaterial(Number(e.code.slice(-1)));
  if(forest&&e.code==='Digit8')selectMaterial(8);if(forest&&e.code==='Digit0')selectMaterial(10);
  if(e.code==='KeyI')toggleInventory();if(e.code==='KeyF')equip();if(tools&&e.code==='KeyR')repairTool();if(advanced&&e.code==='KeyH')armorToggle();if(advanced&&e.code==='KeyJ')furnaceCollect();if(e.code==='KeyC')eat();if(storage&&e.code==='KeyB')chestOpen();if(storage&&e.code==='KeyG')dropSelected();if(storage&&e.code==='Digit9')selectMaterial(12);if(landscape&&e.code==='Digit7')selectMaterial(29);
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
  if(drag.dist<5&&drag.type==='mouse'){if(drag.button===2)act('place');else requestMine();}drag=null;
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
  pumpStream();syncDrops();syncCreatures();updateCamera();renderer.render(scene,camera);worldTriangles=renderer.info.render.triangles;
  const moving=Math.hypot(player.x-visualX,player.z-visualZ)>.0001;
  visualX=player.x;visualZ=player.z;
  visuals.pose({time:clock,active:state==='play',equipped,toolId:tools?gear.active:7,selected,available:!resources||E.count(bag,selected)>0,moving});
  visuals.render(renderer);frames++;updateHUD();requestAnimationFrame(frame);
 }
 const stored=getSaved();
 initialize(stored);$('overlay-title').textContent=cfg.title;$('overlay-sub').textContent=resources?'Coleta e fabricação · inventário limitado · construa a bancada e o forno. Requer WebGL.':'Mundo criativo de '+size+' × '+size+' blocos · terreno por seed · explore, mine e construa. Requer WebGL.';
 if(resources)$('control-help').textContent+=' · 4–6 estações/tijolo · I inventário · F picareta';
 if(survival)$('control-help').textContent+=' · C comer · E atacar criatura · sobreviva à noite';
 if(forest)$('control-help').textContent+=' · 8 madeira · 0 muda · corte árvore com E';
 if(storage)$('control-help').textContent+=' · 9 baú · B abrir baú · G soltar bloco';
 if(tools)$('control-help').textContent+=' · F alternar picaretas · R reparar na bancada';
 if(advanced)$('control-help').textContent+=' · E segurar para minerar · H armadura · J retirar forno';
 if(landscape)$('control-help').textContent+=' · 7 areia';
 if(stored)$('start').textContent='Continuar mundo';
 window.__gameforgeTelemetry=()=>({engine:'voxel-v1',state,paused,clock,frames,player:{...player},grounded,mined,placed,edits:world.editCount(),selected,mode:resources?'resources':'creative',forest,advanced:advanced?JSON.parse(JSON.stringify(forge)):null,mining:advanced?{...mining}:null,tools:tools?JSON.parse(JSON.stringify(gear)):null,storage:storage?JSON.parse(JSON.stringify(stash)):null,survival:survival?JSON.parse(JSON.stringify(life)):null,trees:forest?world.forestState():[],inventory:resources?E.copy(bag):null,equipped,saveStatus:savedStatus,chunks:meshes.size,mapSize:size,textured,landscape,details,foliageInstances:[...foliage.values()].reduce((n,m)=>n+m.count,0),stream:{quality,radius:streamed?radius():null,wanted:wanted.size,queued:queued.size,worker:workerMode,workerCompleted,center:K.chunkOf(player.x,player.z),keys:[...meshes.keys()],faces:[...meshes.values()].reduce((n,m)=>n+m.userData.faces,0),exposed:[...meshes.values()].reduce((n,m)=>n+m.userData.exposed,0)},target:target(),triangles:worldTriangles,visuals:visuals.snapshot()});
 requestAnimationFrame(frame);
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelBoot=gameForgeVoxelBoot;
if(typeof module!=='undefined')module.exports=gameForgeVoxelBoot;
