'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const engine=require('../js/three-runtime.js');
const World=require('../js/world-rules.js');
const Save=require('../js/urban-save.js')();
const Adventure=require('../js/adventure-campaign-save.js')();

function makeStorage(){
 const data=new Map();
 return {data,getItem:k=>data.has(k)?data.get(k):null,
  setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
}
function boot(genre,shared=null,overrides={}){
 const Tctx={AbortController,console};
 vm.createContext(Tctx);
 vm.runInContext(fs.readFileSync(require.resolve('../vendor/three-source.js'),'utf8'),Tctx);
 vm.runInContext(Tctx.GameForgeThreeSource,Tctx);
 const elements={},handlers={},frames=[];
 let now=0;
 const item=id=>elements[id]||(elements[id]={
  textContent:'',style:{},dataset:{},classList:{add(){},remove(){}},
  events:{},addEventListener(name,cb){this.events[name]=cb;},
  click(){this.events.click?.({preventDefault(){}});},
  focus(){},getBoundingClientRect(){return {width:960,height:540};}
 });
 const THREE={...Tctx.THREE,WebGLRenderer:class{
  constructor(){this.shadowMap={};this.info={render:{calls:0,triangles:0},memory:{geometries:0}};
   this.renderLists={dispose(){}};}
  setPixelRatio(){}setSize(w,h){item('game').width=w;item('game').height=h;}
  setClearColor(){}render(){}
 }};
 const spec={
  title:'Treino 7 '+genre,genre,dimension:'3d',
  stages:['Jardim','Ruínas','Fortaleza'],
  stageConfig:[{boss:'no'},{boss:'no'},{boss:'yes'}],
  features:{bosses:false},worldOptions:{size:48,seed:42,quality:'low'},...overrides
 };
 const env={
  THREE,GAME_SPEC:spec,AbortController,console,document:{
   getElementById:item,querySelectorAll:()=>[],addEventListener(){}
  },
  performance:{now:()=>now},
  requestAnimationFrame:fn=>frames.push(fn),
  addEventListener:(event,fn)=>(handlers[event]||(handlers[event]=[])).push(fn),
  gameForgeWorldRules:World,
  gameForgeSoftwareRenderer:null,
  GameForgeUrbanSave:Save,
  GameForgeAdventureCampaignSave:Adventure,
  localStorage:shared||makeStorage(),window:null,globalThis:null
 };
 env.window=env;env.globalThis=env;
 const probe=[
  'window.__gfAdventureProbe={',
  'nearExit(){player.x=goal.x;player.y=goal.y;player.z=goal.z;},',
  'arrangeClear(){enemies=[];collected=required;player.x=goal.x;player.y=goal.y;player.z=goal.z;},',
  'boostRpg(count){for(let i=0;i<count;i++)rpgReward(false);},',
  'setHealth(n){health=n;},',
  'defeat(){damage(200);},',
  'alignEnemy(){const e=enemies.find(x=>x.id===0);if(!e)return -1;',
  'for(const other of enemies)if(other!==e){other.x=20;other.z=-20;other.speed=0;}',
  'e.x=player.x;e.z=player.z-4;e.hp=1;e.speed=0;return e.id;},',
  'landOnPlatform(index){const p=platforms[index];if(!p)return false;',
  'player.x=p.x;player.z=p.z;player.y=p.y+.025;player.vy=-3;player.grounded=false;return true;},',
  'nearCrystal(){const c=coins.find(x=>!x.taken);'
  'if(c){player.x=c.x;player.y=c.y-.9;player.z=c.z;}},',
  'inspect(){return {stage,score,health,ammo,rpgLevel,rpgXP,rpgPotions,required,collected};}',
  '};'
 ].join('');
 const anchor="addEventListener('resize',resize);buildStage();state='menu';";
 let source=engine.toString();
 assert.ok(source.includes(anchor),'sonda de teste não conseguiu preparar o motor');
 source=source.replace(anchor,probe+anchor);
 vm.createContext(env);vm.runInContext('('+source+')()',env);
 function tick(count=1){
  for(let i=0;i<count;i++){
   now+=1000/60;
   const fn=frames.shift();assert.equal(typeof fn,'function');
   fn(now);
  }
 }
 const key=(type,name)=>{for(const fn of handlers[type]||[])fn({key:name,repeat:false,preventDefault(){}});};
 return {env,item,tick,key,
  start:()=>item('start').click(),
  restart:()=>item('restart').click(),
  arrangeClear:()=>env.__gfAdventureProbe.arrangeClear(),
  telemetry:()=>env.__gameforgeTelemetry(),
  probe:env.__gfAdventureProbe};
}
function finishStage(game){
 const number=game.telemetry().stage;
 game.arrangeClear();
 game.tick(2);
 assert.equal(game.telemetry().stage,number,'não avançar antes da transição de objetivo');
 game.tick(110);
}
test('GF-TRAIN-07 RPG: XP/poções/magia persistem entre 3 fases e reload',()=>{
 const db=makeStorage(),genre='rpg';
 const game=boot(genre,db);
 assert.equal(game.telemetry().state,'menu');
 game.start();game.tick(2);
 game.probe.setHealth(40);
 game.probe.boostRpg(3); // ganho real de XP: nível 2 e +1 poção
 assert.equal(game.telemetry().rpg.level,2);
 assert.equal(game.telemetry().rpg.xp,10);
 assert.equal(game.telemetry().rpg.potions,3);
 game.key('keydown','h');game.tick(2);game.key('keyup','h');
 assert.equal(game.telemetry().health,95,'XP restaura 20 de vida ao subir nível, poção restaura 35');
 assert.equal(game.telemetry().rpg.potions,2);
 game.probe.nearExit();game.tick(2);
 assert.equal(game.telemetry().stage,1,'o portal não abre enquanto houver guardas/cristais');
 finishStage(game);
 const finished=game.telemetry();
 assert.equal(finished.stage,2);
 assert.equal(finished.campaignSaveStatus,'saved');
 assert.equal(finished.score,300);
 assert.equal(finished.health,100);
 assert.equal(finished.rpg.level,2);
 assert.equal(finished.rpg.xp,10);
 assert.equal(finished.rpg.potions,2);
 const key=finished.campaignSaveKey;
 assert.equal(JSON.parse(db.getItem(key)).stage,1);
 assert.equal(JSON.parse(db.getItem(key)).rpg.level,2);
 const resumed=boot(genre,db);
 assert.equal(resumed.item('start').textContent,'Continuar · Fase 2');
 resumed.start();resumed.tick(2);
 const restored=resumed.telemetry();
 assert.equal(restored.stage,2);
 assert.equal(restored.score,300);
 assert.equal(restored.rpg.level,2);
 assert.equal(restored.rpg.xp,10);
 assert.equal(restored.rpg.potions,2);
 assert.equal(restored.campaignSaveStatus,'recovered');
 resumed.probe.defeat();
 assert.equal(resumed.telemetry().state,'defeat','dano real deve causar derrota');
 assert.equal(JSON.parse(db.getItem(key)).stage,1,'morrer não apaga o checkpoint');
 resumed.start();resumed.tick(2);
 assert.equal(resumed.telemetry().stage,2,'Tentar novamente inicia a última fase desbloqueada');
 assert.equal(resumed.telemetry().score,300,'derrota não duplica pontos');
 assert.deepEqual(JSON.parse(JSON.stringify(resumed.telemetry().rpg)),{level:2,xp:10,potions:2});
 // Iniciar uma nova fase não duplica prêmio anterior.
 assert.equal(JSON.parse(db.getItem(key)).stage,1);
 finishStage(resumed);
 assert.equal(resumed.telemetry().stage,3);
 assert.equal(JSON.parse(db.getItem(key)).stage,2);
 const final=boot(genre,db);
 final.start();final.tick(2);
 assert.equal(final.telemetry().stage,3);
 assert.equal(final.telemetry().rpg.level,2);
 finishStage(final);
 assert.equal(final.telemetry().state,'victory');
 assert.equal(final.telemetry().campaignSaveStatus,'complete');
 assert.equal(db.getItem(key),null);
 assert.equal(db.getItem(key+':backup'),null);
 const again=boot(genre,db);again.start();again.tick(2);
 assert.equal(again.telemetry().stage,1);
 assert.equal(again.telemetry().score,0);
 assert.equal(again.telemetry().rpg.level,1);
});

test('GF-TRAIN-07 plataforma: portal exige cristais, checkpoint salvo no começo da próxima fase',()=>{
 const db=makeStorage(),game=boot('platform',db);
 game.start();game.tick(2);
 const before=game.telemetry();
 assert.ok(before.required>=1);
 game.probe.nearExit();game.tick(2);
 assert.equal(game.telemetry().stage,1,'não pode avançar sem coletar cristais');
 const preCrystal=game.telemetry();
 game.probe.nearCrystal();game.tick(2);
 const picked=game.telemetry();
 assert.equal(picked.collected,preCrystal.collected+1,'colisão real deve coletar um cristal adicional');
 assert.equal(picked.score,preCrystal.score+80,'cada cristal coletado acrescenta 80 pontos');
 assert.equal(picked.campaignCheckpoint,0,'novo save parcial já existe dentro da fase um');
 assert.ok(picked.campaignProgress?.crystals.length>=1);
 finishStage(game);
 const advanced=game.telemetry();
 assert.equal(advanced.stage,2);
 assert.equal(advanced.score,picked.score+300);
 assert.equal(advanced.collected,0,'nova fase não herda cristais da fase anterior');
 assert.equal(advanced.campaignSaveStatus,'saved');
 const saved=JSON.parse(db.getItem(advanced.campaignSaveKey));
 assert.equal(saved.stage,1);
 assert.equal(saved.score,picked.score+300);
 assert.ok(!('rpg' in saved),'plataforma não possui inventário RPG fictício');
 const freshSession=boot('platform',db);
 freshSession.start();freshSession.tick(2);
 assert.equal(freshSession.telemetry().stage,2);
 assert.equal(freshSession.telemetry().score,picked.score+300);
 assert.equal(freshSession.telemetry().collected,0);
 freshSession.restart();freshSession.tick(2);
 assert.equal(freshSession.telemetry().stage,1);
 assert.equal(freshSession.telemetry().score,0);
 assert.equal(db.getItem(advanced.campaignSaveKey),null);
 assert.equal(db.getItem(advanced.campaignSaveKey+':backup'),null);
 const newSession=boot('platform',db);
 newSession.start();newSession.tick(2);
 assert.equal(newSession.telemetry().stage,1);
});

test('GF-TRAIN-07 nenhum checkpoint é introduzido em arena, FPS ou corrida 3D',()=>{
 for(const genre of ['arena','fps','racing']){
  const game=boot(genre);
  assert.equal(game.telemetry().campaignCheckpoint,null);
  assert.equal(game.telemetry().campaignSaveKey,null);
  game.start();game.tick(2);
  game.restart();game.tick(2);
  assert.equal(game.telemetry().state,'play');
 }
});


test('GF-TRAIN-08: cristal da fase 1 é salvo, reaberto e não paga pontos duas vezes',()=>{
 const db=makeStorage(),g=boot('platform',db);
 g.start();g.tick(2);
 assert.equal(g.telemetry().campaignCheckpoint,null);
 const before=g.telemetry();
 g.probe.nearCrystal();g.tick(2);
 const earned=g.telemetry();
 assert.equal(earned.collected,before.collected+1,'coleta executada no motor físico');
 assert.equal(earned.score,before.score+80);
 assert.equal(earned.campaignCheckpoint,0,'checkpoint parcial da primeira fase');
 assert.ok(earned.campaignProgress.crystals.length===1);
 const saved=JSON.parse(db.getItem(earned.campaignSaveKey));
 assert.equal(saved.score,earned.score);
 const resumed=boot('platform',db);
 assert.equal(resumed.item('start').textContent,'Continuar · Fase 1');
 resumed.start();resumed.tick(2);
 const current=resumed.telemetry();
 assert.equal(current.stage,1);
 assert.equal(current.score,earned.score,'restaurar não concede mais 80 pontos');
 assert.equal(current.collected,earned.collected,'cristal não retorna');
 assert.deepEqual(JSON.parse(JSON.stringify(current.campaignProgress)),saved.progress);
 resumed.tick(24);
 assert.equal(resumed.telemetry().score,earned.score,'cristal já coletado não recompensa outra vez');
 resumed.probe.defeat();
 assert.equal(resumed.telemetry().state,'defeat');
 resumed.start();resumed.tick(2);
 assert.equal(resumed.telemetry().collected,earned.collected);
 assert.equal(resumed.telemetry().score,earned.score,'derrota não duplica recompensa');
 resumed.restart();resumed.tick(2);
 assert.equal(resumed.telemetry().campaignCheckpoint,null);
 assert.equal(db.getItem(earned.campaignSaveKey),null);
 assert.equal(db.getItem(earned.campaignSaveKey+':backup'),null);
 const fresh=boot('platform',db);fresh.start();fresh.tick(2);
 assert.equal(fresh.telemetry().score,0);
 assert.equal(fresh.telemetry().collected,0);
});

test('GF-TRAIN-08: RPG salva abate por disparo real, preserva XP e remove inimigo derrotado',()=>{
 const db=makeStorage(),g=boot('rpg',db);g.start();g.tick(2);
 const initial=g.telemetry();
 assert.ok(initial.enemies>=3);
 assert.equal(g.probe.alignEnemy(),0);
 g.key('keydown',' ');
 let tries=0;
 while(g.telemetry().defeatedObjectives<1&&tries++<140)g.tick(1);
 g.key('keyup',' ');
 const dead=g.telemetry();
 assert.equal(dead.defeatedObjectives,1,'projétil real derrubou guarda');
 assert.equal(dead.score,70,'recompensa do primeiro guarda é 70');
 assert.equal(dead.rpg.xp,25,'XP do guarda foi calculado pelo RPG');
 assert.equal(dead.enemies,initial.enemies-1);
 assert.equal(dead.campaignCheckpoint,0);
 assert.deepEqual(JSON.parse(JSON.stringify(dead.campaignProgress.defeated)),[0]);
 const key=dead.campaignSaveKey,snapshot=JSON.parse(db.getItem(key));
 assert.equal(snapshot.score,70);
 assert.equal(snapshot.rpg.xp,25);
 const resumed=boot('rpg',db);resumed.start();resumed.tick(2);
 const recovered=resumed.telemetry();
 assert.equal(recovered.stage,1);
 assert.equal(recovered.enemies,initial.enemies-1,'inimigo não ressuscita');
 assert.equal(recovered.score,70,'restaurar inimigo derrotado não concede pontos');
 assert.equal(recovered.rpg.xp,25,'XP não é pago duas vezes');
 assert.equal(recovered.ammo,snapshot.ammo);
 resumed.tick(10);
 assert.equal(resumed.telemetry().score,70);
 resumed.probe.defeat();
 assert.equal(resumed.telemetry().state,'defeat');
 resumed.start();resumed.tick(2);
 assert.equal(resumed.telemetry().enemies,initial.enemies-1);
 assert.equal(resumed.telemetry().rpg.xp,25);
 assert.equal(resumed.telemetry().score,70);
});

test('GF-TRAIN-08: pousar numa ilha nova salva posição segura sem liberar portal',()=>{
 const db=makeStorage(),g=boot('platform',db);g.start();g.tick(2);
 assert.equal(g.probe.landOnPlatform(3),true);
 g.tick(2);
 const checkpoint=g.telemetry();
 assert.ok(checkpoint.platformCheckpoint>=1,'mecânica real marcou pouso');
 assert.equal(checkpoint.campaignCheckpoint,0,'pouso salva ainda na fase 1');
 assert.equal(checkpoint.campaignProgress.platformCheckpoint,checkpoint.platformCheckpoint);
 assert.equal(checkpoint.score,0,'pouso não cria prêmio monetário');
 const revived=boot('platform',db);revived.start();revived.tick(2);
 const restored=revived.telemetry();
 assert.equal(restored.platformCheckpoint,checkpoint.platformCheckpoint);
 assert.equal(restored.stage,1);
 assert.equal(restored.score,0);
 assert.ok(restored.player.x>100,'retomada aparece na última plataforma segura');
 assert.equal(restored.campaignSaveStatus,'recovered');
 assert.ok(restored.collected<restored.required,'checkpoint intermediário não desbloqueia portal');
});

test('GF-TRAIN-08: save parcial preserva versão antiga da fase 2 e reinício elimina backups',()=>{
 const db=makeStorage(),g=boot('rpg',db);g.start();g.tick(2);
 g.arrangeClear();g.tick(112);
 assert.equal(g.telemetry().stage,2);
 const key=g.telemetry().campaignSaveKey;
 const previous=JSON.parse(db.getItem(key));
 assert.equal(previous.stage,1);
 assert.equal(previous.progress,undefined,'checkpoint entre fases ainda é compatível com v7');
 const restarted=boot('rpg',db);restarted.start();restarted.tick(2);
 assert.equal(restarted.telemetry().stage,2);
 restarted.probe.nearCrystal();restarted.tick(2);
 const partial=JSON.parse(db.getItem(key));
 assert.equal(partial.stage,1);
 assert.ok(partial.progress?.crystals.length>=1,'marco da segunda fase foi salvo');
 assert.equal(partial.score,previous.score+80);
 const reopen=boot('rpg',db);reopen.start();reopen.tick(2);
 assert.equal(reopen.telemetry().stage,2);
 assert.equal(reopen.telemetry().score,partial.score);
 assert.equal(reopen.telemetry().collected,partial.progress.crystals.length);
 reopen.restart();reopen.tick(2);
 assert.equal(reopen.telemetry().stage,1);
 assert.equal(reopen.telemetry().score,0);
 assert.equal(db.getItem(key),null);
 assert.equal(db.getItem(key+':backup'),null,'backup de fase 2 não pode ressuscitar');
});
