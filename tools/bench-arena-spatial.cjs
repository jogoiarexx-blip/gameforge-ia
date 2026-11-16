'use strict';
// Microbenchmark informativo: mede apenas procura/colisão, não FPS nem render.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');

const source=fs.readFileSync(path.join(__dirname,'../js/runtime-template.js'),'utf8');
const start=source.indexOf('  function circlesOverlap(');
const end=source.indexOf('  let stage =',start);
assert.ok(start>=0&&end>start,'núcleo espacial não encontrado no runtime');
const ctx={};
vm.runInNewContext(source.slice(start,end)+';this.ops={circle:circlesOverlap,build:buildBulletGrid,near:nearbyBullets};',ctx);
const {circle,build,near}=ctx.ops;

function rng(seed){
 let value=seed>>>0;
 return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
}
function makeScene(seed,enemyCount,bulletCount){
 const random=rng(seed);
 const enemies=Array.from({length:enemyCount},()=>({x:random()*960,y:random()*540,r:random()<.08?31:15}));
 const bullets=Array.from({length:bulletCount},()=>({x:random()*960,y:random()*540,r:5}));
 return {enemies,bullets};
}
function scan(scene,indexed){
 const grid=indexed?build(scene.bullets):null;
 let comparisons=0,hits=0;
 for(const e of scene.enemies){
  const candidates=indexed?near(grid,e.x,e.y,e.r):scene.bullets;
  for(const b of candidates){
   comparisons++;
   if(circle(b,e)){hits++;break;}
  }
 }
 return {comparisons,hits};
}
function median(data){
 const sorted=[...data].sort((a,b)=>a-b);
 return sorted[Math.floor(sorted.length/2)];
}
console.log('Benchmark de busca de projéteis (Node '+process.version+'); não equivale a FPS real.');
console.log('Inclui construção da grade; não inclui renderização, movimento ou dano.');
for(const [enemyCount,bulletCount] of [[12,30],[50,200],[140,650],[280,1300]]){
 const frames=Array.from({length:28},(_,i)=>makeScene(701+i*139+enemyCount,enemyCount,bulletCount));
 // Aquecimento JIT fora da região medida.
 for(let i=0;i<5;i++){scan(frames[i],false);scan(frames[i],true);}
 const results={brute:[],grid:[]};
 let expectedHits=0,bruteComparisons=0,gridComparisons=0;
 for(const frame of frames){
  const brute=scan(frame,false),grid=scan(frame,true);
  assert.equal(grid.hits,brute.hits,'quantidade de acertos diferente');
  expectedHits+=brute.hits;
  bruteComparisons+=brute.comparisons;
  gridComparisons+=grid.comparisons;
 }
 for(let round=0;round<3;round++){
  for(const indexed of round%2?[true,false]:[false,true]){
   const name=indexed?'grid':'brute';
   const begin=performance.now();
   for(let repeat=0;repeat<2;repeat++)for(const frame of frames)scan(frame,indexed);
   results[name].push(performance.now()-begin);
  }
 }
 const oldMs=median(results.brute),newMs=median(results.grid);
 console.log(JSON.stringify({enemies:enemyCount,bullets:bulletCount,frames:28,
  bruteMs:Number(oldMs.toFixed(2)),gridMs:Number(newMs.toFixed(2)),
  ratio:Number((oldMs/newMs).toFixed(2)),
  bruteChecks:bruteComparisons,gridChecks:gridComparisons,hits:expectedHits
 }));
}
