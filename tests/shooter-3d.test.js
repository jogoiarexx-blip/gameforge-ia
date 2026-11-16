const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const Parser=require('../js/parser');
const worldRules=require('../js/world-rules');
const engine=require('../js/shooter-3d-runtime');
require('../js/three-runtime');
require('../js/shooter-3d-runtime');
require('../js/world-rules');
require('../js/software-renderer');
require('../vendor/three-source');
const generator=require('../js/generator');

function three(){
 const context={console,AbortController};vm.createContext(context);
 vm.runInContext(fs.readFileSync(require.resolve('../vendor/three-source.js'),'utf8'),context);
 vm.runInContext(context.GameForgeThreeSource,context);
 return context.THREE;
}
function boot(overrides={}){
 const handlers={},elements={},callbacks=[];let now=0,rendered=null,disposals=0;
 const item=id=>elements[id]||(elements[id]={textContent:'',style:{},classList:{add(){},remove(){}},dataset:{},addEventListener(type,fn){this[type]=fn;},focus(){},getBoundingClientRect(){return {width:960,height:540};}});
 const T=three();
 const currentDispose=T.BufferGeometry.prototype.dispose;
 T.BufferGeometry.prototype.dispose=function(){disposals++;return currentDispose.call(this);};
 const THREE={...T,WebGLRenderer:class{
  constructor(){this.shadowMap={};this.info={render:{calls:0,triangles:0},memory:{geometries:0}};this.renderLists={dispose(){}};}
  setPixelRatio(){}setSize(w,h){item('game').width=w;item('game').height=h;}setClearColor(){}render(scene){rendered=scene;}
 }};
 const env={THREE,GAME_SPEC:{genre:'shooter',dimension:'3d',stages:['Patrulha','Boss final'],features:{bosses:true},
  worldOptions:{size:48,quality:'low',theme:'neon',seed:33},shooterOptions:{boss:true},...overrides},
  document:{getElementById:item,querySelectorAll:()=>[],addEventListener(){}},
  performance:{now:()=>now},requestAnimationFrame:f=>callbacks.push(f),
  addEventListener:(name,fn)=>(handlers[name]||(handlers[name]=[])).push(fn),
  gameForgeWorldRules:worldRules,gameForgeSoftwareRenderer:null,
  window:null,globalThis:null};
 env.window=env;env.globalThis=env;
 vm.createContext(env);vm.runInContext('('+engine.toString()+')()',env);
 const tick=(count=1)=>{for(let i=0;i<count;i++){now+=1000/60;const f=callbacks.shift();assert.equal(typeof f,'function');f(now);}};
 const key=(type,name)=>{for(const f of handlers[type]||[])f({key:name,preventDefault(){},repeat:false});};
 return {tick,key,env,item,scene:()=>rendered,telemetry:()=>env.__gameforgeTelemetry(),disposed:()=>disposals};
}
test('pedido novo de navinha prevalece sobre GDD 3D antigo e exporta runtime proprio',()=>{
 const gdd='# GOLDENEYE 007 REMASTERED\n\n## FPS em primeira pessoa 3D\nMissões táticas e inimigos.';
 const spec=Parser.parseGdd(gdd,'criar um game de navinha',{dimension:'3d',genre:'auto'});
 assert.equal(spec.genre,'shooter');
 assert.equal(spec.dimension,'3d');
 const files=generator.generate(spec,gdd);
 assert.match(files['game.js'],/gameForgeShooter3DBoot|Combata ondas de naves 3D/);
 assert.match(files['engine-3d.js'],/THREE/);
 assert.equal(files['GDD_original.md'],gdd);
 assert.doesNotThrow(()=>new vm.Script(files['game.js']));
});
test('shooter 3D inicia naves procedurais, pilotos, tiros e ondas, pausa e reinicia sem regressao',()=>{
 const b=boot();
 let t=b.telemetry();
 assert.equal(t.state,'menu');assert.equal(t.genre,'shooter');
 assert.ok(t.enemies>=3);assert.equal(t.wave,1);b.tick(1);assert.ok(b.scene()?.isScene);
 b.item('start').click();b.tick(2);
 const before=b.telemetry();
 b.key('keydown','ArrowRight');b.key('keydown',' ');
 b.tick(24);b.key('keyup','ArrowRight');b.key('keyup',' ');
 t=b.telemetry();
 assert.ok(t.player.x>before.player.x+180,'WASD/arrow movement did not advance ship');
 assert.ok(t.playerBullets>0,'holding attack should spawn real projectiles');
 assert.equal(t.weapon,1);assert.equal(t.paused,false);
 b.item('pause').click();const px=b.telemetry().player.x;b.tick(25);
 assert.equal(b.telemetry().paused,true);assert.equal(b.telemetry().player.x,px);
 b.item('start').click();assert.equal(b.telemetry().paused,false);
 b.item('restart').click();b.tick(2);
 assert.equal(b.telemetry().state,'play');assert.equal(b.telemetry().wave,1);
 assert.equal(b.telemetry().player.x,0);
 assert.ok(b.disposed()>0,'restarting must dispose procedural geometry');
});
test('RPG 3D no motor existente expoe progressao e aceita o estilo',()=>{
 const spec=Parser.parseGdd('# RPG do Vale\nMissões, experiência e magias 3D','',{dimension:'3d',genre:'rpg'});
 assert.equal(spec.genre,'rpg');assert.equal(spec.dimension,'3d');
 const files=generator.generate(spec,'# RPG do Vale');
 assert.match(files['game.js'],/rpgReward\(/);
 assert.match(files['game.js'],/rpgPotions/);
 assert.doesNotThrow(()=>new vm.Script(files['game.js']));
});
test('combinações ainda nao suportadas exibem mensagem util, sem fingir implementacao',()=>{
 assert.throws(()=>Parser.parseGdd('# Defesa\nTower defense 3D','',{dimension:'3d',genre:'tower-defense'}),/ainda não possui motor 3D/);
 assert.ok(!Parser.styles['3d'].includes('tower-defense'));
});
test('GF-017 lote de estrelas reduz dezenas de meshes a uma chamada de desenho',()=>{
 const b=boot({worldOptions:{size:48,quality:'high',theme:'neon',seed:33}});
 b.tick(2);
 const instanced=[];
 b.scene().traverse(o=>{if(o.isInstancedMesh)instanced.push(o);});
 assert.equal(instanced.length,1,'campo de estrelas deve ser um InstancedMesh no WebGL');
 assert.equal(instanced[0].count,110);
 assert.equal(b.telemetry().starCount,110);
 assert.equal(b.telemetry().starDrawBatches,1,'um lote no lugar de 110 draws');
 const before=new Float32Array(instanced[0].instanceMatrix.array);
 b.item('start').click();b.tick(15);
 const latest=[];
 b.scene().traverse(o=>{if(o.isInstancedMesh)latest.push(o);});
 assert.equal(latest.length,1);
 assert.equal(b.telemetry().starDrawBatches,1);
 const initial=latest[0].instanceMatrix.array;
 b.tick(8);
 const moved=latest[0].instanceMatrix.array;
 assert.notDeepEqual(Array.from(initial.slice(12,16)),Array.from(moved.slice(12,16)), 'estrelas instanciadas devem se mover');
 assert.ok(b.disposed()>0,'reinicio descarta geometria da fase anterior');
});
