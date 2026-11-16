'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const createRules=require('../js/urban-rules.js');
const R=createRules();
test('URB-01 colisão do jogador usa volumes XZ reais e permite deslizar na parede',()=>{
 const blocks=[{x:-8,z:0,w:4,d:5}];
 const actor={x:-5,z:0};
 const blocked=R.move(actor,-3,0,blocks,17,.4);
 assert.equal(blocked.x,-5,'não atravessa edifício');
 const slide=R.move(actor,-3,-4,blocks,17,.4);
 assert.equal(slide.x,-5);
 assert.equal(slide.z,-4,'continua deslizando pelo eixo livre');
 const bounds=R.move({x:16.5,z:16.5},80,90,[],17,.4);
 assert.ok(bounds.x<=16.6&&bounds.z<=16.6);
});
test('URB-01 tiro respeita direção, alcance e oclusão dos edifícios',()=>{
 const shot={x:0,z:9,heading:0};
 assert.equal(R.canHit(shot,{x:0,z:1.5},[]),true);
 assert.equal(R.canHit(shot,{x:0,z:19},[]),false,'nunca atirar para trás');
 assert.equal(R.canHit(shot,{x:0,z:-20},[]),false,'respeita alcance');
 const wall=[{x:0,z:5,w:2,d:2}];
 assert.equal(R.canHit(shot,{x:0,z:1.5},wall),false,'muro bloqueia o disparo');
});
test('URB-01 captura exige proximidade, eliminação do guarda e concede recompensa uma vez',()=>{
 const base={cash:1000,guardDefeated:false,captured:false,rewardGranted:false};
 assert.equal(R.capture(base,true).changed,false);
 assert.equal(R.capture({...base,guardDefeated:true},false).changed,false);
 const first=R.capture({...base,guardDefeated:true},true);
 assert.equal(first.changed,true);
 assert.equal(first.state.cash,1450);
 assert.equal(first.state.missionComplete,true);
 const repeated=R.capture(first.state,true);
 assert.equal(repeated.changed,false);
 assert.equal(repeated.state.cash,1450);
});
test('URB-01 save valida versão/tipos/posições e nunca recupera objetos de motor',()=>{
 const saved={version:1,x:100,z:-100,health:150,cash:2000,ammo:9,reserve:20,
  guardHp:0,guardDefeated:true,captured:true,rewardGranted:true,heading:0};
 const restored=R.load(saved);
 assert.equal(restored.x,16.5);assert.equal(restored.z,-16.5);
 assert.equal(restored.health,100);
 assert.equal(restored.captured,true);
 assert.equal(restored.rewardGranted,true);
 assert.equal(restored.guardHp,0);
 assert.equal(R.load({...saved,version:2}),null);
 assert.equal(R.load({...saved,x:'alert(1)'}),null);
 assert.equal(R.load({...saved,cash:Infinity}),null);
 assert.equal(R.load({...saved,guardDefeated:'yes'}),null);
});
