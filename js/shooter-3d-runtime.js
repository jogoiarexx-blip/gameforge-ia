/* Motor independente de shoot'em up 3D: Three.js local, sem dependencias de CDN. */
function gameForgeShooter3DBoot(){
 'use strict';
 const T=THREE, R=gameForgeWorldRules(),spec=GAME_SPEC;
 const $=id=>document.getElementById(id),canvas=$('game');
 const opts={size:48,quality:'auto',seed:12345,theme:'neon',...spec.worldOptions};
 const size=R.clamp(Number(opts.size)||48,32,88),stages=(spec.stages?.length?spec.stages:['Fase 1']).slice(0,30);
 const stageConfigs=Array.isArray(spec.stageConfig)?spec.stageConfig:[];
 const configAt=i=>stageConfigs[i]&&typeof stageConfigs[i]==='object'?stageConfigs[i]:{};
 const tuning={difficulty:1,enemyMultiplier:1,bossMultiplier:1,playerSpeedMultiplier:1,fireRateMultiplier:1,...spec.tuning};
 for(const k of Object.keys(tuning))tuning[k]=R.clamp(Number(tuning[k])||1,.25,4);
 let renderer,software=false;
 try{renderer=new T.WebGLRenderer({canvas,antialias:opts.quality!=='low',powerPreference:'high-performance',preserveDrawingBuffer:true});}
 catch(e){
  if(typeof gameForgeSoftwareRenderer==='function')try{renderer=gameForgeSoftwareRenderer(T,canvas);software=true;}catch{}
  if(!renderer){$('overlay-title').textContent='Renderização indisponível';$('overlay-sub').textContent='WebGL e modo compatível indisponíveis neste dispositivo.';$('start').disabled=true;return;}
 }
 renderer.shadowMap.enabled=false;
 renderer.outputColorSpace=T.SRGBColorSpace||renderer.outputColorSpace;
 let pixelRatio=software?.8:Math.min(window.devicePixelRatio||1,opts.quality==='low'?1:opts.quality==='high'?1.65:1.25);
 let scene,world,camera,geometries=[],materials=[],geos={},mats={},ship,stage=0;
 let health=100,score=0,weapon=1,kills=0,state='menu',paused=false,invulnerable=0,fireDelay=0;
 let wave=0,waveMax=3,waveTimer=0,bossSpawned=false,bossPhase=1,stageTransition=0;
 let enemies=[],shots=[],hostileShots=[],drops=[],stars=[],starField=null,starTransform=null;
 let clock=0,stageClock=0,frames=0,last=0,lastDraw=-1e6,noticeTime=0;
 let player={x:0,y:0,z:size*.27,speed:0},pendingPointer=false;
 const keys=new Set(),touch={up:false,down:false,left:false,right:false,fire:false};
 const playerPosition=new T.Vector3();
 const limitX=size*.42,limitZ=size*.42;
 function mat(hex,emissive=0){const m=new T.MeshStandardMaterial({color:hex,roughness:.48,metalness:.34,flatShading:true,emissive,emissiveIntensity:emissive?.6:0});materials.push(m);return m;}
 function geometry(g){geometries.push(g);return g;}
 function makeMesh(g,m,parent,x=0,y=0,z=0){const obj=new T.Mesh(g,m);obj.position.set(x,y,z);parent.add(obj);return obj;}
 function notice(text,seconds=1.8){$('message').textContent=text;$('message').style.opacity='1';noticeTime=seconds;}
 function release(){keys.clear();pendingPointer=false;for(const k of Object.keys(touch))touch[k]=false;}
 function disposeStage(){
  if(!scene)return;
  starField?.dispose?.();starField=null;starTransform=null;
  for(const g of geometries)g.dispose();
  for(const m of materials)m.dispose();
  scene.clear();
  renderer.renderLists?.dispose?.();
 }
 function starfighter(color,boss=false){
  const group=new T.Group(),body=color==='player'?mats.hero:boss?mats.boss:mats.enemy;
  const trim=color==='player'?mats.playerWing:boss?mats.bossWing:mats.enemyWing;
  makeMesh(geos.body,body,group,0,.82,0);
  const tip=makeMesh(geos.nose,body,group,0,.82,-1.17);tip.rotation.x=-Math.PI/2;
  makeMesh(geos.wing,trim,group,0,.72,.26);
  makeMesh(geos.canopy,mats.glass,group,0,1.04,-.28);
  for(const side of [-1,1]){
   makeMesh(geos.thruster,mats.engine,group,side*.4,.7,1.05);
   makeMesh(geos.pod,trim,group,side*1.24,.72,.33);
  }
  group.scale.setScalar(boss?2.25:1);
  world.add(group);
  return group;
 }
 const importedModels=[],importErrors=[];
 if(typeof gameForgeDecodeGLB==='function'){
  const sources=[];
  if(typeof GF_SCENE_GLB_BASE64==='string')sources.push({id:'legacy',base64:GF_SCENE_GLB_BASE64,...(typeof GF_SCENE_GLB_OPTIONS==='object'?GF_SCENE_GLB_OPTIONS:{})});
  if(typeof GF_SCENE_ASSETS!=='undefined'&&Array.isArray(GF_SCENE_ASSETS))sources.push(...GF_SCENE_ASSETS.slice(0,4));
  for(const a of sources)try{importedModels.push({id:a.id,model:gameForgeDecodeGLB(T,a.base64),x:a.x,z:a.z,scale:a.scale});}
  catch(error){importErrors.push(String(error?.message||error));}
 }
 function drawImports(){
  for(const a of importedModels){
   const container=new T.Group(),model=a.model.clone(true);
   container.position.set(R.clamp(Number(a.x)||5,-size*.43,size*.43),.03,R.clamp(Number(a.z)||0,-size*.43,size*.43));
   container.scale.setScalar(R.clamp(Number(a.scale)||1,.2,4));
   container.userData.gameForgeImported=true;container.userData.gameForgeAssetId=a.id;
   container.add(model);world.add(container);
  }
 }
 function setUpStage(){
  const custom=configAt(stage);
  disposeStage();geometries=[];materials=[];enemies=[];shots=[];hostileShots=[];drops=[];stars=[];
  wave=0;waveTimer=0;bossSpawned=false;bossPhase=1;stageTransition=0;stageClock=0;invulnerable=0;fireDelay=0;
  player={x:0,y:0,z:size*.27,speed:0};
  scene=new T.Scene();
  const selectedTheme=['forest','desert','neon','ruins'].includes(custom.theme)?custom.theme:opts.theme;
  const bg=selectedTheme==='ruins'?0x101325:selectedTheme==='desert'?0x342837:selectedTheme==='forest'?0x0d2630:0x080e27;
  scene.background=new T.Color(bg);scene.fog=new T.Fog(bg,size*.7,size*2.1);
  renderer.setClearColor(bg);
  world=new T.Group();scene.add(world);
  camera=new T.PerspectiveCamera(58,16/9,.1,250);camera.position.set(0,size*.8,size*.42);camera.lookAt(0,0,0);scene.add(camera);
  scene.add(new T.HemisphereLight(0xb0d8ff,0x16223c,2.1));
  const sun=new T.DirectionalLight(0xd4e7ff,2.2);sun.position.set(-12,30,6);scene.add(sun);
  mats={ground:mat(0x0a1430),hero:mat(0x59e5df,0x1a7775),playerWing:mat(0x2b75ad),enemy:mat(0xe26886),enemyWing:mat(0x933456),
   boss:mat(0xcf9dea,0x5d297b),bossWing:mat(0x7c429a),glass:mat(0x1f344b),engine:mat(0x74e9f2,0x44b6f2),
   shot:mat(0x8ffff1,0x55ebc9),hostile:mat(0xffa26f,0xe66b38),star:mat(0x526b9d),power:mat(0xf4dd81,0xccab3f),line:mat(0x263e64)};
  geos={body:geometry(new T.BoxGeometry(.76,.34,1.7)),wing:geometry(new T.BoxGeometry(3,.16,.6)),
   nose:geometry(new T.ConeGeometry(.39,1.1,5)),canopy:geometry(new T.BoxGeometry(.43,.18,.78)),
   thruster:geometry(new T.CylinderGeometry(.15,.2,.45,6)),pod:geometry(new T.BoxGeometry(.34,.2,.75)),
   shot:geometry(new T.SphereGeometry(.18,6,5)),hostile:geometry(new T.OctahedronGeometry(.25)),
   power:geometry(new T.OctahedronGeometry(.48)),star:geometry(new T.OctahedronGeometry(.075)),
   ground:geometry(new T.BoxGeometry(size,.4,size*1.25)),line:geometry(new T.BoxGeometry(.1,.02,size*1.24))};
  makeMesh(geos.ground,mats.ground,world,0,-.35,0);
  for(let i=-4;i<=4;i++)makeMesh(geos.line,mats.line,world,i*size/9,-.12,0);
  const rng=R.rng((Number(opts.seed)||12345)+stage*501);
  // Um lote instanciado substitui 65–110 meshes independentes no WebGL.
  // O renderizador CPU ainda recebe meshes comuns porque nao processa instancias.
  const starCount=software?35:opts.quality==='high'?110:65;
  if(!software&&typeof T.InstancedMesh==='function'){
   starField=new T.InstancedMesh(geos.star,mats.star,starCount);
   starField.frustumCulled=false;
   starTransform=new T.Object3D();
   for(let i=0;i<starCount;i++){
    const s={x:(rng()-.5)*size,z:(rng()-.5)*size*1.15,speed:1+rng()*3};
    stars.push(s);
    starTransform.position.set(s.x,.02,s.z);starTransform.updateMatrix();
    starField.setMatrixAt(i,starTransform.matrix);
   }
   starField.instanceMatrix.needsUpdate=true;world.add(starField);
  }else{
   for(let i=0;i<starCount;i++){
    const o=makeMesh(geos.star,mats.star,world,(rng()-.5)*size,.02,(rng()-.5)*size*1.15);
    stars.push({mesh:o,speed:1+rng()*3});
   }
  }
  drawImports();
  ship=starfighter('player');ship.position.set(player.x,.25,player.z);
  const c=Number(custom.waves),w=Number.isFinite(c)&&c>0?Math.round(c):3+Math.floor(stage/2);
  waveMax=R.clamp(w,2,6);
  spawnWave();
  resize();
  updateHud();
  notice(stages[stage]+' · '+waveMax+' ondas e chefe!',3);
 }
 function spawnEnemy(i,count,boss=false){
  const center=(count-1)/2;
  const x=boss?0:R.clamp((i-center)*3.1,-size*.37,size*.37);
  const z=boss?-size*.25:-size*.39-(i%3)*1.25;
  const mesh=starfighter('enemy',boss);mesh.position.set(x,.2,z);
  const hp=boss?Math.ceil((20+stage*7)*tuning.bossMultiplier):Math.ceil((2+stage*.5+wave*.34)*Math.sqrt(tuning.difficulty));
  enemies.push({mesh,x,z,hp,maxHp:hp,boss,phase:i*.9,shotTimer:boss?.8:1.25+(i%4)*.48,speed:boss?1.3:(2.5+stage*.28)*tuning.difficulty});
 }
 function spawnWave(){
  wave++;
  const count=R.clamp(Math.round((4+wave+stage*1.1)*tuning.enemyMultiplier),3,14);
  for(let i=0;i<count;i++)spawnEnemy(i,count);
  notice('Onda '+wave+'/'+waveMax+' · '+count+' inimigos',2);
 }
 function spawnBoss(){
  bossSpawned=true;spawnEnemy(0,1,true);
  notice('CHEFE · 3 fases de batalha!',3);
 }
 function projectile(x,z,hostile,dx=0,dz=-1){
  if(hostile&&hostileShots.length>=70)return;
  const obj=makeMesh(hostile?geos.hostile:geos.shot,hostile?mats.hostile:mats.shot,world,x,.83,z);
  (hostile?hostileShots:shots).push({mesh:obj,x,z,dx,dz,life:hostile?3.8:2.5,dead:false});
 }
 function playerShoot(){
  if(fireDelay>0)return;
  fireDelay=(weapon===3?.15:.21)/tuning.fireRateMultiplier;
  const offsets=weapon===1?[0]:weapon===2?[-.28,.28]:[-.5,0,.5];
  for(const x of offsets)projectile(player.x+x,player.z-1.12,false,x*.14,-1);
 }
 function damage(n){
  if(state!=='play'||invulnerable>0)return;
  health=Math.max(0,health-n);invulnerable=.82;
  notice('Dano recebido · vida '+health,1.1);
  if(health<=0){state='defeat';$('overlay-title').textContent='Sua nave foi destruída';$('overlay-sub').textContent='Pontos: '+score+' · Tente novamente.';$('start').textContent='Recomeçar';$('overlay').classList.remove('hidden');}
 }
 function reward(enemy){
  score+=enemy.boss?900:75;kills++;
  if(enemy.boss||kills%4===0){
   const mesh=makeMesh(geos.power,mats.power,world,enemy.x,.78,enemy.z);
   drops.push({mesh,x:enemy.x,z:enemy.z,life:9});
  }
 }
 function updateProjectiles(dt){
  for(const b of shots){
   const steps=2;
   for(let sub=0;sub<steps&&!b.dead;sub++){
    b.x+=b.dx*26*dt/steps;b.z+=b.dz*26*dt/steps;
    for(const e of enemies){
     if(e.hp<=0)continue;
     const radius=e.boss?1.8:.83;
     if((b.x-e.x)**2+(b.z-e.z)**2<radius*radius){
      e.hp-=1;b.dead=true;
      if(e.hp<=0){reward(e);world.remove(e.mesh);}
      break;
     }
    }
   }
   b.life-=dt;b.mesh.position.x=b.x;b.mesh.position.z=b.z;
   if(b.life<=0||b.z<-size*.55)b.dead=true;
  }
  shots=shots.filter(b=>{if(b.dead)world.remove(b.mesh);return !b.dead;});
  enemies=enemies.filter(e=>e.hp>0);
  for(const b of hostileShots){
   b.x+=b.dx*9*dt;b.z+=b.dz*9*dt;b.life-=dt;
   b.mesh.position.x=b.x;b.mesh.position.z=b.z;
   if((b.x-player.x)**2+(b.z-player.z)**2<.68**2){b.dead=true;damage(8+(stage>4?4:0));}
   if(b.life<=0||Math.abs(b.x)>size*.55||b.z>size*.52)b.dead=true;
  }
  hostileShots=hostileShots.filter(b=>{if(b.dead)world.remove(b.mesh);return !b.dead;});
 }
 function updateEnemies(dt){
  for(const e of enemies){
   e.phase+=dt;
   e.z+=e.speed*dt;
   if(e.boss){
    e.x=Math.sin(e.phase*.75)*size*.19;
    const phase=e.hp>e.maxHp*.66?1:e.hp>e.maxHp*.33?2:3;
    if(phase!==bossPhase){bossPhase=phase;notice('Chefe · transformação '+phase+'/3',2);}
   }else e.x+=Math.sin(e.phase*2.3)*dt*.9;
   e.mesh.position.set(e.x,.23+Math.sin(e.phase*3)*.09,e.z);
   e.mesh.rotation.z=Math.sin(e.phase*2.1)*.1;
   if(e.z>size*.44){
    e.hp=0;world.remove(e.mesh);damage(e.boss?22:14);continue;
   }
   if(Math.abs(player.x-e.x)<(e.boss?1.6:.85)&&Math.abs(player.z-e.z)<(e.boss?1.5:.8)){e.hp=0;world.remove(e.mesh);damage(e.boss?24:18);}
   e.shotTimer-=dt;
   if(e.shotTimer<=0){
    e.shotTimer=e.boss?(.95-(bossPhase-1)*.16):(1.7+(e.phase%3)*.3);
    if(e.z<player.z+1){
     const dx=player.x-e.x,dz=player.z-e.z,mag=Math.max(1,Math.hypot(dx,dz));
     projectile(e.x,e.z+1.1,true,dx/mag,dz/mag);
     if(e.boss&&bossPhase>=2){
      for(const side of [-1,1])projectile(e.x+side*.45,e.z+1,true,R.clamp(dx/mag+side*.22,-.8,.8),Math.max(.55,dz/mag));
     }
     if(e.boss&&bossPhase===3)projectile(e.x,e.z+1,true,0,1);
    }
   }
  }
  enemies=enemies.filter(e=>e.hp>0);
 }
 function updateDrops(dt){
  for(const d of drops){
   d.z+=dt*5.6;d.life-=dt;d.mesh.position.z=d.z;d.mesh.rotation.y+=dt*2;
   if((d.x-player.x)**2+(d.z-player.z)**2<1.3){
    d.life=0;weapon=Math.min(3,weapon+1);health=Math.min(100,health+12);score+=90;
    notice('Power-up! Arma nível '+weapon+' · +12 vida',2);
   }
  }
  drops=drops.filter(d=>{if(d.life<=0||d.z>size*.53){world.remove(d.mesh);return false;}return true;});
 }
 function updateStage(dt){
  const x=(down('d','ArrowRight','right')?1:0)-(down('a','ArrowLeft','left')?1:0);
  const z=(down('s','ArrowDown','down')?1:0)-(down('w','ArrowUp','up')?1:0);
  const mag=Math.max(1,Math.hypot(x,z)),speed=11*tuning.playerSpeedMultiplier;
  player.x=R.clamp(player.x+x/mag*dt*speed,-limitX,limitX);
  player.z=R.clamp(player.z+z/mag*dt*speed,-limitZ,limitZ);
  player.speed=Math.hypot(x,z)*speed/mag;
  ship.position.set(player.x,.23+Math.sin(clock*3)*.04,player.z);
  ship.rotation.z=-x*.1;ship.rotation.x=-z*.09;
  ship.visible=invulnerable<=0||Math.floor(invulnerable*14)%2===0;
  if(down(' ','Enter','fire')||pendingPointer)playerShoot();
  updateEnemies(dt);updateProjectiles(dt);updateDrops(dt);
  if(starField){
   for(let i=0;i<stars.length;i++){
    const s=stars[i];s.z+=dt*s.speed*2.5;
    if(s.z>size*.53)s.z=-size*.53;
    starTransform.position.set(s.x,.02,s.z);starTransform.updateMatrix();
    starField.setMatrixAt(i,starTransform.matrix);
   }
   starField.instanceMatrix.needsUpdate=true;
  }else{
   for(const s of stars){s.mesh.position.z+=dt*s.speed*2.5;if(s.mesh.position.z>size*.53)s.mesh.position.z=-size*.53;}
  }
  if(enemies.length===0){
   waveTimer+=dt;
   if(waveTimer>=1.2){
    waveTimer=0;
    if(wave<waveMax)spawnWave();
    else if(!bossSpawned&&configAt(stage).boss!=='no'&&spec.shooterOptions?.boss!==false)spawnBoss();
    else{stageTransition=1.6;score+=500;notice('Fase concluída! Próxima missão…',1.6);}
   }
  }else waveTimer=0;
 }
 function down(...values){return values.some(k=>keys.has(k)||touch[k]);}
 function updateHud(){
  $('health').textContent=Math.ceil(health);$('score').textContent=score;$('ammo').textContent='⚡'+weapon;
  $('level').textContent=(stage+1)+'/'+stages.length;$('timer').textContent=Math.floor(clock)+'s';
  $('mission').textContent=(configAt(stage).objective?String(configAt(stage).objective).slice(0,90)+' · ':'')+
   (bossSpawned?'Chefe fase '+bossPhase+'/3 · HP '+(enemies.find(x=>x.boss)?.hp||0):'Onda '+wave+'/'+waveMax+' · '+enemies.length+' inimigos');
 }
 function resize(){
  const rect=canvas.getBoundingClientRect(),w=Math.max(320,Math.round(rect.width||960)),h=Math.round(w*9/16);
  renderer.setPixelRatio(pixelRatio);renderer.setSize(w,h,false);
  if(camera){camera.aspect=w/h;camera.updateProjectionMatrix();}
 }
 function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.035,Math.max(0,(now-(last||now))/1000));last=now;frames++;
  if(state==='play'&&!paused){
   clock+=dt;stageClock+=dt;invulnerable=Math.max(0,invulnerable-dt);
   fireDelay=Math.max(0,fireDelay-dt);
   if(stageTransition>0){
    stageTransition-=dt;
    if(stageTransition<=0){
     if(stage+1===stages.length){state='victory';$('overlay-title').textContent='Campanha concluída!';$('overlay-sub').textContent='Pontos: '+score+' · '+stages.length+' fases.';$('start').textContent='Jogar novamente';$('overlay').classList.remove('hidden');}
     else{stage++;health=Math.min(100,health+20);setUpStage();}
    }
   }else updateStage(dt);
   updateHud();
  }
  if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('message').style.opacity='0';}
  if(scene&&(!software||now-lastDraw>=1000/30)){renderer.render(scene,camera);lastDraw=now;}
 }
 function start(){
  stage=0;health=100;score=0;weapon=1;kills=0;clock=0;paused=false;state='play';release();setUpStage();
  $('overlay').classList.add('hidden');$('pause').textContent='Pausar';canvas.focus();
 }
 function togglePause(){
  if(state!=='play')return;
  paused=!paused;release();$('pause').textContent=paused?'Continuar':'Pausar';
  if(paused){$('overlay-title').textContent='Jogo pausado';$('overlay-sub').textContent='Sua nave aguarda o comando.';$('start').textContent='Continuar';$('overlay').classList.remove('hidden');}
  else{$('overlay').classList.add('hidden');canvas.focus();}
 }
 const telemetry=()=>{
  playerPosition.set(player.x,.8,player.z);playerPosition.project(camera);
  return {dimension:'3d',genre:'shooter',state,paused,frames,stage:stage+1,stages:stages.length,clock,health,score,
    enemies:enemies.length,playerBullets:shots.length,enemyBullets:hostileShots.length,powerups:drops.length,
    wave,waveMax,bossSpawned,bossPhase,weapon,kills,
    starCount:stars.length,starDrawBatches:starField?1:stars.length,
    render:{mode:renderer.mode||'webgl',triangles:renderer.info.render.triangles||0,pixelRatio,drawCalls:renderer.info.render.calls,geometries:renderer.info.memory.geometries},
    player:{x:player.x*100,y:player.z*100,z:0,angle:0,screenX:(playerPosition.x*.5+.5)*canvas.width,screenY:(-.5*playerPosition.y+.5)*canvas.height,radius:24}};
 };
 window.__gameforgeTelemetry=telemetry;
 $('control-help').textContent='WASD / setas: pilotar · Espaço/clique: disparar · P: pausa';
 $('overlay-sub').textContent='Combata ondas de naves 3D, supere chefes em três fases e recolha melhorias para armas e energia.';
 if(importErrors.length)$('overlay-sub').textContent+=' GLB incompatível: '+importErrors[0].slice(0,140);
 if(software)$('overlay-sub').textContent+=' · Modo de compatibilidade CPU ativado.';
 $('start').addEventListener('click',()=>{if(paused)togglePause();else start();});
 $('restart').addEventListener('click',start);$('pause').addEventListener('click',togglePause);
 addEventListener('keydown',e=>{
  const k=e.key.length===1?e.key.toLowerCase():e.key;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d'].includes(k))e.preventDefault();
  if((k==='p'||k==='Escape')&&!e.repeat)togglePause();
  keys.add(k);
 });
 addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
 addEventListener('blur',()=>{release();if(state==='play'&&!paused)togglePause();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){release();if(state==='play'&&!paused)togglePause();}});
 canvas.addEventListener('pointerdown',e=>{if(state!=='play'||paused)return;pendingPointer=true;canvas.setPointerCapture?.(e.pointerId);canvas.focus();});
 canvas.addEventListener('pointerup',()=>pendingPointer=false);
 canvas.addEventListener('pointercancel',release);
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 document.querySelectorAll('[data-control]').forEach(button=>{
  const k=button.dataset.control;
  button.addEventListener('pointerdown',e=>{e.preventDefault();touch[k]=true;button.setPointerCapture?.(e.pointerId);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>touch[k]=false);
 });
 addEventListener('resize',resize);
 setUpStage();state='menu';requestAnimationFrame(frame);
}
if(typeof module!=='undefined')module.exports=gameForgeShooter3DBoot;
if(typeof globalThis!=='undefined')globalThis.gameForgeShooter3DBoot=gameForgeShooter3DBoot;
