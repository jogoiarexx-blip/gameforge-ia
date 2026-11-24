'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const K=require('../js/voxel-kit.js'),L=require('../js/voxel-landscape.js'),W=require('../js/voxel-world.js')(K),G=require('../js/voxel-terrain.js')(K,L),R=require('../js/voxel-regions.js')();
test('GF-VOXEL-13: regiões negativas, checkpoint sem duplicar e rejeição de partes inválidas',()=>{
 const record={version:1,regionRevision:42,edits:[[-1,50,-1,3],[128,50,0,2],[0,50,0,1]],trees:[{x:-128,y:51,z:-129,grown:true,remaining:0}]};
 const {manifest,parts}=R.split(record);
 assert.equal(R.region(-1,-1),'-1,-1');assert.equal(R.region(-128,-129),'-1,-2');
 assert.equal(parts.length,4);
 const saved=R.join(manifest,parts);assert.deepEqual(saved.trees,record.trees);
 assert.deepEqual(saved.edits.slice().sort(),record.edits.slice().sort());
 assert.throws(()=>R.join(manifest,parts.slice(1)));
 assert.throws(()=>R.join({...manifest,regionRevision:-1},parts));
 const corrupt=structuredClone(parts);corrupt[0].edits[0][0]=1024;
 assert.throws(()=>R.join(manifest,corrupt));
});
test('GF-VOXEL-13: mapa 4096 finito e restauração regional distante',()=>{
 const cfg={title:'GF Regioes',seed:12345,size:4096,landscape:true,details:true,regional:true};
 const w=W.create(cfg.seed,[],cfg);
 assert.equal(w.cacheStats().total,65536);assert.equal(w.cacheStats().resident,0);
 assert.ok(w.edit(-1900,110,1900,3));assert.ok(w.edit(1800,110,-1700,2));
 const record={version:1,title:cfg.title,seed:cfg.seed,size:4096,landscape:true,details:true,regionRevision:42,player:w.spawn(),edits:w.edits(),mined:0,placed:2};
 const {manifest,parts}=R.split(record),saved=W.readSave(JSON.stringify(R.join(manifest,parts)),cfg);
 assert.ok(saved);assert.equal(saved.world.get(-1900,110,1900),3);assert.equal(saved.world.get(1800,110,-1700),2);
 assert.deepEqual(G.snapshot(w.terrainJob(-119,118)),w.snapshot(-119,118));
 assert.ok(w.cacheStats().resident<=96);assert.equal(w.edit(2048,110,0,3),null);
 assert.notEqual(W.saveKey(cfg),W.saveKey({...cfg,regional:false}));
});
