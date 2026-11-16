'use strict';
// Microbenchmark informativo de broadphase (sem render, dano ou FPS real).
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
vm.runInNewContext(source.slice(start,end)+';this.ops={circle:circlesOverlap,build:buildBulletGrid,near:nearbyBullets,indexes:nearbyBulletIndexes};',ctx);
const {circle,build,near,indexes}=ctx.ops;

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
// brute: varredura linear; compat: objetos em lista nova por inimigo;
// reused: caminho de produção, com indices/buckets/buffer reutilizados.
function scan(scene,mode,cache){
 const grid=mode==='brute'?null:build(scene.bullets,64,mode==='reused'?cache.grid:null);
 if(mode==='reused')cache.grid=grid;
 let comparisons=0,hits=0;
 for(const e of scene.enemies){
  const candidates=mode==='brute'?scene.bullets:mode==='compat'?near(grid,e.x,e.y,e.r):indexes(grid,e.x,e.y,e.r);
  for(const candidate of candidates){
   const b=mode==='reused'?scene.bullets[candidate]:candidate;
   comparisons++;
   if(circle(b,e)){hits++;break;}
  }
 }
 return {comparisons,hits};
}
function median(values){
 const ordered=[...values].sort((a,b)=>a-b);
 return ordered[Math.floor(ordered.length/2)];
}
const modes=['brute','compat','reused'];
console.log('Benchmark de colisões (Node '+process.version+'); não é benchmark de FPS.');
console.log('Inclui construção/reutilização da grade. Não inclui render, IA, física ou dano.');
for(const [enemyCount,bulletCount] of [[12,30],[50,200],[140,650],[280,1300]]){
 const frames=Array.from({length:28},(_,i)=>makeScene(701+i*139+enemyCount,enemyCount,bulletCount));
 const initial=modes.map(mode=>{
  const cache={grid:null};
  let comparisons=0,hits=0;
  for(const frame of frames){
   const v=scan(frame,mode,cache);comparisons+=v.comparisons;hits+=v.hits;
  }
  return {comparisons,hits};
 });
 assert.equal(initial[1].hits,initial[0].hits);
 assert.equal(initial[2].hits,initial[0].hits);
 for(const mode of modes){
  const cache={grid:null};
  for(let i=0;i<5;i++)scan(frames[i],mode,cache);
 }
 const samples={brute:[],compat:[],reused:[]};
 for(let round=0;round<3;round++){
  for(const mode of round%2?['reused','compat','brute']:modes){
   const cache={grid:null};
   const begin=performance.now();
   for(let repeat=0;repeat<2;repeat++)for(const frame of frames)scan(frame,mode,cache);
   samples[mode].push(performance.now()-begin);
  }
 }
 const bruteMs=median(samples.brute),compatMs=median(samples.compat),reusedMs=median(samples.reused);
 console.log(JSON.stringify({
  enemies:enemyCount,bullets:bulletCount,frames:28,
  bruteMs:+bruteMs.toFixed(2),compatMs:+compatMs.toFixed(2),reusedMs:+reusedMs.toFixed(2),
  speedupVsBrute:+(bruteMs/reusedMs).toFixed(2),
  speedupVsCompat:+(compatMs/reusedMs).toFixed(2),
  bruteChecks:initial[0].comparisons,spatialChecks:initial[2].comparisons,hits:initial[0].hits
 }));
}
