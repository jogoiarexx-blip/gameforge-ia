'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const K=require('../js/voxel-kit.js'),W=require('../js/voxel-world.js')(K),E=require('../js/voxel-economy.js')(K),S=require('../js/voxel-survival.js')(K,E);
const cfg={title:'Sobrevivência',seed:12345,mode:'resources',forest:false,survival:true};
test('GF-VOXEL-04: dia/noite, fome, regeneração e inanição',()=>{
 const w=W.create(cfg.seed),p=w.spawn(),s=S.initial();
 S.populate(s,w,p);assert.ok(s.animals.some(a=>a.kind==='sheep'));assert.ok(S.valid(s,w));
 s.time=79.95;S.tick(s,.1,w,p);assert.ok(S.night(s));assert.ok(s.hunger<100);
 s.time=119.95;S.tick(s,.1,w,p);assert.equal(S.night(s),false);assert.ok(!s.animals.some(a=>a.kind==='shade'));
 s.health=70;s.hunger=90;S.tick(s,.1,w,p);assert.ok(s.health>70);
 s.health=10;s.hunger=0;S.tick(s,.1,w,p);assert.ok(s.health<10);
 S.respawn(s);assert.equal(s.health,100);assert.equal(s.hunger,100);assert.equal(s.respawns,1);
});
test('GF-VOXEL-04: comida tem consumo único e combate respeita cooldown/capacidade',()=>{
 const w=W.create(cfg.seed),p=w.spawn(),s=S.initial(),bag=E.change(E.initial(),11,3);
 assert.equal(S.eat(s,bag),null);
 s.hunger=40;s.health=80;const ate=S.eat(s,bag);
 assert.equal(E.count(ate,11),2);assert.equal(s.hunger,75);assert.equal(s.health,88);assert.equal(E.count(bag,11),3);
 s.animals=[{id:0,kind:'sheep',x:p.x,y:p.y,z:p.z-2,hp:2}];
 const target=S.target(s,[p.x,p.y+.6,p.z],[0,0,-1]);assert.equal(target.id,0);
 const first=S.hit(s,0,ate,false);assert.ok(first.ok);assert.equal(s.animals[0].hp,1);
 assert.equal(S.hit(s,0,ate,false).ok,false);s.attack=0;
 const full=Array.from({length:12},()=>({id:3,qty:99}));
 assert.equal(S.hit(s,0,full,false).ok,false);assert.equal(s.animals[0].hp,1);
 const last=S.hit(s,0,ate,false);assert.ok(last.ok);assert.equal(E.count(last.bag,11),4);
 assert.equal(s.animals.length,0);s.attack=0;assert.equal(S.hit(s,0,last.bag,false).ok,false);
});
test('GF-VOXEL-04: save de sobrevivência preserva estado e rejeita modo incompatível',()=>{
 const w=W.create(cfg.seed),p=w.spawn(),s=S.initial();S.populate(s,w,p);s.time=35;s.hunger=72;s.health=89;
 const record={version:1,title:cfg.title,seed:cfg.seed,mode:'resources',player:p,edits:[],mined:0,placed:0,bag:E.change(E.initial(),11,3),equipped:false,selected:2,survival:s};
 const loaded=W.readSave(JSON.stringify(record),cfg,E,S);assert.ok(loaded);assert.deepEqual(loaded.survival,s);
 assert.equal(W.readSave(JSON.stringify(record),{...cfg,survival:false},E,S),null);
 assert.notEqual(W.saveKey(cfg),W.saveKey({...cfg,survival:false}));
 assert.equal(W.readSave(JSON.stringify({...record,survival:{...s,hunger:101}}),cfg,E,S),null);
});
