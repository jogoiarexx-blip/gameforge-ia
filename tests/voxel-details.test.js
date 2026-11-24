'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const K=require('../js/voxel-kit.js'),L=require('../js/voxel-landscape.js')(K),W=require('../js/voxel-world.js')(K);
test('GF-VOXEL-10: vilarejos, pontes e vegetação são determinísticos e opcionais',()=>{
 const cfg={size:128,landscape:true,details:true,title:'Vila',seed:12345};
 const w=W.create(cfg.seed,[],cfg),other=W.create(cfg.seed,[],cfg),old=W.create(cfg.seed,[],{...cfg,details:false});
 let houses=0,doors=0,roads=0,bridges=0;
 for(let x=-64;x<64;x++)for(let z=-64;z<64;z++){
  const c=L.column(cfg.seed,x,z,true);
  if(c.house){houses++;if(c.house.b===-3&&c.house.a===0){doors++;assert.equal(w.get(x,c.h+1,z),0);assert.equal(w.get(x,c.h+2,z),0);}}
  if(c.site&&c.surface===3&&!c.house)roads++;
  if(c.bridge&&w.get(x,55,z)===3)bridges++;
 }
 assert.ok(houses>0&&doors>0&&roads>0&&bridges>0);
 let plants=0,flower=0,shrub=0;
 for(const id of w.chunkKeys()){
  const [cx,cz]=id.split(',').map(Number),a=w.decorations(cx,cz);
  assert.deepEqual(a,other.decorations(cx,cz));assert.deepEqual(old.decorations(cx,cz),[]);
  for(const p of a){plants++;if(p.kind==='flower')flower++;if(p.kind==='shrub')shrub++;}
 }
 assert.ok(plants>100&&flower>0&&shrub>0);
 const record={version:1,size:128,landscape:true,details:true,title:cfg.title,seed:cfg.seed,player:w.spawn(),edits:[],mined:0,placed:0};
 assert.ok(W.readSave(JSON.stringify(record),cfg));assert.equal(W.readSave(JSON.stringify(record),{...cfg,details:false}),null);
 assert.notEqual(W.saveKey(cfg),W.saveKey({...cfg,details:false}));
});
