'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('../js/flight-rules.js')();
function takeoff(g,hz){for(let i=0;i<3*hz;i++)g.update(1/hz,{throttle:1,pitch:.6});}
test('GF-TRAIN-28: três perfis decolam, voam em XYZ e são determinísticos',()=>{
 for(const kind of ['dragon','airplane','spaceship']){
  const a=F.create({kind}),b=F.create({kind});takeoff(a,30);takeoff(b,120);
  assert.equal(a.snapshot().player.grounded,false);assert.ok(a.snapshot().player.y>1);
  assert.deepEqual(a.snapshot(),b.snapshot());
  a.update(1/30,{turn:1,pitch:1});assert.notEqual(a.snapshot().player.yaw,0);
  assert.ok(a.snapshot().player.roll<0);assert.ok(Number.isFinite(a.camera().fov));
 }
});
test('GF-TRAIN-28: turbo gasta energia, recuperação e limite de projéteis',()=>{
 const a=F.create();takeoff(a,60);for(let i=0;i<120;i++)a.update(1/60,{boost:true,fire:true,pitch:.2});
 assert.ok(a.snapshot().player.energy<100);assert.ok(a.snapshot().shots.length<=96);
 const energy=a.snapshot().player.energy;for(let i=0;i<60;i++)a.update(1/60,{});
 assert.ok(a.snapshot().player.energy>energy);a.reset();assert.equal(a.snapshot().player.energy,100);
});
test('GF-TRAIN-28: alvo na direção do voo, projétil contínuo e alvo morto excluído',()=>{
 const p={x:0,y:10,z:0,yaw:0,pitch:0},e=[{id:'behind',x:0,y:10,z:-2,hp:10},{id:'dead',x:0,y:10,z:3,hp:0},{id:'front',x:0,y:10,z:20,hp:10}];
 assert.equal(F.target(p,e).id,'front');
 assert.equal(F.segmentDistance({x:0,y:0,z:0},{x:0,y:0,z:10},{x:0,y:0,z:5}),0);
});
