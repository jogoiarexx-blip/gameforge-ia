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
function boot(overrides={},testBoss=false){
 const handlers={},elements={},callbacks=[];let now=0,rendered=null,disposals=0;
 const item=id=>elements[id]||(elements[id]={textContent:'',style:{},classList:{add(){},remove(){}},dataset:{},children:[],events:{},
  addEventListener(type,fn){this.events[type]=fn;this[type]=fn;},click(){this.events.click?.({preventDefault(){}});},
  appendChild(child){this.children.push(child);return child;},setAttribute(){},focus(){},
  getBoundingClientRect(){return {width:960,height:540};}});
 const T=three();
 const currentDispose=T.BufferGeometry.prototype.dispose;
 T.BufferGeometry.prototype.dispose=function(){disposals++;return currentDispose.call(this);};
 const THREE={...T,WebGLRenderer:class{
  constructor(){this.shadowMap={};this.info={render:{calls:0,triangles:0},memory:{geometries:0}};this.renderLists={dispose(){}};}
  setPixelRatio(){}setSize(w,h){item('game').width=w;item('game').height=h;}setClearColor(){}render(scene){rendered=scene;}
 }};
 const env={THREE,GAME_SPEC:{genre:'shooter',dimension:'3d',stages:['Patrulha','Boss final'],features:{bosses:true},
  worldOptions:{size:48,quality:'low',theme:'neon',seed:33},shooterOptions:{boss:true},...overrides},
  document:{getElementById:item,createElement:()=>item('created-'+Object.keys(elements).length),querySelectorAll:()=>[],addEventListener(){}},
  performance:{now:()=>now},requestAnimationFrame:f=>callbacks.push(f),
  addEventListener:(name,fn)=>(handlers[name]||(handlers[name]=[])).push(fn),
  gameForgeWorldRules:worldRules,gameForgeSoftwareRenderer:null,
  GameForgeStageBranches:require('../js/stage-branches.js')(),
  GameForgeUrbanSave:require('../js/urban-save.js')(),
  localStorage:{data:new Map(),getItem(k){return this.data.get(k)||null;},setItem(k,v){this.data.set(k,String(v));},removeItem(k){this.data.delete(k);}},
  window:null,globalThis:null};
 env.window=env;env.globalThis=env;
 // Sonda SOMENTE no VM dos testes: nenhum hook de trapaça entra nos exports.
 // A sonda prepara um encontro curto; tiros, colisões, prêmios e vitória
 // continuam usando o runtime real, sem mockar reward() ou updateStage().
 const injection = "window.__gfBossProbe={"+
  "setup(){for(const e of enemies)world.remove(e.mesh);enemies=[];wave=waveMax;"+
  "waveTimer=0;bossSpawned=false;bossDefeated=false;stageTransition=0;health=100;"+
  "spawnBoss();return enemies.find(e=>e.boss)?.hp;},"+
  "center(){const e=enemies.find(e=>e.boss);if(e){e.phase=0;e.x=player.x;e.z=player.z-5;}},"+
  "escape(){const e=enemies.find(e=>e.boss);if(e)e.z=size*.44+1;},"+
  "collide(){const e=enemies.find(e=>e.boss);if(e){e.x=player.x;e.z=player.z;}},"+
  "inspect(){return {state,health,score,wave,waveMax,bossSpawned,bossDefeated,"+
  "bossHp:enemies.find(e=>e.boss)?.hp||0,stageTransition};}"+
  "};";
 let engineSource=engine.toString();
 if(testBoss){
  const anchor="setUpStage();state='menu';requestAnimationFrame(frame);";
  assert.ok(engineSource.includes(anchor),'ponto de inserção QA da nave deve existir');
  engineSource=engineSource.replace(anchor,injection+anchor);
 }
 vm.createContext(env);vm.runInContext('('+engineSource+')()',env);
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
 const initial=Array.from(latest[0].instanceMatrix.array.slice(12,16));
 b.tick(8);
 const moved=Array.from(latest[0].instanceMatrix.array.slice(12,16));
 assert.notDeepEqual(initial,moved,'estrelas instanciadas devem se mover');
 assert.ok(b.disposed()>0,'reinicio descarta geometria da fase anterior');
});

test('GF-010 caminhos alternativos geram encontros e checkpoints diferentes no shooter 3D real',()=>{
 const spec={title:'Caminhos testaveis',stageBranches:require('../js/stage-branches.js')().parse('3 caminhos alternativos e passagem secreta')};
 const game=boot(spec);
 game.tick(2);
 game.item('start').click();
 assert.equal(game.telemetry().state,'route-choice');
 assert.deepEqual(Array.from(game.telemetry().routeChoices),['high','middle','low']);
 game.key('keydown','3');
 assert.equal(game.telemetry().state,'play');
 assert.equal(game.telemetry().route,'low');
 const hard=game.telemetry().enemies;
 assert.ok(hard>=6,'rota dificil deve aumentar a primeira onda');
 assert.equal(game.telemetry().routeCheckpoint,true);
 game.item('restart').click();
 assert.equal(game.telemetry().state,'route-choice');
 game.key('keydown','1');
 assert.equal(game.telemetry().route,'high');
 assert.ok(game.telemetry().enemies<hard,'rota superior muda quantidade real de inimigos');
 assert.equal(game.telemetry().routeName,'Caminho superior');
});

