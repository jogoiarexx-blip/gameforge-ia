'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const Save=require('../js/urban-save.js')();
const Adventure=require('../js/adventure-campaign-save.js')();

const rpg={title:'Guardiões da Bruma',genre:'rpg',dimension:'3d',
 stages:['Bosque','Vale','Templo'],stageConfig:[{mission:'eliminate'},{mission:'collect'},{mission:'survive'}],
 worldOptions:{seed:345},features:{bosses:true},tuning:{difficulty:1}};
const platform={...rpg,genre:'platform',title:'Ilhas da Aurora'};
const data={stage:1,score:790,health:75,ammo:120,rpg:{level:3,xp:42,potions:5}};
const storage=()=>{
 const map=new Map();
 return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),
  removeItem:k=>map.delete(k)};
};

test('GF-TRAIN-07: checkpoint RPG preserva nível, XP, poções, vida, munição e pontuação',()=>{
 const saved=Adventure.make(rpg,data);
 assert.deepEqual(saved,{
  version:1,fingerprint:Adventure.fingerprint(rpg),stage:1,
  score:790,health:75,ammo:120,rpg:{level:3,xp:42,potions:5}
 });
 assert.deepEqual(Adventure.validate(rpg,saved),saved);
 assert.equal(Adventure.key(rpg),Adventure.key({...rpg,stages:rpg.stages.slice()}));
 assert.notEqual(Adventure.key(rpg),Adventure.key({...rpg,stageConfig:[{mission:'collect'}]}));
 assert.notEqual(Adventure.key(rpg),Adventure.key({...rpg,tuning:{difficulty:2}}));
 assert.notEqual(Adventure.key(rpg),Adventure.key(platform),'projetos RPG e plataforma não misturam saves');
});

test('GF-TRAIN-07: checkpoint plataforma não inventa inventário ou poções',()=>{
 const cp=Adventure.make(platform,{stage:2,score:1800,health:95,ammo:150});
 assert.ok(cp&&!('rpg' in cp));
 assert.equal(cp.stage,2);
 assert.equal(Adventure.validate(platform,{...cp,rpg:{level:30,xp:0,potions:9}}),null);
 assert.equal(Adventure.make(platform,{stage:3,score:1800,health:95,ammo:150}),null);
 assert.equal(Adventure.validate(rpg,cp),null);
});

test('GF-TRAIN-07: save falso/corrompido não desbloqueia fases nem melhora o herói',()=>{
 const valid=Adventure.make(rpg,data);
 for(const patch of [
  {stage:0},{stage:3},{stage:1.5},{stage:99},
  {score:-10},{score:Infinity},{score:'9999'},
  {health:0},{health:101},{health:'99'},
  {ammo:-1},{ammo:NaN},{ammo:'1'},
  {rpg:{level:31,xp:42,potions:4}},
  {rpg:{level:3,xp:-1,potions:4}},
  {rpg:{level:3,xp:42,potions:10}},
  {rpg:{level:'3',xp:42,potions:5}},
  {rpg:null},{version:2},{fingerprint:'externo'}
 ]){
  assert.equal(Adventure.validate(rpg,{...valid,...patch}),null,
   'payload malformado: '+JSON.stringify(patch));
 }
 assert.equal(Adventure.validate({...rpg,genre:'arena'},valid),null);
 assert.equal(Adventure.validate({...rpg,dimension:'2d'},valid),null);
 assert.equal(Adventure.validate({...rpg,stages:['Única']},valid),null);
 assert.equal(Adventure.validate(rpg,'text'),null);
 assert.equal(Adventure.validate(rpg,[]),null);
 assert.equal(Adventure.validate(rpg,null),null);
});

test('GF-TRAIN-07: usa backup de save válido; limpar novo jogo impede ressuscitar backup',()=>{
 const db=storage(),key=Adventure.key(rpg);
 const save=Save.create(()=>db,key,value=>Adventure.validate(rpg,value));
 const early=Adventure.make(rpg,data);
 const late=Adventure.make(rpg,{...data,stage:2,score:1400,rpg:{level:4,xp:15,potions:3}});
 assert.equal(save.write(early),true);
 assert.equal(save.write(late),true);
 assert.equal(save.read().stage,2);
 db.setItem(key,'{json inválido');
 assert.equal(save.read().stage,1,'usa o último backup válido');
 db.setItem(key+':backup',JSON.stringify({...early,stage:99}));
 assert.equal(save.read(),null,'backup forjado é rejeitado');
 save.remove();
 assert.equal(db.getItem(key),null);
 assert.equal(db.getItem(key+':backup'),null);
 assert.equal(db.getItem(key+':pending'),null);
});

test('GF-TRAIN-07: sem armazenamento o checkpoint é opcional, não quebra o motor',()=>{
 const save=Save.create(()=>{throw Error('localStorage bloqueado');},
  Adventure.key(rpg),value=>Adventure.validate(rpg,value));
 assert.equal(save.read(),null);
 assert.equal(save.write(Adventure.make(rpg,data)),false);
 assert.equal(save.remove(),false);
});

