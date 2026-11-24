'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const K=require('../js/voxel-kit.js'),LF=require('../js/voxel-landscape.js'),L=LF(K),W=require('../js/voxel-world.js')(K),G=require('../js/voxel-terrain.js')(K,LF),M=require('../js/voxel-mesher.js')(),E=require('../js/voxel-economy.js')(K),X=require('../js/voxel-textures.js')(K),A=require('../js/voxel-atlas.js')();
test('GF-VOXEL-14: biomas por seed, pinheiros, palmeiras e novas superfícies',()=>{
 const cfg={size:512,title:'Biomas',seed:12345,landscape:true,biomes:true,forest:true,mode:'resources'};
 const w=W.create(cfg.seed,[],cfg),old=W.create(cfg.seed,[],{size:512,landscape:true});
 const samples={};let cactus=null;
 for(let x=-256;x<256;x++)for(let z=-256;z<256;z++){
  const c=L.column(cfg.seed,x,z,false,true);
  if(!samples[c.biome])samples[c.biome]=[x,z,c.h];
  if(c.cactus&&!cactus)cactus=[x,c.h+1,z];
 }
 for(const b of ['snow','desert','swamp','lake'])assert.ok(samples[b],b);
 const [sx,sz,sy]=samples.snow;assert.equal(w.get(sx,sy,sz),31);assert.notEqual(old.get(sx,sy,sz),31);
 const [dx,dz,dy]=samples.desert;assert.equal(w.get(dx,dy,dz),29);
 const [lx,lz,ly]=samples.lake;assert.equal(w.get(lx,ly,lz),32);assert.equal(w.get(lx,ly+1,lz),28);
 assert.ok(cactus);assert.equal(w.get(...cactus),33);
 assert.ok(w.forestState().some(t=>t.style===2));assert.ok(w.forestState().some(t=>t.style===3));
 for(const [x,z] of [samples.snow,samples.desert,samples.lake]){
  const cx=Math.floor(x/16),cz=Math.floor(z/16);
  assert.deepEqual(G.snapshot(w.terrainJob(cx,cz)),w.snapshot(cx,cz));
 }
 const rec={version:1,title:cfg.title,seed:cfg.seed,size:cfg.size,landscape:true,biomes:true,forest:true,player:w.spawn(),mode:'resources',edits:w.edits(),trees:w.forestState(),mined:0,placed:0,bag:E.initial(),equipped:false,selected:31};
 const saved=W.readSave(JSON.stringify(rec),cfg,E);assert.ok(saved);assert.deepEqual(saved.world.forestState(),w.forestState());
 assert.equal(W.readSave(JSON.stringify(rec),{...cfg,biomes:false},E),null);
 assert.notEqual(W.saveKey(cfg),W.saveKey({...cfg,biomes:false}));
});
test('GF-VOXEL-14: novos materiais editáveis, coletáveis e com tiles próprios',()=>{
 const atlas=X.generate(12345).data;
 for(const [id,label] of [[31,'Neve'],[32,'Lama'],[33,'Cacto']]){
  const tile=X.tile(id,1);assert.equal(A.LABELS[tile],label);assert.equal(A.extract(atlas,tile).length,1024);
  assert.ok(E.change(E.initial(),id,1));
  const p=new Uint8Array(18*18*160);p[(50*18+1)*18+1]=id;
  const mesh=M.build(p,0,0,true);assert.equal(mesh.faces,6);assert.ok(mesh.tiles.every(t=>t===tile));
 }
 assert.equal(W.create(12345).edit(0,110,0,31),null);
});
