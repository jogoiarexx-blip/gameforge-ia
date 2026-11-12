const test=require('node:test');
const assert=require('node:assert/strict');
let factory;try{factory=require('../js/world-rules.js');}catch{}
// A missing boundary clamp or collider resolution lets actors leave the world or walk through rock.
test('circle movement respects world boundaries and slides around solid geometry',()=>{
 assert.equal(typeof factory,'function');
 const r=factory();
 const a=r.moveCircle({x:0,z:0},10,2,.5,[{x:3,z:0,w:2,d:8}],12);
 assert.ok(a.x<=1.501);assert.ok(a.z>1.9);
 const b=r.moveCircle({x:0,z:0},99,-99,.5,[],12);
 assert.deepEqual(b,{x:5.5,z:-5.5});
});
// Large random gaps would create impossible platform runs.
test('platform route is deterministic and every next landing is reachable',()=>{
 assert.equal(typeof factory,'function');const r=factory();
 const route=r.platformRoute(123,29,48);
 assert.deepEqual(route,r.platformRoute(123,29,48));assert.ok(route.length>=10);
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i];
  assert.ok(b.x-b.w/2-(a.x+a.w/2)<=2.1);
  assert.ok(b.y-a.y<=1.3);assert.ok(Math.abs(b.z-a.z)<=1.5);
 }
 assert.equal(route[0].y,0);
});
// Accepting any checkpoint or repeatedly dwelling at finish would grant free laps.
test('racing requires ordered checkpoints and a completed circuit per lap',()=>{
 assert.equal(typeof factory,'function');const r=factory();let p={next:0,lap:0};
 p=r.raceProgress(p,2,4,2);assert.deepEqual(p,{next:0,lap:0,complete:false});
 for(const gate of [0,1,2,3])p=r.raceProgress(p,gate,4,2);
 assert.deepEqual(p,{next:0,lap:1,complete:false});
 p=r.raceProgress(p,3,4,2);assert.equal(p.lap,1);
 for(const gate of [0,1,2,3])p=r.raceProgress(p,gate,4,2);
 assert.deepEqual(p,{next:0,lap:2,complete:true});
});
// Premature transitions would allow walking directly to exit without the actual objective.
test('exit gating follows each genre objective',()=>{
 assert.equal(typeof factory,'function');const r=factory();
 assert.equal(r.goalReady('arena',{enemies:1,collected:9,required:3}),false);
 assert.equal(r.goalReady('fps',{enemies:0,collected:2,required:3}),false);
 assert.equal(r.goalReady('arena',{enemies:0,collected:3,required:3}),true);
 assert.equal(r.goalReady('platform',{collected:2,required:3}),false);
 assert.equal(r.goalReady('platform',{collected:3,required:3}),true);
 assert.equal(r.goalReady('racing',{complete:true}),true);
});
// Reversing winding makes the road invisible with default front-face rendering.
test('track surface triangles face upward and form a closed seam',()=>{
 const r=factory(),track=r.trackRibbon(16,12,7,32);
 const [ia,ib,ic]=track.indices,a=track.positions.slice(ia*3,ia*3+3),b=track.positions.slice(ib*3,ib*3+3),c=track.positions.slice(ic*3,ic*3+3);
 const normalY=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]);
 assert.ok(normalY>0);assert.ok(Math.abs(track.positions[0]-track.positions.at(-6))<1e-8);
 assert.equal(track.indices.length,192);
});

