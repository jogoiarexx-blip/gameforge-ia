'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const K=require('../js/voxel-kit.js'),L=require('../js/voxel-landscape.js'),W=require('../js/voxel-world.js')(K),G=require('../js/voxel-terrain.js')(K,L),M=require('../js/voxel-mesher.js')(),I=require('../js/voxel-lighting.js')(),E=require('../js/voxel-economy.js')(K);
test('GF-VOXEL-12: worker terrain matches local terrain including cross-chunk edits and forest',()=>{
 const cfg={size:1024,seed:12345,title:'GF 1024',landscape:true,details:true,lighting:true,forest:true,mode:'resources'};
 const w=W.create(cfg.seed,[],cfg);assert.equal(w.chunkKeys().length,4096);assert.equal(w.cacheStats().resident,0);
 const y=L(K).column(cfg.seed,0,0,true).h+3;
 assert.ok(w.edit(0,y,0,30));assert.ok(w.edit(-1,110,0,3));assert.ok(w.edit(16,110,0,2));
 for(const [cx,cz] of [[0,0],[-1,0],[20,20],[-32,-32]]){
  const job=w.terrainJob(cx,cz),expected=w.snapshot(cx,cz);
  assert.deepEqual(G.snapshot(job),expected);
 }
 const mesh=M.build(G.snapshot(w.terrainJob(0,0)),0,0,true,true);
 assert.equal(mesh.tiles.filter(v=>v===30).length,72);
 assert.equal(w.solid(0,y,0),false);assert.equal(w.torchCount(),1);
 const p={x:.5,y:y+.45,z:.5},lights=w.nearbyTorches(p);
 assert.equal(I.strength(p.x,p.y,p.z,lights),1);assert.equal(I.strength(p.x+8,p.y,p.z,lights),0);
 const record={version:1,size:1024,landscape:true,details:true,lighting:true,forest:true,title:cfg.title,seed:cfg.seed,mode:'resources',player:w.spawn(),edits:w.edits(),trees:w.forestState(),mined:0,placed:3,bag:E.initial(),equipped:false,selected:30};
 const restored=W.readSave(JSON.stringify(record),cfg,E);assert.ok(restored);assert.equal(restored.world.torchCount(),1);
 assert.ok(restored.world.mine({cell:[0,y,0],id:30}));assert.equal(restored.world.torchCount(),0);
 assert.notEqual(W.saveKey(cfg),W.saveKey({...cfg,lighting:false}));
});
test('GF-VOXEL-12: torch recipe atomic and lighting optional',()=>{
 const w=W.create(12345,[],{lighting:true,forest:true}),p=w.spawn();
 let bag=E.change(E.initial(),8,1);
 const r=E.craft(bag,13,0,w,p);assert.ok(r.ok);assert.equal(E.count(r.inventory,30),2);assert.equal(E.count(r.inventory,8),0);assert.equal(E.count(r.inventory,3),11);
 assert.equal(E.craft(E.initial(),13,0,w,p).ok,false);
 assert.equal(W.create(12345).edit(0,110,0,30),null);
});
