'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const K=require('../js/voxel-kit.js'),W=require('../js/voxel-world.js')(K),E=require('../js/voxel-economy.js')(K),U=require('../js/voxel-tools.js')(E,true),A=require('../js/voxel-advanced.js')(E,U),S=require('../js/voxel-survival.js')(K,E),D=require('../js/voxel-storage.js')(E);
const cfg={title:'GF Advanced',seed:12345,mode:'resources',forest:true,tools:true,advanced:true};
function setup(){
 const w=W.create(cfg.seed,[],cfg),p=w.spawn(),g=U.initial(),f=A.initial();
 w.edit(2,K.heightAt(cfg.seed,2,0)+1,0,4);w.edit(-2,K.heightAt(cfg.seed,-2,0)+1,0,5);
 let b=E.change(E.initial(),8,8);
 for(const [id,n] of [[16,8],[21,3],[20,3]])b=E.change(b,id,n);
 return {w,p,g,f,b};
}
test('GF-VOXEL-08: mineração progressiva reinicia com alvo/ferramenta e especialização',()=>{
 const m=A.mining(),hit={cell:[2,50,0],id:2};
 assert.ok(A.duration(2,18)<A.duration(2,0));assert.ok(A.duration(8,17)<A.duration(8,0));
 assert.equal(A.advance(m,hit,18,.1),false);
 assert.equal(A.advance(m,{...hit,cell:[3,50,0]},18,.1),false);assert.equal(m.elapsed,.1);
 assert.equal(A.advance(m,{...hit,cell:[3,50,0]},18,.15),true);
 assert.equal(A.advance(m,{cell:[2,45,0],id:21},13,.2),false);assert.equal(m.key,null);
 assert.equal(U.canMine({active:19},3),false);
});
test('GF-VOXEL-08: forno consome combustível uma vez, pausa e coleta sem duplicação',()=>{
 const {w,p,g,f,b}=setup();let n=A.start(f,b,w,p,11);assert.ok(n);
 assert.equal(E.count(n,21),2);assert.equal(E.count(n,20),2);
 assert.equal(A.start(f,n,w,p,11),null);assert.equal(A.collect(f,n,w,p),null);
 for(let i=0;i<19;i++)A.tick(f,.25);
 assert.ok(f.jobs[0].remaining>0);
 const record={version:1,title:cfg.title,seed:cfg.seed,mode:'resources',player:p,edits:w.edits(),mined:0,placed:2,bag:n,equipped:false,selected:2,forest:true,trees:w.forestState(),tools:g,advanced:f};
 const saved=W.readSave(JSON.stringify(record),cfg,E,S,D,U,A);assert.ok(saved);assert.equal(saved.advanced.jobs[0].remaining,.25);
 assert.equal(W.readSave(JSON.stringify({...record,advanced:{...f,jobs:[...f.jobs,...f.jobs]}}),cfg,E,S,D,U,A),null);
 assert.ok(A.tick(saved.advanced,.25));n=A.collect(saved.advanced,n,w,p);assert.ok(n);assert.equal(E.count(n,22),1);
 assert.equal(A.collect(saved.advanced,n,w,p),null);
});
test('GF-VOXEL-08: cobre/carvão determinísticos, receitas e defesa apenas contra inimigos',()=>{
 const {w,p,g,f,b}=setup(),again=W.create(cfg.seed,[],cfg),old=W.create(cfg.seed,[],{forest:true,tools:true});
 let counts={20:0,21:0};
 for(let x=-3;x<4;x++)for(let z=-3;z<4;z++)for(let y=35;y<50;y++){const id=w.get(x,y,z);if(id in counts){counts[id]++;assert.equal(again.get(x,y,z),id);assert.equal(old.get(x,y,z),3);}}
 assert.ok(counts[20]>0&&counts[21]>0);
 let n=E.change(b,22,3);
 for(const i of [8,9,10,12]){const r=U.craft(g,n,i,4,w,p);assert.ok(r.ok);n=r.inventory;}
 assert.ok(A.toggleArmor(f,n));assert.equal(A.defense(f),.4);assert.ok(A.valid(f,n,w));assert.ok(U.valid(g,n));
 const state=S.initial();state.time=90;state.hunger=50;state.animals=[{id:4,kind:'shade',x:p.x+.5,y:p.y,z:p.z,hp:3}];
 const armored=JSON.parse(JSON.stringify(state));S.tick(state,.2,w,p,false,0);S.tick(armored,.2,w,p,false,A.defense(f));
 assert.ok(Math.abs((100-armored.health)/(100-state.health)-.6)<1e-8);
 assert.notEqual(W.saveKey(cfg),W.saveKey({...cfg,advanced:false}));
});
