'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),F=require('../js/voxel-streaming.js')();
test('água desce, espalha, respeita paredes, orçamento e remoção',()=>{
 const w=F.water({sources:[[0,5,0]],solid:(x,y,z)=>y===0||x===2,active:(x,y,z)=>Math.abs(x)<=8&&Math.abs(z)<=8});
 assert.equal(w.cells.get('0,1,0').falling,true);assert.ok(w.at(1,1,0));assert.equal(w.at(2,1,0),0);
 assert.equal(F.water({sources:[],solid:()=>false}).cells.size,0);
 assert.equal(F.water({sources:[[0,5,0]],solid:()=>false,budget:2}).truncated,true);
});
test('luz bloqueada e AO',()=>{
 const l=F.light({sources:[[0,2,0,8]],opaque:x=>x===1,active:(x,y,z)=>Math.abs(x)<9&&Math.abs(z)<9&&y<10});
 assert.equal(l.at(2,2,0),0);assert.equal(l.at(-1,2,0),7);
 assert.equal(F.ambient(false,false,false),1);assert.equal(F.ambient(true,true,true),.4);
});
test('regiões negativas e distantes, save individual e restauração',async()=>{
 const data=new Map(),adapter={read:async k=>data.get(k),write:async(k,v)=>data.set(k,JSON.parse(JSON.stringify(v)))};
 const s=F.streaming({base:()=>0,adapter,maxResident:1});
 await s.edit(-1,5,-1,3);await s.edit(1e6,5,1e6,4);
 assert.ok(data.has('-1,-1'));assert.equal(s.stats().resident,1);assert.throws(()=>s.get(-1,5,-1));
 await s.load(-1,-1);assert.equal(s.get(-1,5,-1),3);await s.edit(-1,5,-1,0);await s.flush();assert.equal(data.get('-1,-1').edits.length,0);
 await s.load(1e6,1e6);assert.equal(s.get(1e6,5,1e6),4);
});
test('falha de save preserva região suja e rejeita registros corrompidos',async()=>{
 const s=F.streaming({base:()=>0,maxResident:1,adapter:{read:async()=>null,write:async()=>{throw Error('disk');}}});
 await s.edit(0,5,0,1);await assert.rejects(s.load(128,0));assert.equal(s.get(0,5,0),1);assert.equal(s.stats().dirty,1);
 const b=F.streaming({base:()=>0,adapter:{read:async()=>({version:1,id:'0,0',edits:[[128,5,0,1]]}),write:async()=>{}}});await assert.rejects(b.load(0,0));
});
