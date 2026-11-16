'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const world=require('../js/world-rules.js')();

test('direção de perseguição é normalizada e não altera alvo ou inimigo',()=>{
 const target={x:5,z:0},enemy={id:0,x:0,z:0,hp:3},actors=[enemy];
 const snapshot=JSON.stringify([target,enemy]);
 const direction=world.crowdDirection(enemy,target,actors);
 assert.ok(Math.abs(direction.x-1)<1e-9);
 assert.ok(Math.abs(direction.z)<1e-9);
 assert.equal(JSON.stringify([target,enemy]),snapshot);
});
test('pares sobrepostos recebem direções opostas sem depender do RNG',()=>{
 const a={id:0,x:0,z:0,hp:2},b={id:1,x:0,z:0,hp:2},all=[a,b],target={x:0,z:5};
 const va=world.crowdDirection(a,target,all),vb=world.crowdDirection(b,target,all);
 assert.ok(va.x<0&&vb.x>0,'sobreposição deve dispersar inimigos para lados opostos');
 for(const v of [va,vb])assert.ok(Math.abs(Math.hypot(v.x,v.z)-1)<1e-8);
 assert.deepEqual(world.crowdDirection(a,target,all),va);
});
test('inimigos distantes ou mortos não afastam perseguidores',()=>{
 const a={id:0,x:0,z:0,hp:2},dead={id:1,x:.1,z:0,hp:0},far={id:2,x:40,z:40,hp:3};
 const v=world.crowdDirection(a,{x:0,z:-9},[a,dead,far]);
 assert.ok(Math.abs(v.x)<1e-10);
 assert.ok(Math.abs(v.z+1)<1e-10);
});
test('aglomeração pequena se dispersa ao perseguir o jogador',()=>{
 const actors=[{id:0,x:-.01,z:9,hp:2},{id:1,x:.01,z:9,hp:2}];
 const target={x:0,z:0};
 const initial=Math.hypot(actors[0].x-actors[1].x,actors[0].z-actors[1].z);
 for(let i=0;i<40;i++){
  const directions=actors.map(a=>world.crowdDirection(a,target,actors));
  actors.forEach((a,i)=>{a.x+=directions[i].x*.03;a.z+=directions[i].z*.03;});
 }
 const separation=Math.hypot(actors[0].x-actors[1].x,actors[0].z-actors[1].z);
 assert.ok(separation>initial+.2,'aglomeração persistiu: '+separation);
 assert.ok(actors.every(a=>a.z<9),'não perseguiram o jogador');
});
