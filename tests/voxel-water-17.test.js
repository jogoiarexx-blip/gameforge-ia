'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),K=require('../js/voxel-kit.js'),L=require('../js/voxel-landscape.js'),W=require('../js/voxel-world.js')(K),F=require('../js/voxel-streaming.js')(),G=require('../js/voxel-terrain.js')(K,L),M=require('../js/voxel-mesher.js')();
test('queda, corrente, barragem, reabertura e fluxo não persistente',()=>{
 const w=W.create(12345,[],{size:64,landscape:true,dynamicWater:true}),p={x:.5,z:.5},o={radius:16,budget:2048,extraSources:[[0,110,0]]};
 assert.ok(w.updateWater(p,F,o).length);assert.equal(w.get(0,109,0),28);assert.equal(w.waterCurrent(0,109,0)[1],-1);
 assert.ok(w.edit(0,109,0,3));w.updateWater(p,F,o);assert.equal(w.get(0,109,0),3);assert.equal(w.edits().length,1);
 assert.ok(w.edit(0,109,0,0));w.updateWater(p,F,o);assert.equal(w.get(0,109,0),28);assert.equal(w.edits().length,0);
 assert.equal(w.updateWater(p,F,o).length,0);assert.ok(w.waterStats().cells<=2048);
 const s=G.snapshot(w.terrainJob(0,0));assert.equal(s[(109*18+1)*18+1],47);assert.ok(M.build(s,0,0,true).tiles.includes(26));
});
test('altura parcial e ausência de mudanças no modo legado',()=>{
 const p=new Uint8Array(18*18*160);p[(10*18+1)*18+1]=43;
 const m=M.build(p,0,0,true);assert.ok(m.positions.some((v,i)=>i%3===1&&v===10.5));
 const w=W.create(12345,[],{landscape:true});assert.deepEqual(w.updateWater({x:0,z:0},F),[]);assert.equal(w.waterStats().cells,0);
});