test('GF-TRAIN-07: RPG e plataforma geram arquivos offline com dependências e sem CDN',()=>{
 for(const mod of ['runtime-template','shooter-runtime','world-rules','software-renderer',
  'three-runtime','urban-save','adventure-campaign-save','shooter-3d-runtime'])require('../js/'+mod+'.js');
 require('../vendor/three-source.js');
 const G=require('../js/generator.js');
 const Parser=require('../js/parser.js');
 for(const [genre,command] of [
  ['rpg','Crie um RPG 3D com 3 fases, magia, experiência e poções.'],
  ['platform','Crie um jogo de plataforma 3D com 3 fases e cristais.']
 ]){
  const spec=Parser.parseGdd('',command,{genre,dimension:'3d'});
  const files=G.generate(spec,'');
  assert.ok(files['engine-3d.js']&&files['game.js']);
  assert.match(files['game.js'],/const GameForgeAdventureCampaignSave =/);
  assert.match(files['game.js'],/const GameForgeUrbanSave =/);
  assert.doesNotThrow(()=>new vm.Script(files['game.js']));
  assert.ok(!/https?:\/\/(?:cdn|jsdelivr|unpkg)/i.test(files['index.html']));
 }
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(html,/js\/adventure-campaign-save\.js/);
 const build=fs.readFileSync(path.join(__dirname,'../tools/build-browser-fixtures.cjs'),'utf8');
 assert.match(build,/'adventure-campaign-save'/);
});


test('GF-TRAIN-08: checkpoint da primeira fase só existe após objetivo verificado',()=>{
 const empty={stage:0,score:0,health:100,ammo:80,
  rpg:{level:1,xp:0,potions:2},progress:{crystals:[],defeated:[],platformCheckpoint:0}};
 assert.equal(Adventure.make(rpg,empty),null,'não salvar apenas por abrir jogo novo');
 const crystal=Adventure.make(rpg,{...empty,score:80,progress:{...empty.progress,crystals:[1]}});
 assert.ok(crystal);
 assert.equal(crystal.stage,0,'fase um é indice zero');
 assert.deepEqual(crystal.progress,{crystals:[1],defeated:[],platformCheckpoint:0});
 assert.deepEqual(Adventure.validate(rpg,crystal),crystal);
 const defeat=Adventure.make(rpg,{...empty,score:70,rpg:{level:1,xp:25,potions:2},
  progress:{...empty.progress,defeated:[0]}});
 assert.ok(defeat,'abate real pode registrar checkpoint mesmo sem cristal');
 const landing=Adventure.make(platform,{stage:0,score:0,health:90,ammo:80,
  progress:{crystals:[],defeated:[],platformCheckpoint:2}});
 assert.ok(landing,'pousar numa ilha segura permite continuar na fase um');
});

test('GF-TRAIN-08: IDs repetidos, fora de ordem, contagem excessiva ou gênero errado são rejeitados',()=>{
 const base={...data,stage:0,progress:{crystals:[0,2],defeated:[1],platformCheckpoint:0}};
 assert.ok(Adventure.make(rpg,base));
 for(const progress of [
  {crystals:[0,0],defeated:[1],platformCheckpoint:0},
  {crystals:[2,1],defeated:[1],platformCheckpoint:0},
  {crystals:[-1],defeated:[1],platformCheckpoint:0},
  {crystals:[100],defeated:[1],platformCheckpoint:0},
  {crystals:[0],defeated:[1,1],platformCheckpoint:0},
  {crystals:[],defeated:[0.5],platformCheckpoint:0},
  {crystals:[0],defeated:[],platformCheckpoint:41},
  {crystals:[0],defeated:[],platformCheckpoint:1},
  {crystals:Array.from({length:101},(_,i)=>i),defeated:[],platformCheckpoint:0},
  {crystals:[0],defeated:[],platformCheckpoint:'2'},
  {crystals:[0],defeated:[],platformCheckpoint:-2}
 ]){
  assert.equal(Adventure.make(rpg,{...base,progress}),null,
   'checkpoint inválido aceito: '+JSON.stringify(progress).slice(0,120));
 }
 assert.equal(Adventure.make(platform,{
  stage:0,score:50,health:90,ammo:80,
  progress:{crystals:[],defeated:[0],platformCheckpoint:1}
 }),null,'plataforma não possui inimigos abatidos no runtime');
 assert.equal(Adventure.validate(rpg,{...Adventure.make(rpg,base),progress:null}),null);
});

test('GF-TRAIN-08: save da versão 7 sem progress continua recuperável',()=>{
 const older=Adventure.make(rpg,data);
 assert.ok(older&&!('progress' in older));
 assert.equal(Adventure.validate(rpg,older).stage,1);
 const db=storage(),key=Adventure.key(rpg),store=Save.create(db,key,x=>Adventure.validate(rpg,x));
 assert.equal(store.write(older),true);
 const mid=Adventure.make(rpg,{...data,stage:1,
  progress:{crystals:[0,1],defeated:[0,2],platformCheckpoint:0}});
 assert.equal(store.write(mid),true);
 assert.deepEqual(store.read().progress,mid.progress);
 db.setItem(key,'{');
 assert.equal(store.read().stage,1);
 assert.equal(store.read().progress,undefined,'backup v7 não é invalidado pelo GF-TRAIN-08');
});
