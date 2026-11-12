/* Standalone browser runtime: serialized alongside bundled THREE + gameForgeWorldRules. */
function gameForgeThreeBoot(){
 'use strict';
 const spec=GAME_SPEC, T=THREE, R=gameForgeWorldRules();
 const $=id=>document.getElementById(id),canvas=$('game');
 const tuning={difficulty:1,enemyMultiplier:1,bossMultiplier:1,playerSpeedMultiplier:1,fireRateMultiplier:1,particlesMultiplier:1,...spec.tuning};
 for(const k of Object.keys(tuning))tuning[k]=R.clamp(Number(tuning[k])||1,.25,4);
 const opts={theme:'forest',size:48,quality:'auto',seed:12345,...spec.worldOptions};
 const size=R.clamp(Number(opts.size)||48,32,88),genre=['arena','fps','racing','platform'].includes(spec.genre)?spec.genre:'arena';
 const stages=(spec.stages&&spec.stages.length?spec.stages:['Primeira jornada']).slice(0,30);
 const stageConfig=Array.isArray(spec.stageConfig)?spec.stageConfig:[];
 const configAt=i=>{const c=stageConfig[i];return c&&typeof c==='object'&&!Array.isArray(c)?c:{};};
 const missionAt=i=>['eliminate','collect','survive'].includes(configAt(i).mission)?configAt(i).mission:'default';
 const themes={
  forest:{sky:0xabc8cb,fog:0xa1bdba,ground:0x476756,road:0x8a8064,grass:0x75935b,wood:0x674b35,stone:0x72827c,accent:0x64f2c3,enemy:0xd26c62},
  desert:{sky:0xe1c0a0,fog:0xd5b58d,ground:0xb78e5a,road:0x836647,grass:0xc6a462,wood:0x846144,stone:0xba8262,accent:0x5be6d3,enemy:0xbd5260},
  neon:{sky:0x111d3b,fog:0x16253d,ground:0x23304a,road:0x405271,grass:0x33446a,wood:0x484c76,stone:0x4f6388,accent:0x55f4de,enemy:0xff688d},
  ruins:{sky:0xadc2d0,fog:0x9eafb7,ground:0x65796f,road:0xa39980,grass:0x7d8d6b,wood:0x5d6655,stone:0x8a938d,accent:0x8aebdf,enemy:0xcc7467}
 };
 let palette=themes[opts.theme]||themes.forest;
 let renderer,software=false;
 try{renderer=new T.WebGLRenderer({canvas,antialias:opts.quality!=='low',alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});}
 catch(error){
  if(typeof gameForgeSoftwareRenderer==='function'){try{renderer=gameForgeSoftwareRenderer(T,canvas);software=true;}catch(fallbackError){renderer=null;}}
  if(!renderer){$('overlay-title').textContent='Renderização indisponível';$('overlay-sub').textContent='Não foi possível iniciar WebGL ou o modo compatível neste navegador.';$('start').disabled=true;return;}
 }
 renderer.outputColorSpace=T.SRGBColorSpace||renderer.outputColorSpace;
 renderer.setClearColor(palette.sky);renderer.shadowMap.enabled=!software&&opts.quality!=='low';renderer.shadowMap.type=T.PCFSoftShadowMap;
 let ratio=software?.8:Math.min(window.devicePixelRatio||1,opts.quality==='high'?1.8:opts.quality==='low'?1:1.4);
 let scene,camera,world,materials,geometries,bulletGeometry,solids=[],enemies=[],coins=[],bullets=[],platforms=[],traffic=[],gates=[],goal,hero;
 let stage=0,health=100,score=0,ammo=80,state='menu',paused=false,clock=0,stageClock=0,frames=0,last=0,noticeTime=0,invulnerable=0,fireDelay=0,reloadDelay=0,transition=0;
 let player={x:0,y:0,z:0,yaw:0,vy:0,speed:0,grounded:true},collected=0,required=0,race={next:0,lap:0,complete:false},checkpoint=0;
 let random=R.rng(opts.seed),raceRx=0,raceRz=0,lapTarget=2,frameCost=0,perfSamples=0;
 const keys=new Set(),touch={up:false,down:false,left:false,right:false,fire:false};
 let pointerDown=false,dragX=null,jumpHeld=false,lastDraw=-1000;
 const vec=new T.Vector3(),look=new T.Vector3(),camTarget=new T.Vector3();
 const combatGoal=()=>({enemies:enemies.length,collected,required,elapsed:stageClock,seconds:configAt(stage).seconds});
 const combatReady=()=>R.missionReady(missionAt(stage),combatGoal());
 function combatObjective(){
  const mode=missionAt(stage);
  if(mode==='survive')return 'Sobreviva '+Math.max(0,Math.ceil(R.clamp(Number(configAt(stage).seconds)||45,5,180)-stageClock))+'s · Alcance o portal';
  if(mode==='collect')return 'Colete os cristais '+collected+'/'+required+' · Portal';
  if(mode==='eliminate')return 'Elimine os '+enemies.length+' inimigos restantes · Portal';
  return enemies.length+' guardiões · Cristais '+collected+'/'+required;
 }
 const down=(...names)=>names.some(k=>keys.has(k)||touch[k]);
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const notice=(s,time=3)=>{$('message').textContent=s;$('message').style.opacity='1';noticeTime=time;};
 function material(color,emissive=0){const m=new T.MeshStandardMaterial({color,roughness:.88,metalness:0,flatShading:true,emissive,emissiveIntensity:emissive?.35:0});materials.push(m);return m;}
 function geometry(g){geometries.push(g);return g;}
 function box(w,h,d,mat,parent=world,x=0,y=0,z=0){const mesh=new T.Mesh(geometry(new T.BoxGeometry(w,h,d)),mat);mesh.position.set(x,y,z);mesh.castShadow=renderer.shadowMap.enabled;mesh.receiveShadow=true;if(parent===world&&w>size*.9&&d>size*.9&&h<=.65)mesh.renderOrder=-1000;if(parent===world&&h<.1&&(w>15||d>15))mesh.renderOrder=-900;parent.add(mesh);return mesh;}
 function mesh(g,mat,parent=world,x=0,y=0,z=0){const o=new T.Mesh(geometry(g),mat);o.position.set(x,y,z);o.castShadow=renderer.shadowMap.enabled;o.receiveShadow=true;parent.add(o);return o;}
 function disposeStage(){if(!scene)return;for(const g of geometries)g.dispose();for(const m of materials)m.dispose();scene.traverse(o=>{if(o.isLight&&o.shadow&&typeof o.shadow.dispose==='function')o.shadow.dispose();});scene.clear();renderer.renderLists.dispose();}
 function humanoid(color,boss=false){
  const g=new T.Group(),scale=boss?1.55:1,m=material(color),dark=material(0x23394b),skin=material(0xe8c39c),glow=material(palette.accent,palette.accent);
  const torso=box(.68,.85,.38,m,g,0,1.12,0);box(.72,.19,.43,dark,g,0,.74,0);
  mesh(new T.IcosahedronGeometry(.29,1),skin,g,0,1.83,0);box(.45,.13,.18,dark,g,0,1.86,.22);
  const limbs=[];
  for(const side of [-1,1]){const arm=new T.Group();arm.position.set(side*.48,1.48,0);g.add(arm);box(.22,.68,.24,m,arm,0,-.27,0);box(.23,.17,.27,skin,arm,0,-.67,.01);limbs.push(arm);}
  for(const side of [-1,1]){const leg=new T.Group();leg.position.set(side*.21,.73,0);g.add(leg);box(.26,.62,.28,dark,leg,0,-.3,0);box(.29,.18,.45,m,leg,0,-.64,.06);limbs.push(leg);}
  box(.22,.28,.12,glow,g,0,1.2,.23);g.scale.setScalar(scale);world.add(g);g.userData={limbs,torso};return g;
 }
 function animateActor(actor,speed,phase){const a=Math.sin(phase)*Math.min(.7,speed*.15);actor.userData.limbs.forEach((limb,i)=>limb.rotation.x=a*(i%2?1:-1));actor.position.y+=Math.abs(Math.sin(phase))*Math.min(.045,speed*.008);}
 function car(color){
  const g=new T.Group(),body=material(color),glass=material(0x20394d),rubber=material(0x202a35),light=material(0xffe3a0,0xffbb55);
  box(1.3,.44,2.3,body,g,0,.55,0);box(1.03,.48,1.18,glass,g,0,.96,-.12);box(1.08,.12,1.26,body,g,0,1.23,-.12);
  for(const x of [-.7,.7])for(const z of [-.75,.75]){const wheel=mesh(new T.CylinderGeometry(.3,.3,.21,8),rubber,g,x,.35,z);wheel.rotation.z=Math.PI/2;}
  for(const x of [-.43,.43])box(.29,.14,.05,light,g,x,.62,1.17);world.add(g);return g;
 }
 function coinAt(x,y,z){const o=mesh(new T.OctahedronGeometry(.38),mats.crystal,world,x,y,z);coins.push({x,y,z,mesh:o,taken:false});}
 function addTree(x,z,s=1){
  const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(s);world.add(g);
  if(opts.theme==='ruins'||opts.theme==='neon'){
   box(.65,2.8,.65,mats.stone,g,0,1.4,0);box(1.05,.28,1.05,mats.trim,g,0,2.85,0);if(opts.theme==='neon')box(.17,2.5,.72,mats.crystal,g,0,1.5,0);
  }else if(opts.theme==='desert'){
   box(.38,2.4,.38,mats.leaf,g,0,1.2,0);box(1.4,.3,.3,mats.leaf,g,.45,1.7,0);box(.3,1,.3,mats.leaf,g,1,2.05,0);
  }else{
   mesh(new T.CylinderGeometry(.16,.24,2.3,5),mats.wood,g,0,1.15,0);
   mesh(new T.ConeGeometry(1.25,2.6,6),mats.leaf,g,0,2.7,0);mesh(new T.ConeGeometry(.9,2.1,6),mats.leafLight,g,0,3.75,0);
  }
  return g;
 }
 let mats;
 function scenery(platform=false){
  const count=software?28:opts.quality==='low'?30:opts.quality==='high'?90:54;
  for(let i=0;i<count;i++){
   let x=(random()-.5)*size,z=(random()-.5)*size;
   if(platform){x=random()*(platforms.length*5.2+15)-8;z=(random()>.5?1:-1)*(7+random()*12);}
   else if(genre==='racing'){const t=random()*Math.PI*2,q=random()>.5?1.42:.57;x=Math.cos(t)*raceRx*q;z=Math.sin(t)*raceRz*q;}
   else if(Math.abs(x)<6||Math.abs(z)<5||distance({x,z},player)<5||enemies.some(e=>distance({x,z},e)<2.7))continue;
   if(i%3){const tree=addTree(x,z,.7+random()*.6);if(platform)tree.position.y=-4.7;if(!platform&&genre!=='racing')solids.push({x,z,w:1,d:1});}
   else{const rock=mesh(new T.DodecahedronGeometry(.8+random()*.8,0),mats.stone,world,x,.5,z);if(platform)rock.position.y=-4.2;rock.scale.y=.7;rock.rotation.y=random()*5;if(!platform&&genre!=='racing')solids.push({x,z,w:1.6,d:1.6});}
  }
 }
 function makeGate(x,z,index,yaw=0){
  const g=new T.Group();g.position.set(x,0,z);g.rotation.y=yaw;world.add(g);
  box(.25,3.1,.25,mats.trim,g,-3,1.55,0);box(.25,3.1,.25,mats.trim,g,3,1.55,0);box(6.4,.25,.25,mats.crystal,g,0,3.1,0);
  return {x,z,index,mesh:g};
 }
 function setGoal(x,y,z){const g=new T.Group();g.position.set(x,y,z);world.add(g);box(3,.25,3,mats.stone,g,0,.1,0);box(.35,3.8,.35,mats.trim,g,-1.25,1.9,0);box(.35,3.8,.35,mats.trim,g,1.25,1.9,0);box(2.85,.35,.35,mats.trim,g,0,3.75,0);const portal=box(2,3.1,.12,mats.portal,g,0,1.9,0);goal={x,y,z,mesh:g,portal};}
 function buildStage(){
  const stageRules=configAt(stage),requestedTheme=stageRules.theme;
  opts.theme=['forest','desert','neon','ruins'].includes(requestedTheme)?requestedTheme:(spec.worldOptions?.theme||'forest');
  palette=themes[opts.theme]||themes.forest;renderer.setClearColor(palette.sky);
  disposeStage();materials=[];geometries=[];solids=[];enemies=[];coins=[];bullets=[];platforms=[];traffic=[];gates=[];goal=null;
  scene=new T.Scene();scene.background=new T.Color(palette.sky);scene.fog=new T.Fog(palette.fog,genre==='fps'?16:35,genre==='platform'?105:size*1.7);
  world=new T.Group();scene.add(world);camera=new T.PerspectiveCamera(genre==='fps'?78:52,16/9,.1,260);scene.add(camera);
  const hemi=new T.HemisphereLight(opts.theme==='neon'?0xb7cdfd:0xf3f6e9,0x3b5148,2.2);scene.add(hemi);
  const sun=new T.DirectionalLight(0xffeccb,2.6);sun.position.set(-14,26,16);sun.castShadow=renderer.shadowMap.enabled;sun.shadow.mapSize.set(opts.quality==='high'?2048:1024,opts.quality==='high'?2048:1024);sun.shadow.camera.left=-30;sun.shadow.camera.right=30;sun.shadow.camera.top=30;sun.shadow.camera.bottom=-30;sun.shadow.camera.far=90;sun.shadow.normalBias=.05;scene.add(sun);scene.add(sun.target);
  mats={ground:material(palette.ground),road:material(palette.road),leaf:material(palette.grass),leafLight:material(palette.grass+0x081008),wood:material(palette.wood),stone:material(palette.stone),trim:material(0x2e4950),crystal:material(palette.accent,palette.accent),portal:material(0x8b5867,0x5e354a),gold:material(0xf8cf77,0x755521)};
  bulletGeometry=geometry(new T.SphereGeometry(.12,6,4));
  random=R.rng((Number(opts.seed)||12345)+stage*907);collected=0;stageClock=0;invulnerable=0;fireDelay=0;reloadDelay=0;transition=0;jumpHeld=false;checkpoint=0;
  if(genre==='platform'){
   platforms=R.platformRoute(Number(opts.seed)||12345,stage,size);
   for(let i=0;i<platforms.length;i++){const p=platforms[i];box(p.w,.8,p.d,mats.stone,world,p.x,p.y-.4,p.z);box(p.w+.05,.08,p.d+.05,mats.leaf,world,p.x,p.y+.015,p.z);if(i>0)coinAt(p.x,p.y+1,p.z);if(i%3===1){box(.15,2,.15,mats.wood,world,p.x-1.7,p.y+1,p.z-1.7);mesh(new T.OctahedronGeometry(.22),mats.crystal,world,p.x-1.7,p.y+2,p.z-1.7);}}
   player={x:0,y:0,z:0,yaw:Math.PI/2,vy:0,speed:0,grounded:true};required=Math.ceil(coins.length*.7);const end=platforms[platforms.length-1];setGoal(end.x,end.y,end.z);
   box(platforms.length*5.2+30,.6,46,mats.ground,world,platforms.length*2.6,-5,0);scenery(true);
  }else if(genre==='racing'){
   raceRx=size*.34;raceRz=size*.28;race={next:0,lap:0,complete:false};lapTarget=Number.isInteger(stageRules.laps)&&stageRules.laps>0?R.clamp(stageRules.laps,1,8):2+(stage>8?1:0);required=lapTarget;
   box(size*1.8,.4,size*1.8,mats.ground,world,0,-.25,0);
   const {positions,indices}=R.trackRibbon(raceRx,raceRz,7.4,80);
   const road=geometry(new T.BufferGeometry());road.setAttribute('position',new T.Float32BufferAttribute(positions,3));road.setIndex(indices);road.computeVertexNormals();const roadmesh=new T.Mesh(road,mats.road);roadmesh.receiveShadow=true;roadmesh.renderOrder=-900;world.add(roadmesh);
   for(let i=0;i<48;i++){const a=i/48*Math.PI*2,x=Math.cos(a)*raceRx,z=Math.sin(a)*raceRz;const stripe=box(.12,.035,.8,i%6===0?mats.crystal:mats.gold,world,x,.06,z);stripe.rotation.y=-a;for(const side of [-1,1]){const rail=box(.3,.35,1.5,mats.trim,world,Math.cos(a)*(raceRx+side*3.9),.18,Math.sin(a)*(raceRz+side*3.9));rail.rotation.y=-a;}}
   for(let i=0;i<8;i++){const a=-Math.PI/2+(i+1)/8*Math.PI*2;gates.push(makeGate(Math.cos(a)*raceRx,Math.sin(a)*raceRz,i,-a));}
   player={x:0,y:0,z:-raceRz,yaw:Math.PI/2,vy:0,speed:0,grounded:true};hero=car(0x5ce4c5);
   for(let i=0;i<Math.min(12,stageRules.enemies>0?stageRules.enemies:4+Math.ceil(stage*.3*tuning.enemyMultiplier));i++){const a=-Math.PI/2+.6+i*.66,o=car([0xd67568,0xdfb655,0x6a9bc6][i%3]);traffic.push({a,speed:.16+(i%3)*.025,x:Math.cos(a)*raceRx,z:Math.sin(a)*raceRz,mesh:o,lane:i%2?1.6:-1.6});}
   scenery();
  }else{
   player={x:0,y:0,z:size*.28,yaw:Math.PI,vy:0,speed:0,grounded:true};required=3;
   box(size,.6,size,mats.ground,world,0,-.35,0);box(5,.035,size*.8,mats.road,world,0,.01,0);box(size*.8,.04,4,mats.road,world,0,.015,0);
   for(let i=0;i<4;i++){const side=i<2?-1:1;box(2,1.8,2,mats.stone,world,side*(8+(i%2)*5),.9,(i%2?1:-1)*7);solids.push({x:side*(8+(i%2)*5),z:(i%2?1:-1)*7,w:2,d:2});}
   const count=stageRules.enemies>0?R.clamp(stageRules.enemies,1,24):Math.min(22,Math.max(3,Math.round((4+stage*.6)*tuning.enemyMultiplier*tuning.difficulty)));
   for(let i=0;i<count;i++){
    const a=(i/count)*Math.PI*2,x=Math.sin(a)*size*.26,z=Math.cos(a)*size*.24-4,boss=i===count-1&&(stageRules.boss==='yes'||(stageRules.boss!=='no'&&!!(spec.features&&spec.features.bosses)));
    const actor=humanoid(boss?0x91637f:palette.enemy,boss);actor.position.set(x,0,z);
    enemies.push({x,z,y:0,hp:Math.ceil((boss?8*tuning.bossMultiplier:2+Math.floor(stage/7))*Math.sqrt(tuning.difficulty)),boss,speed:(boss?1.4:1.75+Math.min(stage,15)*.065)*Math.sqrt(tuning.difficulty),phase:random()*6,mesh:actor});
   }
   for(const c of [{x:-size*.22,z:0},{x:size*.22,z:-2},{x:0,z:-size*.24}])coinAt(c.x,1,c.z);
   setGoal(0,0,-size*.37);scenery();
   for(const sign of [-1,1])for(let i=0;i<7;i++){const x=sign*(size/2-.6),z=(i-3)*size/7;box(.6,1.2,size/7-.2,mats.stone,world,x,.6,z);}
   if(genre==='fps'){
    const gun=new T.Group();box(.16,.2,.75,mats.trim,gun,.36,-.28,-.7);box(.12,.13,.55,mats.crystal,gun,.36,-.26,-1.07);camera.add(gun);
    const sightMaterial=new T.MeshBasicMaterial({color:0xffffff,depthTest:false,depthWrite:false});materials.push(sightMaterial);const sight=new T.Mesh(geometry(new T.RingGeometry(.003,.005,12)),sightMaterial);sight.position.z=-.5;sight.renderOrder=1000;camera.add(sight);
   }
  }
  if(genre!=='racing')hero=humanoid(0x508da2);
  hero.visible=genre!=='fps';hero.position.set(player.x,player.y,player.z);
  if(genre==='fps')camera.position.set(player.x,1.65,player.z);else if(genre==='platform')camera.position.set(player.x+3,player.y+10,player.z+17);else camera.position.set(player.x,15,player.z+13);
  updateCamera(1);updateHUD();resize();notice(stages[stage]+' · '+(genre==='racing'?'Siga os portais verdes em ordem':genre==='platform'?'Colete os cristais e encontre o portal':combatObjective()),5);
 }
 function start(){stage=0;health=100;score=0;ammo=80;clock=0;state='play';paused=false;keys.clear();Object.keys(touch).forEach(k=>touch[k]=false);pointerDown=false;buildStage();$('overlay').classList.add('hidden');$('pause').textContent='Pausar';canvas.focus();}
 function overlay(title,text,button){$('overlay-title').textContent=title;$('overlay-sub').textContent=text;$('start').textContent=button;$('overlay').classList.remove('hidden');}
 function damage(amount){if(invulnerable>0||state!=='play')return;health=Math.max(0,health-amount);invulnerable=.9;notice('Dano recebido · '+health+' de vida',1.2);if(health<=0){state='defeat';overlay('Fim de jogo','Pontuação: '+score+' · Reinicie a jornada.','Tentar novamente');}}
 function finishStage(){if(transition>0||state!=='play')return;score+=300;transition=1.4;notice('Objetivo concluído! Próxima fase…',1.4);}
 function advance(){if(stage+1>=stages.length){state='victory';overlay('Jornada concluída!','Todas as '+stages.length+' fases concluídas · Pontuação '+score,'Jogar novamente');}else{stage++;health=Math.min(100,health+25);ammo=Math.max(80,ammo+40);buildStage();}}
 function togglePause(){if(state!=='play')return;paused=!paused;keys.clear();pointerDown=false;Object.keys(touch).forEach(k=>touch[k]=false);$('pause').textContent=paused?'Continuar':'Pausar';if(paused)overlay('Jogo pausado','Sua jornada continua daqui.','Continuar');else{$('overlay').classList.add('hidden');canvas.focus();}}
 function axes(){return {x:(down('d','ArrowRight','right')?1:0)-(down('a','ArrowLeft','left')?1:0),z:(down('s','ArrowDown','down')?1:0)-(down('w','ArrowUp','up')?1:0)};}
 function move(dx,dz){const p=R.moveCircle(player,dx,dz,.4,solids,size);player.x=p.x;player.z=p.z;}
 function shoot(){
  if(fireDelay>0||ammo<=0)return;fireDelay=.23/tuning.fireRateMultiplier;ammo--;if(ammo===0){reloadDelay=1.3;notice('Recarregando…',1.3);}
  let dx=Math.sin(player.yaw),dz=Math.cos(player.yaw);
  if(genre==='arena'){
   let nearest=null,near=18;for(const e of enemies){const d=distance(e,player);if(d<near){near=d;nearest=e;}}if(nearest){dx=(nearest.x-player.x)/near;dz=(nearest.z-player.z)/near;player.yaw=Math.atan2(dx,dz);}
  }
  const o=new T.Mesh(bulletGeometry,mats.gold);o.position.set(player.x+dx*.6,player.y+1.2,player.z+dz*.6);world.add(o);
  bullets.push({x:o.position.x,y:o.position.y,z:o.position.z,dx,dz,life:1.8,mesh:o});
 }
 function updateCombat(dt){
  const a=axes(),mag=Math.max(1,Math.hypot(a.x,a.z)),speed=6*tuning.playerSpeedMultiplier;
  let dx=a.x/mag,dz=a.z/mag;
  if(genre==='fps'){
   player.yaw+=((down('q')?1:0)-(down('e')?1:0))*2.2*dt;
   const yaw=player.yaw;
   // Forward points along the camera heading; local strafe follows camera right.
   dx=(-a.z*Math.sin(yaw)-a.x*Math.cos(yaw))/mag;dz=(-a.z*Math.cos(yaw)+a.x*Math.sin(yaw))/mag;
  }else if(a.x||a.z)player.yaw=Math.atan2(dx,dz);
  move(dx*speed*dt,dz*speed*dt);player.speed=Math.hypot(dx,dz)*speed;
  if(down(' ','Enter','fire')||pointerDown)shoot();
  for(const e of enemies){
   const d=Math.max(.01,distance(e,player)),m=R.moveCircle(e,(player.x-e.x)/d*e.speed*dt,(player.z-e.z)/d*e.speed*dt,e.boss?.65:.38,solids,size);e.x=m.x;e.z=m.z;e.mesh.position.set(e.x,0,e.z);e.mesh.rotation.y=Math.atan2(player.x-e.x,player.z-e.z);e.phase+=dt*6;animateActor(e.mesh,e.speed,e.phase);
   if(d<(e.boss?1.5:1))damage(e.boss?18:10);
  }
  for(const b of bullets){
   const steps=Math.ceil(27*dt/.28);for(let i=0;i<steps&&!b.dead;i++){
    b.x+=b.dx*27*dt/steps;b.z+=b.dz*27*dt/steps;
    if(solids.some(o=>Math.abs(b.x-o.x)<o.w/2+.1&&Math.abs(b.z-o.z)<o.d/2+.1)){b.dead=true;break;}
    for(const e of enemies)if(e.hp>0&&distance(e,b)<(e.boss?.95:.65)){e.hp--;b.dead=true;if(e.hp<=0){score+=e.boss?250:70;world.remove(e.mesh);ammo+=7;}break;}
   }
   b.life-=dt;if(b.life<=0)b.dead=true;b.mesh.position.set(b.x,b.y,b.z);
  }
  enemies=enemies.filter(e=>e.hp>0);bullets=bullets.filter(b=>{if(b.dead){world.remove(b.mesh);return false;}return true;});
  collect();const ready=combatReady();goal.portal.material=ready?mats.crystal:mats.portal;if(ready&&distance(player,goal)<2)finishStage();
 }
 function collect(){for(const c of coins)if(!c.taken&&distance(c,player)<1.2&&Math.abs(player.y+.9-c.y)<1.6){c.taken=true;c.mesh.visible=false;collected++;score+=80;health=Math.min(100,health+8);notice('Cristal '+collected+' / '+required,1.5);}}
 function updatePlatform(dt){
  const a=axes();a.z=(down('s','ArrowDown','down')?1:0)-(down('q')?1:0);const mag=Math.max(1,Math.hypot(a.x,a.z)),speed=6.5*tuning.playerSpeedMultiplier;
  const jump=down(' ','w','ArrowUp','up','fire')||pointerDown;
  if(jump&&!jumpHeld&&player.grounded){player.vy=9;player.grounded=false;}jumpHeld=jump;
  const oldY=player.y;player.x+=a.x/mag*speed*dt;player.z+=a.z/mag*speed*dt;player.vy-=20*dt;player.y+=player.vy*dt;player.grounded=false;player.speed=Math.hypot(a.x,a.z)*speed;
  if(a.x||a.z)player.yaw=Math.atan2(a.x,a.z);
  for(let i=0;i<platforms.length;i++){const p=platforms[i];if(player.vy<=0&&oldY>=p.y-.05&&player.y<=p.y&&Math.abs(player.x-p.x)<p.w/2+.3&&Math.abs(player.z-p.z)<p.d/2+.3){player.y=p.y;player.vy=0;player.grounded=true;checkpoint=Math.max(checkpoint,i);}}
  if(player.y<-3.5){damage(20);const p=platforms[checkpoint];player.x=p.x;player.z=p.z;player.y=p.y;player.vy=0;player.grounded=true;}
  collect();const ready=R.goalReady('platform',{collected,required});goal.portal.material=ready?mats.crystal:mats.portal;if(ready&&distance(player,goal)<1.7&&Math.abs(player.y-goal.y)<1)finishStage();
 }
 function updateRacing(dt){
  const a=axes(),accelerate=down('w','ArrowUp','up'),brake=down('s','ArrowDown','down'),boost=down(' ','fire')||pointerDown;
  const target=(brake?-5:accelerate?boost?18:13:7)*tuning.playerSpeedMultiplier;
  player.speed+=(target-player.speed)*Math.min(1,dt*2.1);player.yaw-=a.x*dt*(1.7+Math.abs(player.speed)*.018)*(player.speed<0?-1:1);
  player.x+=Math.sin(player.yaw)*player.speed*dt;player.z+=Math.cos(player.yaw)*player.speed*dt;
  const aTrack=Math.atan2(player.z/raceRz,player.x/raceRx),cx=Math.cos(aTrack)*raceRx,cz=Math.sin(aTrack)*raceRz,off=Math.hypot(player.x-cx,player.z-cz);
  if(off>3.25){const nx=(player.x-cx)/off,nz=(player.z-cz)/off;player.x=cx+nx*3.25;player.z=cz+nz*3.25;player.speed*=.72;if(Math.abs(player.speed)>4)damage(5);}
  for(const t of traffic){t.a+=t.speed*dt;t.x=Math.cos(t.a)*(raceRx+t.lane);t.z=Math.sin(t.a)*(raceRz+t.lane);t.mesh.position.set(t.x,0,t.z);t.mesh.rotation.y=Math.atan2(-Math.sin(t.a)*raceRx,Math.cos(t.a)*raceRz);if(distance(player,t)<1.65){damage(12);player.speed*=-.18;const d=Math.max(.1,distance(player,t));player.x+=(player.x-t.x)/d*.7;player.z+=(player.z-t.z)/d*.7;}}
  const gate=gates[race.next];if(distance(player,gate)<3.2){race=R.raceProgress(race,gate.index,gates.length,lapTarget);score+=35;notice(race.complete?'Corrida concluída!':race.next===0?'Volta '+race.lap+' concluída':'Checkpoint '+race.next+' / '+gates.length,1.4);}
  gates.forEach((g,i)=>g.mesh.visible=i===race.next||i===(race.next+1)%gates.length);
  if(R.goalReady('racing',race))finishStage();
 }
 function updateCamera(dt){
  if(genre==='fps'){
   camera.position.set(player.x,player.y+1.65,player.z);camera.lookAt(player.x+Math.sin(player.yaw)*10,player.y+1.55,player.z+Math.cos(player.yaw)*10);return;
  }
  if(genre==='platform'){camTarget.set(player.x+2,player.y+9,player.z+16);look.set(player.x+2,player.y+.7,0);}
  else if(genre==='racing'){camTarget.set(player.x-Math.sin(player.yaw)*8,7,player.z-Math.cos(player.yaw)*8);look.set(player.x+Math.sin(player.yaw)*4,1,player.z+Math.cos(player.yaw)*4);}
  else{camTarget.set(player.x,15,player.z+13);look.set(player.x,0.7,player.z-1.8);}
  camera.position.lerp(camTarget,Math.min(1,dt*7));camera.lookAt(look);
 }
 function updateHUD(){
  $('health').textContent=Math.ceil(health);$('score').textContent=score;$('ammo').textContent=genre==='racing'?Math.round(Math.abs(player.speed)*12)+' km/h':genre==='platform'?collected+'/'+required:ammo;
  $('level').textContent=(stage+1)+'/'+stages.length;$('timer').textContent=Math.floor(clock)+'s';
  $('mission').textContent=(configAt(stage).objective?String(configAt(stage).objective).slice(0,140)+' · ':'')+(genre==='racing'?'Volta '+Math.min(lapTarget,race.lap+1)+'/'+lapTarget+' · Portal '+(race.next+1)+'/8':genre==='platform'?'Cristais '+collected+'/'+required+' · Alcance o portal':combatObjective());
 }
 function resize(){const rect=canvas.getBoundingClientRect(),w=Math.max(320,Math.round(rect.width||960)),h=Math.round(w*9/16);renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);if(camera){camera.aspect=w/h;camera.updateProjectionMatrix();}}
 function frame(now){
  requestAnimationFrame(frame);const costStart=performance.now(),dt=Math.min(.035,Math.max(0,(now-(last||now))/1000));last=now;frames++;
  if(state==='play'&&!paused){
   clock+=dt;stageClock+=dt;invulnerable=Math.max(0,invulnerable-dt);fireDelay=Math.max(0,fireDelay-dt);if(reloadDelay>0){reloadDelay-=dt;if(reloadDelay<=0){ammo=40;notice('Munição recarregada',1.4);}}
   if(transition>0){transition-=dt;if(transition<=0)advance();}else if(genre==='platform')updatePlatform(dt);else if(genre==='racing')updateRacing(dt);else updateCombat(dt);
   hero.position.set(player.x,player.y,player.z);hero.rotation.y=player.yaw;if(genre!=='racing')animateActor(hero,player.speed,clock*10);
   hero.visible=genre!=='fps'&&(invulnerable<=0||Math.floor(invulnerable*12)%2===0);
   for(const c of coins)if(!c.taken){c.mesh.rotation.y+=dt*1.6;c.mesh.position.y=c.y+Math.sin(clock*3+c.x)*.1;}
   if(goal)goal.portal.scale.x=1+Math.sin(clock*2)*.035;
   updateCamera(dt);updateHUD();
  }
  if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('message').style.opacity='0';}
  if(scene&&(!software||now-lastDraw>=1000/30)){renderer.render(scene,camera);lastDraw=now;}
  if(!software&&opts.quality==='auto'&&frames>60){frameCost+=performance.now()-costStart;perfSamples++;if(perfSamples===180){const avg=frameCost/perfSamples;if(avg>21&&ratio>.76){ratio=Math.max(.75,ratio-.2);renderer.shadowMap.enabled=ratio>1;resize();}frameCost=0;perfSamples=0;}}
 }
 window.__gameforgeTelemetry=()=>{
  vec.set(player.x,player.y+1,player.z);if(camera)vec.project(camera);
  return {dimension:'3d',genre,state,paused,frames,stage:stage+1,stages:stages.length,clock,health,score,enemies:enemies.length,collected,required,missionMode:genre==='arena'||genre==='fps'?missionAt(stage):'default',missionReady:genre==='arena'||genre==='fps'?combatReady():null,surviveRemaining:missionAt(stage)==='survive'?Math.max(0,R.clamp(Number(configAt(stage).seconds)||45,5,180)-stageClock):null,playerBullets:bullets.length,checkpoint:race.next,lap:race.lap,render:{mode:renderer.mode||'webgl',triangles:renderer.info.render.triangles||0,pixelRatio:ratio,drawCalls:renderer.info.render.calls,geometries:renderer.info.memory.geometries},player:{x:player.x*100,y:player.z*100,z:player.y*100,angle:player.yaw,screenX:genre==='fps'?canvas.width/2:(vec.x*.5+.5)*canvas.width,screenY:genre==='fps'?canvas.height/2:(-.5*vec.y+.5)*canvas.height,radius:20}};
 };
 $('control-help').textContent=genre==='fps'?'WASD / setas: mover · Q/E ou arrastar: mirar · Espaço/clique: atirar':genre==='racing'?'W / ↑ acelerar · S / ↓ frear · A/D virar · Espaço turbo':genre==='platform'?'A/D ou ←/→: mover · W/↑/Espaço: saltar · Q/S: profundidade':'WASD / setas: mover · Espaço/clique: ataque · P: pausa';
 $('overlay-sub').textContent=genre==='fps'?'Explore em primeira pessoa, elimine os guardiões, colete 3 cristais e atravesse o portal. Mire com Q/E ou arrastando no cenário.':genre==='racing'?'Complete as voltas atravessando os portais em ordem. Evite o tráfego e as barreiras.':genre==='platform'?'Salte entre as ilhas, colete cristais e alcance o portal. Cada plataforma alcançada salva seu retorno.':'Explore o mundo, enfrente os guardiões e reúna os cristais para abrir o portal.';
 if(software){$('control-help').textContent+=' · Modo compatível (CPU)';$('overlay-sub').textContent+=' Renderização compatível por CPU ativada.';}
 $('start').addEventListener('click',()=>{if(state==='play'&&paused)togglePause();else start();});$('restart').addEventListener('click',start);$('pause').addEventListener('click',togglePause);
 addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','q','e'].includes(k))e.preventDefault();if((k==='p'||k==='Escape')&&!e.repeat)togglePause();keys.add(k);});
 addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
 function release(){keys.clear();pointerDown=false;dragX=null;Object.keys(touch).forEach(k=>touch[k]=false);}
 addEventListener('blur',()=>{release();if(state==='play'&&!paused)togglePause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){release();if(state==='play'&&!paused)togglePause();}});
 canvas.addEventListener('pointerdown',e=>{if(state!=='play'||paused)return;pointerDown=true;dragX=e.clientX;canvas.setPointerCapture&&canvas.setPointerCapture(e.pointerId);canvas.focus();});
 canvas.addEventListener('pointermove',e=>{if(genre==='fps'&&dragX!==null){player.yaw-=(e.clientX-dragX)*.007;dragX=e.clientX;}});
 canvas.addEventListener('pointerup',()=>{pointerDown=false;dragX=null;});canvas.addEventListener('pointercancel',release);canvas.addEventListener('contextmenu',e=>e.preventDefault());
 document.querySelectorAll('[data-control]').forEach(button=>{const name=button.dataset.control;button.addEventListener('pointerdown',e=>{e.preventDefault();touch[name]=true;button.setPointerCapture&&button.setPointerCapture(e.pointerId);});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>touch[name]=false);});
 addEventListener('resize',resize);buildStage();state='menu';requestAnimationFrame(frame);
}
if(typeof module!=='undefined')module.exports=gameForgeThreeBoot;
if(typeof globalThis!=='undefined')globalThis.gameForgeThreeBoot=gameForgeThreeBoot;
