'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/runtime-template.js'),'utf8');
const start=source.indexOf('  function racingAdvanceLane(');
const end=source.indexOf('  function stepRacing(dt)',start);
assert.ok(start>=0&&end>start,'helpers de corrida presentes');
function logic(obstacles=[]){
  const context={obstacles};
  vm.runInNewContext(source.slice(start,end)+';this.advance=racingAdvanceLane;this.clear=racingLaneClear;',context);
  return context;
}
test('troca de faixa e independente do passo de simulacao',()=>{
  for(const dt of [1/30,1/60,1/120]){
    const {advance}=logic();let position=0;
    for(let t=0;t<3;t+=dt)position=advance(position,2,dt);
    assert.equal(position,2);
  }
});
test('troca e continua sem teletransporte',()=>{
  const {advance}=logic();assert.ok(advance(0,1,1/60)<.03);
});
test('cone e carro em transicao bloqueiam corredor',()=>{
  assert.equal(logic([{lane:1,y:100,kind:'cone'}]).clear({lane:0,y:120},1),false);
  assert.equal(logic([{lane:2,lanePosition:1.4,y:100}]).clear({lane:0,y:120},1),false);
});
test('origem ocupada impede cruzamento e faixa distante fica livre',()=>{
  assert.equal(logic([{lane:0,y:100}]).clear({lane:0,y:120},1),false);
  assert.equal(logic([{lane:2,y:100}]).clear({lane:0,y:120},1),true);
});
test('trafego distante nao bloqueia troca',()=>{
  assert.equal(logic([{lane:1,y:400}]).clear({lane:0,y:120},1),true);
});
