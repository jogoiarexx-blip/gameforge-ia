'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const K=require('../js/voxel-kit.js'),W=require('../js/voxel-world.js')(K),E=require('../js/voxel-economy.js')(K),D=require('../js/voxel-storage.js')(E);
const cfg={title:'Baús',seed:12345,mode:'resources',storage:true,forest:false,survival:false};
function setup(){
 const w=W.create(cfg.seed,[],{storage:true}),p=w.spawn(),s=D.initial();
 const y=K.heightAt(cfg.seed,2,0),hit={cell:[2,y,0],previous:[2,y+1,0],id:1};
 const crafted=E.craft(E.initial(),4,0,w,p);
 assert.ok(crafted.ok);
 const placed=D.place(s,w,p,crafted.inventory,hit);assert.ok(placed);
 return {w,p,s,c:hit.previous,bag:placed.bag};
}
test('GF-VOXEL-06: baú exige alcance e conserva quantidade em transferências atômicas',()=>{
 const {w,p,s,c,bag}=setup();
 assert.equal(w.get(...c),12);assert.equal(E.count(bag,12),0);
 assert.equal(D.transfer(s,w,{...p,x:20},bag,c,3,1,'deposit'),null);
 const deposited=D.transfer(s,w,p,bag,c,3,2,'deposit');assert.ok(deposited);
 assert.equal(E.count(deposited,3)+E.count(s.chests[0].bag,3),E.count(bag,3));
 assert.equal(D.mine(s,w,deposited,{cell:c,id:12}),null);
 assert.equal(w.get(...c),12);
 const before=JSON.stringify(s);
 const full=Array.from({length:12},()=>({id:3,qty:99}));
 assert.equal(D.transfer(s,w,p,full,c,3,1,'withdraw'),null);
 assert.equal(JSON.stringify(s),before);
 const returned=D.transfer(s,w,p,deposited,c,3,2,'withdraw');assert.ok(returned);
 assert.deepEqual(returned,bag);
 const removed=D.mine(s,w,returned,{cell:c,id:12});assert.ok(removed);
 assert.equal(s.chests.length,0);assert.equal(w.get(...c),0);assert.equal(E.count(removed.bag,12),1);
});
test('GF-VOXEL-06: drop consome item, atraso impede retorno imediato, coleta não duplica',()=>{
 const {p,s,bag}=setup();
 assert.equal(D.drop(s,bag,p,2,-1),null);
 const dropped=D.drop(s,bag,p,2,1);assert.ok(dropped);assert.equal(E.count(dropped,2),E.count(bag,2)-1);
 assert.equal(D.collect(s,dropped,p,.1).collected,0);
 const away={...p,x:p.x+5};
 for(let i=0;i<7;i++)assert.equal(D.collect(s,dropped,away,.25).collected,0);
 const full=Array.from({length:12},()=>({id:3,qty:99}));
 assert.equal(D.collect(s,full,p,.1).collected,0);assert.equal(s.drops.length,1);
 const pickup=D.collect(s,dropped,p,.1);assert.equal(pickup.collected,1);assert.equal(E.count(pickup.bag,2),E.count(bag,2));
 assert.equal(s.drops.length,0);assert.equal(D.collect(s,pickup.bag,p,.1).collected,0);
});
test('GF-VOXEL-06: save preserva baús e drops, rejeita registros órfãos ou duplicados',()=>{
 const {w,p,s,c,bag}=setup();
 const deposited=D.transfer(s,w,p,bag,c,3,2,'deposit');
 const dropped=D.drop(s,deposited,p,2,1);
 const record={version:1,title:cfg.title,seed:cfg.seed,mode:'resources',player:p,edits:w.edits(),mined:0,placed:1,bag:dropped,equipped:false,selected:12,storage:s};
 const read=r=>W.readSave(JSON.stringify(r),cfg,E,null,D);
 const restored=read(record);assert.ok(restored);assert.deepEqual(restored.storage,s);assert.equal(restored.world.get(...c),12);
 assert.equal(read({...record,storage:{...s,chests:[]}}),null);
 assert.equal(read({...record,storage:{...s,drops:[...s.drops,s.drops[0]]}}),null);
 assert.equal(W.readSave(JSON.stringify(record),{...cfg,storage:false},E,null,D),null);
 assert.notEqual(W.saveKey(cfg),W.saveKey({...cfg,storage:false}));
});
