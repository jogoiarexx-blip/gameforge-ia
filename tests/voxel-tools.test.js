'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const K=require('../js/voxel-kit.js'),W=require('../js/voxel-world.js')(K),E=require('../js/voxel-economy.js')(K),U=require('../js/voxel-tools.js')(E),D=require('../js/voxel-storage.js')(E);
const cfg={title:'Ferramentas',seed:12345,mode:'resources',forest:true,tools:true};
function setup(){
 const w=W.create(cfg.seed,[],{forest:true,tools:true}),p=w.spawn(),s=U.initial();
 w.edit(2,K.heightAt(cfg.seed,2,0)+1,0,4);
 w.edit(-2,K.heightAt(cfg.seed,-2,0)+1,0,5);
 let bag=E.change(E.initial(),8,8);
 return {w,p,s,bag};
}
test('GF-VOXEL-07: minério determinístico, requisitos de ferramenta e progressão completa',()=>{
 const {w,p,s,bag}=setup(),legacy=W.create(cfg.seed),again=W.create(cfg.seed,[],{forest:true,tools:true});
 let ore=[];
 for(let x=-3;x<4;x++)for(let z=-3;z<4;z++)for(let y=35;y<50;y++)if(w.get(x,y,z)===15){ore.push([x,y,z]);assert.equal(again.get(x,y,z),15);assert.equal(legacy.get(x,y,z),3);}
 assert.ok(ore.length>=2);
 let a=U.craft(s,bag,5,0,w,p);assert.ok(a.ok);assert.equal(U.equip(s,a.inventory),13);
 assert.equal(U.craft(s,a.inventory,5,0,w,p).ok,false);
 assert.equal(E.edit(w,p,a.inventory,{cell:ore[0],id:15},'mine',2,true,13).ok,false);
 a=U.craft(s,a.inventory,2,4,w,p);assert.ok(a.ok);assert.equal(U.equip(s,a.inventory),7);
 for(const c of ore.slice(0,2)){
  const r=E.edit(w,p,a.inventory,{cell:c,id:15},'mine',2,true,7);assert.ok(r.ok);
  a.inventory=U.wear(s,r.bag).bag;
  const smelt=U.craft(s,a.inventory,6,5,w,p);assert.ok(smelt.ok);a.inventory=smelt.inventory;
 }
 assert.equal(s.wear[7],62);
 const iron=U.craft(s,a.inventory,7,4,w,p);assert.ok(iron.ok);
 assert.equal(U.equip(s,iron.inventory),14);assert.equal(s.wear[14],160);assert.ok(U.valid(s,iron.inventory));
});
test('GF-VOXEL-07: desgaste, reparo, quebra sem duplicar e restauração',()=>{
 const {w,p,s,bag}=setup(),made=U.craft(s,bag,5,0,w,p);
 let b=made.inventory;U.equip(s,b);b=U.wear(s,b).bag;assert.equal(s.wear[13],23);
 const repaired=U.repair(s,b,w,p);assert.ok(repaired);assert.equal(s.wear[13],24);assert.equal(E.count(repaired,8),E.count(b,8)-1);b=repaired;
 for(let i=0;i<23;i++)b=U.wear(s,b).bag;
 assert.equal(s.wear[13],1);
 const save={version:1,title:cfg.title,seed:cfg.seed,mode:'resources',player:p,edits:w.edits(),forest:true,trees:w.forestState(),mined:0,placed:2,bag:b,equipped:true,selected:2,tools:s};
 const restored=W.readSave(JSON.stringify(save),cfg,E,null,D,U);assert.ok(restored);assert.equal(restored.tools.wear[13],1);
 assert.equal(W.readSave(JSON.stringify({...save,tools:{...s,wear:{13:99}}}),cfg,E,null,D,U),null);
 assert.equal(W.readSave(JSON.stringify(save),{...cfg,tools:false},E,null,D,U),null);
 assert.equal(U.valid(s,E.change(b,13,1)),false);
 const broken=U.wear(s,b);assert.ok(broken.broken);assert.equal(E.count(broken.bag,13),0);assert.equal(s.active,0);assert.ok(U.valid(s,broken.bag));
 assert.notEqual(W.saveKey(cfg),W.saveKey({...cfg,tools:false}));
});
