'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const K=require('../js/voxel-kit.js'),L=require('../js/voxel-landscape.js')(K),W=require('../js/voxel-world.js')(K),M=require('../js/voxel-mesher.js')(),X=require('../js/voxel-textures.js')(K),E=require('../js/voxel-economy.js')(K);
test('GF-VOXEL-09: atlas procedural determinístico, madeira/grama por face',()=>{
 const a=X.generate(12345),b=X.generate(12345),c=X.generate(12346);
 assert.equal(a.width,128);assert.equal(a.height,64);assert.equal(a.data.length,32768);
 assert.deepEqual(a.data,b.data);assert.notDeepEqual(a.data,c.data);
 assert.notEqual(X.tile(1,1),X.tile(1,0));assert.notEqual(X.tile(8,1),X.tile(8,0));
});
test('GF-VOXEL-09: greedy combina faces coplanares sem ocultar bordas',()=>{
 const p=new Uint8Array(18*18*160),set=(x,y,z,id)=>p[(y*18+z+1)*18+x+1]=id;
 for(let x=0;x<16;x++)for(let z=0;z<16;z++)set(x,1,z,3);
 let mesh=M.build(p,0,0,true);
 assert.equal(mesh.faces,6);assert.equal(mesh.exposed,576);
 assert.equal(mesh.positions.length,108);assert.equal(mesh.uv.length,72);assert.equal(mesh.tiles.length,36);
 assert.ok(mesh.uv.some(v=>v===16));
 for(let z=0;z<16;z++)set(16,1,z,3);
 mesh=M.build(p,0,0,true);
 assert.equal(mesh.faces,5);assert.equal(mesh.exposed,560);
});
test('GF-VOXEL-09: paisagem e árvores distintas, tamanho, limites e save longe da origem',()=>{
 const cfg={size:128,landscape:true,forest:true,mode:'resources',title:'Landscape',seed:12345};
 const w=W.create(cfg.seed,[],cfg),p=w.spawn(),trees=w.forestState();
 assert.equal(w.chunkKeys().length,64);assert.equal(w.MIN,-64);assert.equal(w.MAX,64);
 assert.ok(trees.length>64);assert.equal(new Set(trees.map(t=>t.style)).size,2);
 let water=0,sand=0,ruin=0,caves=0,min=160,max=0;
 for(let x=-64;x<64;x++)for(let z=-64;z<64;z++){
  const c=L.column(cfg.seed,x,z);min=Math.min(min,c.h);max=Math.max(max,c.h);
  for(let y=6;y<=Math.max(c.h+c.wall,54);y++){
   const id=w.get(x,y,z);
   if(id===28){water++;assert.equal(w.solid(x,y,z),false);}
   if(id===29)sand++;if(id===6)ruin++;if(id===0&&y<c.h-5)caves++;
  }
 }
 assert.ok(water>0&&sand>0&&ruin>0&&caves>0&&max-min>=15);
 assert.ok(w.edit(45,100,-45,3));assert.equal(w.edit(64,100,0,3),null);
 const record={version:1,size:128,landscape:true,title:cfg.title,seed:cfg.seed,mode:'resources',forest:true,trees,player:p,edits:w.edits(),mined:0,placed:1,bag:E.initial(),equipped:false,selected:2};
 const saved=W.readSave(JSON.stringify(record),cfg,E);assert.ok(saved);
 assert.equal(saved.world.get(45,100,-45),3);assert.deepEqual(saved.world.forestState(),trees);
 assert.equal(W.readSave(JSON.stringify(record),{...cfg,size:64},E),null);
 assert.notEqual(W.saveKey(cfg),W.saveKey({...cfg,size:256}));
 assert.equal(W.saveKey(cfg),W.saveKey({...cfg,textures:true,quality:'high'}));
 const mesh=M.build(w.snapshot(0,0),0,0,true);
 assert.ok(mesh.faces<mesh.exposed);assert.equal(mesh.positions.length,mesh.faces*18);
});
test('GF-VOXEL-09: mundo de 256 mantém dados de todos os 256 chunks e saves antigos continuam legíveis',()=>{
 const w=W.create(12345,[],{size:256});assert.equal(w.chunkKeys().length,256);
 assert.ok(w.get(127,1,127));assert.equal(w.get(128,1,127),0);
 const old=W.create(12345),p=old.spawn(),cfg={title:'old',seed:12345};
 const record={version:1,...cfg,player:p,edits:[],mined:0,placed:0};
 assert.ok(W.readSave(JSON.stringify(record),cfg));assert.equal(old.chunkKeys().length,16);
});