// WebGL is the only replaced boundary: real bundled Three builds every scene and camera.
const fs=require('node:fs'),vm=require('node:vm');
function boot(genre,overrides={},webglFails=false){
 const context={AbortController,console};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../vendor/three-source.js'),'utf8'),context);vm.runInContext(context.GameForgeThreeSource,context);
 const handlers={},elements={},callbacks=[];let now=0,lastScene,disposed=0;
 const element=id=>elements[id]||(elements[id]={textContent:'',style:{},classList:{add(){},remove(){}},dataset:{},addEventListener(type,fn){this[type]=fn;},focus(){},getContext(){return {fillRect(){},setTransform(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){}};},getBoundingClientRect(){return {width:960,height:540};}});
 const actualDispose=context.THREE.BufferGeometry.prototype.dispose;context.THREE.BufferGeometry.prototype.dispose=function(){disposed++;return actualDispose.call(this);};
 const THREE={...context.THREE,WebGLRenderer:class{constructor(){if(webglFails)throw Error('WebGL unavailable');this.shadowMap={};this.info={render:{calls:0},memory:{geometries:0}};this.renderLists={dispose(){}};}setClearColor(){}setPixelRatio(){}setSize(w,h){element('game').width=w;element('game').height=h;}render(scene){lastScene=scene;}}};
 const env={THREE,GAME_SPEC:{genre,dimension:'3d',stages:['A','B'],features:{bosses:true},worldOptions:{size:48,seed:42,quality:'low'},...overrides},document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){}},performance:{now:()=>now},requestAnimationFrame:f=>callbacks.push(f),addEventListener:(k,f)=>{(handlers[k]||(handlers[k]=[])).push(f);},gameForgeWorldRules:factory,gameForgeSoftwareRenderer:makeSoftware,window:null,globalThis:null};
 env.window=env;env.globalThis=env;vm.createContext(env);vm.runInContext('('+require('../js/three-runtime.js').toString()+')()',env);
 const fire=(type,key)=>{for(const f of handlers[type]||[])f({key,preventDefault(){},repeat:false});};
 const tick=(count=1)=>{for(let i=0;i<count;i++){now+=1000/60;const fn=callbacks.shift();assert.equal(typeof fn,'function');fn(now);}};
 return {elements,fire,tick,start:()=>element('start').click(),telemetry:()=>env.__gameforgeTelemetry(),scene:()=>lastScene,disposed:()=>disposed};
}
test('serialized 3D arena moves, pauses without simulating, releases inputs and restarts resources',()=>{
 const b=boot('arena');b.start();b.tick(2);const before=b.telemetry();b.fire('keydown','ArrowRight');b.tick(30);b.fire('keyup','ArrowRight');const moved=b.telemetry();assert.ok(moved.player.x-before.player.x>200);
 b.elements.pause.click();const p=b.telemetry().player.x;b.tick(30);assert.equal(b.telemetry().player.x,p);assert.ok(b.telemetry().frames>moved.frames);
 b.elements.start.click();b.tick(5);assert.equal(b.telemetry().paused,false);assert.equal(b.telemetry().player.x,p);
 b.elements.restart.click();b.tick(2);assert.equal(b.telemetry().player.x,0);assert.ok(b.disposed()>20);assert.ok(b.scene().isScene);
});
test('serialized first person game strafes and shoots using the actual Three world',()=>{
 const b=boot('fps');b.start();b.tick(2);b.fire('keydown','ArrowRight');b.fire('keydown',' ');b.tick(20);b.fire('keyup','ArrowRight');b.fire('keyup',' ');const p=b.telemetry();assert.ok(p.player.x>100);assert.ok(p.playerBullets>0);assert.equal(p.player.screenX,480);assert.equal(p.player.screenY,270);
});
test('serialized platform jump rises above its landing and racing steering changes world position',()=>{
 const p=boot('platform');p.start();p.tick(2);p.fire('keydown',' ');p.tick(12);assert.ok(p.telemetry().player.z>80);
 const r=boot('racing');r.start();r.tick(2);r.fire('keydown','ArrowRight');r.fire('keydown','ArrowUp');r.tick(30);const race=r.telemetry();assert.ok(Math.abs(race.player.x)>100);assert.ok(race.player.angle<Math.PI/2);assert.equal(race.lap,0);
});
// Empty ammunition must not permanently block the combat objective.
test('FPS automatically reloads after exhausting a magazine',()=>{
 const b=boot('fps',{tuning:{fireRateMultiplier:4,difficulty:.25,enemyMultiplier:.25}});b.start();b.tick(2);
 b.fire('keydown','q');b.tick(43);b.fire('keyup','q');
 b.fire('keydown',' ');b.tick(470);b.fire('keyup',' ');b.tick(100);
 assert.equal(b.telemetry().state,'play');assert.ok(Number(b.elements.ammo.textContent)>0);
});
let makeSoftware;try{makeSoftware=require('../js/software-renderer.js');}catch{}
test('software renderer projects the real Three scene into lit triangles and clips geometry behind camera',()=>{
 assert.equal(typeof makeSoftware,'function');const context={AbortController,console};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../vendor/three-source.js'),'utf8'),context);vm.runInContext(context.GameForgeThreeSource,context);const T=context.THREE;
 const drawn=[],ctx={fillStyle:'',beginPath(){this.points=[];},moveTo(x,y){this.points.push([x,y]);},lineTo(x,y){this.points.push([x,y]);},closePath(){},fill(){drawn.push(this.points.slice());},fillRect(){},setTransform(){},save(){},restore(){},stroke(){}};
 const canvas={width:0,height:0,getContext:()=>ctx},renderer=makeSoftware(T,canvas);renderer.setSize(640,360);renderer.setClearColor(0xabc8cb);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(60,640/360,.1,100);camera.position.z=5;camera.lookAt(0,0,0);scene.add(new T.Mesh(new T.BoxGeometry(2,2,2),new T.MeshStandardMaterial({color:0x66ddcc})));
 renderer.render(scene,camera);assert.ok(drawn.length>=2);assert.ok(drawn.flat().every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)));assert.ok(drawn[0].every(([x,y])=>x>0&&x<640&&y>0&&y<360));
 assert.equal(renderer.mode,'software');assert.ok(renderer.info.render.triangles>0);const old=drawn.length;camera.position.z=-5;camera.lookAt(0,0,-10);renderer.render(scene,camera);assert.equal(drawn.length,old);
});
test('runtime remains playable with the software 3D renderer when WebGL initialization fails',()=>{
 const b=boot('arena',{},true);b.start();b.tick(2);b.fire('keydown','ArrowRight');b.tick(20);const t=b.telemetry();assert.equal(t.state,'play');assert.ok(t.player.x>100);assert.equal(t.render.mode,'software');assert.ok(t.render.triangles>0);
});
// Large floor triangles cross the view and their average depth must not paint over actors.
test('software ground layers remain behind foreground geometry',()=>{
 const context={AbortController,console};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../vendor/three-source.js'),'utf8'),context);vm.runInContext(context.GameForgeThreeSource,context);const T=context.THREE;
 let pixel='';const ctx={fillStyle:'',setTransform(){},fillRect(){},beginPath(){this.points=[];},moveTo(x,y){this.points.push([x,y]);},lineTo(x,y){this.points.push([x,y]);},closePath(){},fill(){let inside=false;const p=this.points;for(let i=0,j=p.length-1;i<p.length;j=i++){if((p[i][1]>110)!==(p[j][1]>110)&&160<(p[j][0]-p[i][0])*(110-p[i][1])/(p[j][1]-p[i][1])+p[i][0])inside=!inside;}if(inside)pixel=this.fillStyle;}};
 const canvas={getContext:()=>ctx},renderer=makeSoftware(T,canvas),scene=new T.Scene(),camera=new T.PerspectiveCamera(60,320/180,.1,500);renderer.setSize(320,180);camera.position.set(0,3,5);camera.lookAt(0,.5,0);
 const ground=new T.Mesh(new T.BoxGeometry(100,.2,100),new T.MeshBasicMaterial({color:0x00ff00}));ground.position.y=-.2;ground.renderOrder=-1000;scene.add(ground);const box=new T.Mesh(new T.BoxGeometry(2,2,2),new T.MeshBasicMaterial({color:0xff0000}));box.position.y=1;scene.add(box);renderer.render(scene,camera);assert.equal(pixel,'rgb(255,0,0)');
});
test('restarting a 3D scene releases the old light shadow render target',()=>{
 const b=boot('arena');b.start();b.tick(2);let released=0;
 const sun=b.scene().children.find(o=>o.isDirectionalLight);sun.shadow.dispose=()=>released++;
 b.elements.restart.click();assert.equal(released,1);
});
test('ampliar mundo de plataforma cria uma rota mais extensa com saltos alcançáveis',()=>{
 const r=factory(),small=r.platformRoute(42,0,48),large=r.platformRoute(42,0,72);
 assert(large.length>small.length);for(let i=1;i<large.length;i++)assert(large[i].x-large[i-1].x<=5.3);
});