test('GF-010 v2 as rotas alteram bioma 3D e disparam encontros exclusivos executáveis',()=>{
 const branch=require('../js/stage-branches.js')();
 const spec={title:'Biomas por caminho',stageBranches:branch.parse('3 caminhos alternativos e passagem secreta')};
 const loaded=[];
 for(const [number,id,sceneId,eventType] of [
  [1,'high','sky-bridges','supply'],[2,'middle','central-outpost','ambush'],[3,'low','canyon-ruins','hazard']
 ]){
  const g=boot(spec);g.tick(2);g.item('start').click();g.key('keydown',String(number));
  const start=g.telemetry();
  assert.equal(start.state,'play');
  assert.equal(start.route,id);
  assert.equal(start.routeScene,sceneId);
  assert.equal(start.routeDecorCount,20,'pilares e luminárias ficam na cena real');
  const bg=start.routeBackground;
  assert.ok(g.scene().background,'cenário foi construído com cor real de fundo');
  g.tick(295);
  const after=g.telemetry();
  const evt=after.routeEvents.find(e=>e.type===eventType);
  assert.ok(evt,'evento deve existir no runtime, não só no manifesto');
  assert.ok(after.routeEventsTriggered.includes(evt.id),'evento inicia após o tempo jogado');
  assert.equal(after.routeEventsTriggered.filter(x=>x===evt.id).length,1,'evento dispara uma vez');
  if(eventType==='supply')assert.ok(after.powerups>=1,'surge recompensa coletável');
  if(eventType==='ambush')assert.ok(after.enemies>=start.enemies+2,'emboscada cria inimigos adicionais');
  if(eventType==='hazard')assert.ok(after.enemyBullets>=4,'ataque de projéteis é físico');
  loaded.push({id,bg});
 }
 assert.equal(new Set(loaded.map(x=>x.bg)).size,3,'cor real do ambiente muda por caminho');
});
test('GF-010 v2 coletar suprimentos confirma ID no checkpoint e não premia novamente',()=>{
 const branch=require('../js/stage-branches.js')();
 const game=boot({title:'Teste de tesouro único',stageBranches:branch.parse('3 caminhos alternativos')});
 game.tick(2);game.item('start').click();game.key('keydown','1');
 const event=game.telemetry().routeEvents[0];
 game.tick(276);
 assert.ok(game.telemetry().routeEventsTriggered.includes(event.id));
 game.key('keydown','ArrowRight');game.tick(42);game.key('keyup','ArrowRight');
 const after=game.telemetry();
 assert.deepEqual(Array.from(after.routeRewardsClaimed),[event.id],'evento foi coletado na colisão real');
 assert.equal(after.routeCheckpoint,true);
 const stored=game.env.localStorage.getItem('gameforge-shooter-branches-v1-teste-de-tesouro-unico');
 assert.ok(stored,'progresso do evento foi persistido');
 assert.deepEqual(JSON.parse(stored).claimed,[event.id]);
 const cash=after.score;game.tick(70);
 assert.equal(game.telemetry().score,cash,'não é possível ganhar o mesmo bônus repetidamente');
});


test('GF-TRAIN-05: chefe que escapa nunca entrega recompensa nem libera a campanha',()=>{
 const game=boot({stages:['Confronto final'],stageConfig:[{waves:2,boss:'yes'}]},true);
 game.item('start').click();game.tick(2);
 const bossHp=game.env.__gfBossProbe.setup();
 assert.ok(bossHp>0,'chefe real foi criado');
 game.env.__gfBossProbe.escape();
 game.tick(2);
 const lost=game.telemetry();
 assert.equal(lost.state,'defeat');
 assert.equal(lost.bossDefeated,false);
 assert.equal(lost.health,0);
 assert.equal(lost.score,0,'escapar não dá bônus de vitória');
 game.tick(180);
 assert.equal(game.telemetry().state,'defeat','falha no chefe não desbloqueia vitória tardiamente');
 assert.equal(game.telemetry().score,0);
});

test('GF-TRAIN-05: colisão direta do chefe causa derrota em vez de conclusão falsa',()=>{
 const game=boot({stages:['Batalha final'],stageConfig:[{waves:2,boss:'yes'}]},true);
 game.item('start').click();game.tick(2);
 game.env.__gfBossProbe.setup();
 game.env.__gfBossProbe.collide();
 game.tick(2);
 assert.equal(game.telemetry().state,'defeat');
 assert.equal(game.telemetry().bossDefeated,false);
 assert.equal(game.telemetry().score,0);
});

test('GF-TRAIN-05: disparos reais derrotam chefe, pagam recompensa única e concluem a campanha',()=>{
 const game=boot({stages:['Batalha final'],stageConfig:[{waves:2,boss:'yes'}],
  tuning:{difficulty:1,enemyMultiplier:1,bossMultiplier:.25,playerSpeedMultiplier:1,fireRateMultiplier:2}},true);
 game.item('start').click();game.tick(2);
 const hp=game.env.__gfBossProbe.setup();
 assert.ok(hp>=1&&hp<=6,'chefe de teste deve ser abatível sem dezenas de segundos');
 game.key('keydown',' ');
 let iterations=0;
 while(!game.telemetry().bossDefeated&&iterations++<30){
  game.env.__gfBossProbe.center();
  game.tick(12);
 }
 game.key('keyup',' ');
 assert.equal(game.telemetry().bossDefeated,true,'tiros efetivos reduziram HP do chefe a zero');
 assert.equal(game.telemetry().score,900,'uma recompensa de chefe de 900 pontos');
 game.tick(210);
 assert.equal(game.telemetry().state,'victory','final de fase só após derrotar o chefe');
 const wonScore=game.telemetry().score;
 assert.ok(wonScore===1400||wonScore===1490,
  'prêmio de 900 + conclusão de 500; um power-up opcional pode dar +90');
 game.tick(90);
 assert.equal(game.telemetry().score,wonScore,'estado de vitória não duplica prêmios');
});
