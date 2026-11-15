'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../js/runtime-template.js'),'utf8');
const start=src.indexOf('  function racingAdvanceLane(');
const end=src.indexOf('  function stepRacing(dt)',start);
assert.ok(start>=0&&end>start,'racing helpers exist');
const factory=new Function('obstacles',src.slice(start,end)+';return {racingAdvanceLane,racingLaneClear};');
test('lane movement is continuous and frame-rate independent',()=>{
  const {racingAdvanceLane:advance}=factory([]);
  for(const fps of [30,60,120]){
    let position=0;
    for(let i=0;i<fps;i++)position=advance(position,2,1/fps);
    assert.ok(Math.abs(position-1.35)<1e-9);
    for(let i=0;i<fps;i++)position=advance(position,2,1/fps);
    assert.equal(position,2);
  }
});
test('cones and transitioning cars block lane changes',()=>{
  const car={lane:0,y:120};
  assert.equal(factory([{lane:1,y:100,kind:'cone'}]).racingLaneClear(car,1),false);
  assert.equal(factory([{lane:2,lanePosition:1.4,y:100,kind:'car'}]).racingLaneClear(car,1),false);
  assert.equal(factory([{lane:1,y:400,kind:'car'}]).racingLaneClear(car,1),true);
  assert.equal(factory([{lane:1,y:100,kind:'car',hit:true}]).racingLaneClear(car,1),true);
});
test('runtime uses interpolated position for collision and spawn occupancy',()=>{
  assert.match(src,/o\.lanePosition=racingAdvanceLane/);
  assert.match(src,/o\.x=W\/2\+\(\(o\.lanePosition\?\?o\.lane\)-1\)\*125/);
  assert.match(src,/Math\.abs\(\(o\.lanePosition\?\?o\.lane\)-lane\)<\.8/);
});
