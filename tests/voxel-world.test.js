'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const K=require('../js/voxel-kit.js'),W=require('../js/voxel-world.js')(K);
test('GF-VOXEL-01: terreno por seed, dezesseis chunks, faces expostas e emendas',()=>{
 const a=W.create(12345),b=W.create(12345),c=W.create(723);
 assert.equal(a.chunkKeys().length,16);
 assert.deepEqual(a.mesh(0,0).positions,b.mesh(0,0).positions);
 assert.notDeepEqual(a.mesh(0,0).positions,c.mesh(0,0).positions);
 const before=a.mesh(0,0);
 assert.ok(before.faces>0&&before.faces<16*160*16*6);
 assert.equal(before.positions.length,before.faces*18);
 assert.equal(before.colors.length,before.positions.length);
 const dirty=a.edit(15,80,2,3);
 assert.ok(dirty.includes('0,0')&&dirty.includes('1,0'));
 assert.equal(a.get(15,80,2),3);
 assert.equal(a.mesh(0,0).faces,before.faces+6);
 assert.equal(a.edit(15,80,2,0).length,2);
 assert.equal(a.edits().length,0);
});
test('GF-VOXEL-01: raycast minera e coloca em célula vazia sem atravessar jogador',()=>{
 const a=W.create(12345),p=a.spawn();
 assert.ok(p&&!a.collides(p.x,p.y,p.z));
 assert.equal(a.collides(p.x,p.y-.25,p.z),true);
 assert.equal(a.collides(-32,p.y,p.z),true);
 const o=[p.x,p.y+1.58,p.z],hit=a.ray(o,[0,-1,0]);
 assert.ok(hit&&hit.id===1);
 assert.equal(a.place(hit,2,p),null,'não construir dentro do corpo');
 assert.ok(a.mine(hit));assert.equal(a.get(...hit.cell),0);
 const next=a.ray(o,[0,-1,0]);
 assert.ok(a.place(next,2,p));assert.equal(a.get(...hit.cell),2);
 assert.equal(a.edit(0,0,0,0),null,'base não removível');
 assert.equal(a.ray(o,[0,0,0]),null);
 assert.equal(a.ray(o,[0,1,0]),null);
});
test('GF-VOXEL-01: save preserva edições e jogador; rejeita incompatibilidade e colisão',()=>{
 const config={title:'Teste',seed:12345},a=W.create(config.seed),player=a.spawn();
 a.edit(15,80,2,3);
 const save={version:1,...config,edits:a.edits(),player,mined:1,placed:2};
 const restored=W.readSave(JSON.stringify(save),config);
 assert.deepEqual(restored.player,player);
 assert.equal(restored.world.get(15,80,2),3);
 assert.equal(restored.placed,2);
 for(const corrupt of [{...save,seed:999},{...save,edits:[[0,0,0,0]]},{...save,player:{...player,y:1}},{...save,edits:[...save.edits,...save.edits]}])
  assert.equal(W.readSave(JSON.stringify(corrupt),config),null);
 assert.notEqual(W.saveKey(config),W.saveKey({...config,seed:5}));
});
test('GF-VOXEL-01: exportação autônoma com motor local, sem mudar gerador clássico',()=>{
 require('../vendor/three-source.js');require('../js/generator.js');
 require('../js/voxel-world.js');require('../js/voxel-runtime.js');
 const B=require('../js/voxel-builder.js');
 const files=B.generate({title:'Teste <Voxel>',seed:42});
 assert.match(files['index.html'],/Teste &lt;Voxel&gt;/);
 assert.match(files['index.html'],/src="engine-3d.js"/);
 assert.ok(files['engine-3d.js'].length>10000);
 assert.ok(files['THREE-LICENSE.txt'].length>100);
 assert.match(files['game.js'],/const GAME_SPEC = .*"engineMode":"voxel-v1"/);
 assert.doesNotThrow(()=>new vm.Script(files['game.js']));
 assert.throws(()=>B.generate({title:'Inválido',seed:-1}),/seed/);
});
