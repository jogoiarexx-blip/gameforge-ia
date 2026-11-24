'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const K=require('../js/voxel-kit.js'),L=require('../js/voxel-landscape.js')(K),W=require('../js/voxel-world.js')(K),E=require('../js/voxel-economy.js')(K),D=require('../js/voxel-storage.js')(E),A=require('../js/voxel-atmosphere.js')(K);
test('GF-VOXEL-11: 1024 chunks possíveis, cache limitado e edições/árvores sobrevivem à evicção',()=>{
 const cfg={title:'512',seed:12345,size:512,landscape:true,details:true,forest:true,mode:'resources',storage:true};
 const w=W.create(cfg.seed,[],cfg),p=w.spawn();
 assert.equal(w.chunkKeys().length,1024);assert.equal(w.cacheStats().resident,0);assert.equal(w.cacheStats().generated,0);
 const tree=w.forestState().find(t=>t.x>150&&t.z>100);assert.ok(tree);
 const hit={cell:[tree.x,tree.y,tree.z],id:8};assert.ok(w.cutTree(hit));assert.ok(w.edit(200,110,200,3));
 const first=w.snapshot(12,12);
 for(let x=-16;x<0;x++)for(let z=-16;z<-9;z++)w.snapshot(x,z);
 assert.equal(w.cacheStats().resident,96);assert.ok(w.cacheStats().evicted>0);assert.equal(w.cacheStats().voxelBytes,3932160);
 assert.deepEqual(w.snapshot(12,12),first);assert.equal(w.get(...hit.cell),0);assert.equal(w.get(200,110,200),3);
 const record={version:1,size:512,landscape:true,details:true,forest:true,title:cfg.title,seed:cfg.seed,mode:'resources',player:p,edits:w.edits(),trees:w.forestState(),mined:1,placed:1,bag:E.initial(),equipped:false,selected:2,storage:D.initial()};
 const saved=W.readSave(JSON.stringify(record),cfg,E,null,D);assert.ok(saved);
 assert.equal(saved.world.cacheStats().resident,0);assert.equal(saved.world.get(...hit.cell),0);assert.equal(saved.world.get(200,110,200),3);
 assert.equal(saved.world.get(256,10,0),0);assert.notEqual(W.saveKey(cfg),W.saveKey({...cfg,size:256}));
});
test('GF-VOXEL-11: atmosfera determinística com noite, chuva e tempo ativo',()=>{
 assert.deepEqual(A.sample(12345,40),A.sample(12345,40));
 assert.equal(A.sample(12345,10).night,false);assert.equal(A.sample(12345,100).night,true);
 let rain=false,clear=false;for(let t=0;t<500;t++){const s=A.sample(12345,t);rain||=s.rain;clear||=!s.rain;assert.ok(s.day>=0&&s.day<=1);}
 assert.ok(rain&&clear);
});
