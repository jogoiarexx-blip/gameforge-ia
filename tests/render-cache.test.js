'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const makeCache=require('../js/render-cache');
test('cache: reutiliza valor e remove o menos recentemente consultado',()=>{
 const c=makeCache({maxEntries:2,maxBytes:100});const freed=[];
 c.put('a',{id:'a'},30,v=>freed.push(v.id));c.put('b',{id:'b'},30,v=>freed.push(v.id));
 assert.equal(c.get('a').id,'a');
 c.put('c',{id:'c'},30,v=>freed.push(v.id));
 assert.equal(c.get('b'),undefined);assert.deepEqual(freed,['b']);
 assert.equal(c.snapshot().entries,2);assert.equal(c.snapshot().bytes,60);
 c.clear();assert.equal(c.snapshot().bytes,0);assert.equal(freed.length,3);
});
test('cache: orçamento em bytes, rejeição de item grande e troca inválida preservam dados',()=>{
 const c=makeCache({maxEntries:10,maxBytes:100});c.put('original',5,40);
 assert.equal(c.put('original',7,101),false);assert.equal(c.get('original'),5);
 assert.equal(c.put('nan',7,NaN),false);assert.equal(c.put('negative',7,-2),false);
 c.put('new',6,70);assert.equal(c.get('original'),undefined);assert.equal(c.snapshot().bytes,70);
 assert.ok(c.snapshot().bytes<=c.snapshot().maxBytes);
});
test('cache: descarte com erro não interfere no fluxo e substituição libera exatamente uma vez',()=>{
 let calls=0;const c=makeCache({maxEntries:1,maxBytes:100});
 c.put('one',1,10,()=>{calls++;throw Error('teste');});
 assert.doesNotThrow(()=>c.put('one',2,20));assert.equal(calls,1);assert.equal(c.get('one'),2);
 c.clear();assert.equal(c.snapshot().entries,0);
});
test('cache: frames procedurais e superfícies são rasterizados uma vez por chave',()=>{
 const old=global.document;let painted=0,draws=0;
 const context=canvas=>new Proxy({canvas},{get:(t,k)=>k in t?t[k]:k==='createLinearGradient'?()=>({addColorStop(){}}):k==='drawImage'?()=>{draws++;}:()=>{painted++;},set:(t,k,v)=>(t[k]=v,true)});
 const canvas=()=>{const cv={width:1,height:1};cv.getContext=()=>context(cv);return cv;};
 global.document={createElement:canvas};
 try{
  const c=context(canvas()),V=require('../js/graphics-runtime')({renderProfile:{quality:'high'}});
  V.actor(c,10,20,18,'#5ab4ba',0);const count=painted;
  V.actor(c,80,90,18,'#5ab4ba',0);assert.equal(painted,count,'segunda posição reaproveita o mesmo frame');
  assert.equal(V.snapshot().cache.hits,1);assert.equal(draws,2);
  V.surface(c,0,0,100,24);const after=painted;V.surface(c,200,0,100,24);assert.equal(painted,after);
  assert.equal(V.snapshot().cache.entries,2);assert.ok(V.snapshot().cache.bytes<=4194304);
  for(let i=0;i<200;i++)V.actor(c,0,0,18,'#'+i.toString(16).padStart(6,'0'),0);
  assert.ok(V.snapshot().cache.entries<=64);assert.ok(V.snapshot().cache.bytes<=4194304);assert.ok(V.snapshot().cache.evictions>0);
 }finally{global.document=old;}
});
