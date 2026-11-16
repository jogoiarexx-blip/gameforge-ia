'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../js/runtime-template.js'),'utf8');
const start=source.indexOf('  function circlesOverlap(');
const end=source.indexOf('  let stage =',start);
assert.ok(start>=0&&end>start,'geometria e índice espacial do runtime presentes');
const ctx={};
vm.runInNewContext(source.slice(start,end)+';this.ops={circle:circlesOverlap,build:buildBulletGrid,near:nearbyBullets};',ctx);
const {circle,build,near}=ctx.ops;

function rng(seed){
 let value=seed>>>0;
 return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
}
function scene(seed,enemyCount,bulletCount){
 const random=rng(seed);
 const enemies=Array.from({length:enemyCount},(_,id)=>({
  id,x:-100+random()*1160,y:-100+random()*740,
  r:id%11===0?90:id%5===0?31:15,hp:1+id%4,
  vx:(random()-.5)*19,vy:(random()-.5)*15
 }));
 const bullets=Array.from({length:bulletCount},(_,id)=>{
  const e=enemies.length&&id%4===0?enemies[id%enemies.length]:null;
  return {id,x:e?e.x+(random()-.5)*75:-100+random()*1160,
   y:e?e.y+(random()-.5)*75:-100+random()*740,
   r:id%13===0?65:5,vx:(random()-.5)*36,vy:(random()-.5)*36};
 });
 return {enemies,bullets};
}
function run(initial,indexed){
 let enemies=initial.enemies.map(e=>({...e})),bullets=initial.bullets.map(b=>({...b}));
 const events=[];
 for(let frame=0;frame<5;frame++){
  for(const e of enemies){e.x+=e.vx;e.y+=e.vy;}
  for(const b of bullets){b.x+=b.vx;b.y+=b.vy;}
  const grid=indexed?build(bullets):null;
  for(const e of enemies){
   const candidates=indexed?near(grid,e.x,e.y,e.r):bullets;
   for(const b of candidates)if(!b.dead&&circle(b,e)){
    b.dead=true;e.hp-=1;
    events.push([frame,e.id,b.id,e.hp]);
    if(e.hp<=0)e.dead=true;
    break;
   }
  }
  bullets=bullets.filter(b=>!b.dead);
  enemies=enemies.filter(e=>!e.dead);
 }
 return {events,enemies:enemies.map(e=>[e.id,e.hp]),bullets:bullets.map(b=>b.id)};
}
test('grade espacial equivale à varredura completa em 120 cenas determinísticas',()=>{
 for(let seed=1;seed<=30;seed++){
  for(const [enemies,bullets] of [[1,1],[12,35],[40,140],[100,350]]){
   const input=scene(seed*197+enemies,enemies,bullets);
   assert.deepEqual(run(input,true),run(input,false),'divergência: seed='+seed+', E='+enemies+', B='+bullets);
  }
 }
});
test('chefes e projéteis maiores que uma célula colidem sem falsos negativos',()=>{
 const input={
  enemies:[{id:1,x:0,y:0,r:95,hp:1,vx:0,vy:0}],
  bullets:[{id:2,x:130,y:0,r:40,vx:0,vy:0}]
 };
 const result=run(input,true);
 assert.deepEqual(result,run(input,false));
 assert.deepEqual(result.events,[[0,1,2,0]]);
});
test('projétil atingindo dois alvos mantém prioridade do primeiro inimigo',()=>{
 const input={
  enemies:[{id:3,x:40,y:40,r:20,hp:1,vx:0,vy:0},{id:4,x:40,y:40,r:20,hp:1,vx:0,vy:0}],
  bullets:[{id:8,x:40,y:40,r:5,vx:0,vy:0}]
 };
 assert.deepEqual(run(input,true),run(input,false));
 assert.deepEqual(run(input,true).events,[[0,3,8,0]]);
});
