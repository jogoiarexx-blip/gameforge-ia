'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),K=require('../js/voxel-kit.js'),L=require('../js/voxel-landscape.js'),F=require('../js/voxel-streaming.js')(),I=require('../js/voxel-infinite.js')(K,L,F);
const memory=()=>{const data=new Map();return {read:async k=>data.get(k),write:async(k,v)=>data.set(k,JSON.parse(JSON.stringify(v)))};};
test('prefetch cruza região e snapshots concordam na borda',async()=>{
 const w=I.create({seed:12345,adapter:memory(),maxResident:9});
 assert.equal(w.canEnter(0,0),false);await w.prepare(127,127);assert.ok(w.canEnter(128,128));
 await w.edit(127,110,127,3);await w.edit(128,110,128,2);
 const a=w.snapshot(7,7,8),b=w.snapshot(8,8,8);
 assert.equal(a[(110*32+23)*32+23],3);assert.equal(b[(110*32+8)*32+8],2);
 assert.equal(a[(110*32+24)*32+24],b[(110*32+8)*32+8]);
});
test('regiões distantes descarregam e recuperam edições inclusive após reabrir',async()=>{
 const adapter=memory(),w=I.create({seed:12345,adapter,maxResident:9});
 await w.prepare(-1,-1);await w.edit(-1,110,-1,3);
 await w.prepare(500000,-500000);await w.edit(500000,120,-500000,4);
 assert.ok(w.stats().resident<=9);assert.ok(w.stats().columns<=4096);
 assert.throws(()=>w.get(-1,110,-1));await w.prepare(-1,-1);assert.equal(w.get(-1,110,-1),3);
 const fresh=I.create({seed:12345,adapter,maxResident:9});await fresh.prepare(500000,-500000);assert.equal(fresh.get(500000,120,-500000),4);
 assert.equal(w.base(50,60,50),fresh.base(50,60,50));
});
test('falha de gravação não autoriza travessia nem perde bloco',async()=>{
 let fail=true;const data=new Map(),adapter={read:async k=>data.get(k),write:async(k,v)=>{if(fail)throw Error('disk');data.set(k,v);}};
 const w=I.create({seed:12345,adapter,maxResident:9});await w.prepare(0,0);await w.edit(0,110,0,3);
 await assert.rejects(w.prepare(500000,0));assert.equal(w.canEnter(500000,0),false);assert.equal(w.get(0,110,0),3);
 fail=false;await w.prepare(500000,0);await w.prepare(0,0);assert.equal(w.get(0,110,0),3);
});
test('plano legado valida sem gravar e rejeita árvores e duplicatas',()=>{
 assert.equal(I.legacyPlan({version:1,seed:1,edits:[[-1,110,-1,3],[128,110,0,2]]}).parts.length,2);
 assert.throws(()=>I.legacyPlan({version:1,seed:1,edits:[],trees:[]}));
 assert.throws(()=>I.legacyPlan({version:1,seed:1,edits:[[0,110,0,3],[0,110,0,2]]}));
});
