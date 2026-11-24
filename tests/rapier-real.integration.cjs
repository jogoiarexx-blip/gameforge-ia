'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('@dimforge/rapier3d-compat');
const factory=require('../js/rapier-physics.js')();
test('Rapier real: gravidade, chão, impulso, raycast, plataforma e descarte',async()=>{
 const world=await factory.init(R);
 try{
  world.add('floor',{kind:'box',half:{x:12,y:.5,z:12}},{x:0,y:-.5,z:0});
  world.add('crate',{kind:'box',half:{x:.5,y:.5,z:.5}},{x:0,y:4,z:0},{type:'dynamic',ccd:true});
  world.add('lift',{kind:'box',half:{x:1,y:.2,z:1}},{x:5,y:1,z:0},{type:'kinematic'});
  for(let i=0;i<180;i++)world.step(1/60);
  const settled=world.pose('crate').position;
  assert.ok(settled.y>.4&&settled.y<.65,JSON.stringify(settled));
  assert.equal(world.ray({x:0,y:6,z:0},{x:0,y:-3,z:0},10)?.id,'crate');
  assert.ok(world.impulse('crate',{x:3,y:3,z:0}));
  world.moveKinematic('lift',{x:5,y:2,z:0});world.step(1/60);
  assert.ok(Math.abs(world.pose('lift').position.y-2)<.01);
  for(let i=0;i<15;i++)world.step(1/60);
  assert.ok(world.pose('crate').position.x>.1);
  assert.throws(()=>world.add('crate',{kind:'sphere',radius:1},{x:0,y:1,z:0}));
  assert.equal(world.remove('crate'),true);assert.equal(world.pose('crate'),null);
  assert.equal(world.step(0),0);assert.equal(world.step(1),5);
 }finally{world.dispose();}
 assert.equal(world.stats().closed,true);world.dispose();assert.throws(()=>world.step(1/60));
});
test('Rapier real: rampa inclinada e passo fixo independente de FPS',async()=>{
 const a=await factory.init(R),b=factory.create(R);
 try{
  for(const w of [a,b]){
   w.add('ramp',{kind:'box',half:{x:2,y:.2,z:3}},{x:0,y:1,z:0},{rotation:{x:Math.sin(.18),y:0,z:0,w:Math.cos(.18)}});
   w.add('ball',{kind:'sphere',radius:.4},{x:0,y:4,z:0},{type:'dynamic'});
  }
  for(let i=0;i<60;i++)a.step(1/30);
  for(let i=0;i<240;i++)b.step(1/120);
  assert.equal(a.stats().steps,120);assert.equal(b.stats().steps,120);
  assert.ok(Math.abs(a.pose('ball').position.y-b.pose('ball').position.y)<1e-5);
 }finally{a.dispose();b.dispose();}
});
