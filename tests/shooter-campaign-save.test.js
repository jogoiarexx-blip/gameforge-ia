'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const Campaign=require('../js/shooter-campaign-save.js')();
const Save=require('../js/urban-save.js')();
const base={title:'Céu Despedaçado',genre:'shooter',dimension:'3d',
 stages:['A','B','C'],stageConfig:[{boss:'no'},{boss:'yes'},{boss:'yes'}],
 tuning:{difficulty:1},shooterOptions:{boss:true}};
const specimen={stage:1,score:1400,weapon:2,health:75,kills:12};
const storage=()=>{
 const map=new Map();
 return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),
  removeItem:k=>map.delete(k),map};
};

test('GF-TRAIN-06: checkpoint só aceita fase realmente desbloqueada e dados válidos',()=>{
 const valid=Campaign.make(base,specimen);
 assert.deepEqual(valid,{version:1,fingerprint:Campaign.fingerprint(base),...specimen});
 assert.deepEqual(Campaign.validate(base,valid),valid);
 for(const patch of [
  {stage:0},{stage:-1},{stage:3},{stage:100},{stage:1.5},
  {health:0},{health:101},{health:NaN},{health:'75'},
  {score:-100},{score:Infinity},{score:'99999999'},
  {weapon:9},{kills:-1},{version:99},{fingerprint:'fake'}
 ]){
  assert.equal(Campaign.validate(base,{...valid,...patch}),null,
   'Dado malformado/fora de limite aceito: '+JSON.stringify(patch));
 }
 assert.equal(Campaign.validate(base,'{'),null);
 assert.equal(Campaign.validate(base,[]),null);
 assert.equal(Campaign.validate(base,null),null);
});

test('GF-TRAIN-06: identidade separa projetos e versões sem clobber',()=>{
 const same=JSON.parse(JSON.stringify(base));
 assert.equal(Campaign.key(base),Campaign.key(same));
 const changed={...base,stageConfig:[{boss:'yes'},{boss:'yes'},{boss:'yes'}]};
 assert.notEqual(Campaign.key(changed),Campaign.key(base));
 assert.equal(Campaign.validate(changed,Campaign.make(base,specimen)),null);
 assert.notEqual(Campaign.key({...base,title:'Outro céu'}),Campaign.key(base));
 assert.notEqual(Campaign.key({...base,stages:['A','B']}),Campaign.key(base));
});

test('GF-TRAIN-06: save corrompido usa backup; saves invalidos não viram checkpoint',()=>{
 const db=storage(),key=Campaign.key(base);
 const store=Save.create(db,key,data=>Campaign.validate(base,data));
 const first=Campaign.make(base,specimen);
 const second=Campaign.make(base,{...specimen,stage:2,score:2900,kills:22});
 assert.equal(store.write(first),true);
 assert.equal(store.write(second),true);
 assert.equal(store.read().stage,2);
 db.setItem(key,'{bad');
 assert.equal(store.read().stage,1,'backup anterior válido');
 db.setItem(key+':backup',JSON.stringify({...first,stage:99}));
 assert.equal(store.read(),null,'não restaurar backup forjado');
 db.setItem(key,JSON.stringify(first));
 assert.equal(store.remove(),true);
 assert.equal(db.getItem(key),null);
 assert.equal(db.getItem(key+':backup'),null);
});

test('GF-TRAIN-06: sem localStorage jogo continua jogável sem exceção',()=>{
 const store=Save.create(()=>{throw Error('Storage blocked');},Campaign.key(base),
  data=>Campaign.validate(base,data));
 assert.equal(store.read(),null);
 assert.equal(store.write(Campaign.make(base,specimen)),false);
 assert.equal(store.remove(),false);
});

test('GF-TRAIN-06: export offline embute fábrica de checkpoint, sem CDN',()=>{
 const modules=[
  'runtime-template','shooter-runtime','world-rules','software-renderer','three-runtime',
  'shooter-3d-runtime','urban-save','shooter-campaign-save'
 ];
 for(const mod of modules)require('../js/'+mod+'.js');
 require('../vendor/three-source.js');
 const Parser=require('../js/parser');
 const Generator=require('../js/generator');
 const spec=Parser.parseGdd('', 'Crie um jogo de navinha 3D com 3 fases e chefe somente na última.',
  {genre:'auto',dimension:'auto'});
 const files=Generator.generate(spec,'');
 assert.match(files['game.js'],/const GameForgeShooterCampaignSave =/);
 assert.match(files['game.js'],/const GameForgeUrbanSave =/);
 assert.match(files['game.js'],/gameforge-shooter-campaign-v1-/);
 assert.doesNotThrow(()=>new vm.Script(files['game.js']));
 assert.ok(!/https?:\/\/(?:cdn|unpkg|jsdelivr)/i.test(files['index.html']));
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(html,/js\/shooter-campaign-save\.js/,'o Studio precisa carregar o módulo sem Node');
 const build=fs.readFileSync(path.join(__dirname,'../tools/build-browser-fixtures.cjs'),'utf8');
 assert.match(build,/'shooter-campaign-save'/);
});
