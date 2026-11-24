'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const F=require('../js/equipment.js')();
const items=[{id:'steel',name:'Aço',kind:'material',rarity:'common',stack:10},
 {id:'blade',name:'Espada',kind:'weapon',rarity:'rare',stats:{attack:20},upgrade:{material:'steel',cost:2,max:3}},
 {id:'vest',name:'Colete',kind:'armor',rarity:'uncommon',stats:{defense:10}}];
const make=(capacity=4)=>F.create(items,{projectId:'training',capacity});
test('GF-TRAIN-27: pilhas, limite, troca e upgrade atômico',()=>{
 const a=make();assert.ok(a.add('steel',12));assert.ok(a.add('blade',2));
 assert.equal(a.add('vest'),false);assert.equal(a.snapshot().items.length,4);
 const swords=a.snapshot().items.filter(x=>x.itemId==='blade');
 assert.ok(a.equip(swords[0].uid));assert.equal(a.attributes().attack,20);
 assert.ok(a.upgrade(swords[0].uid));assert.equal(a.count('steel'),10);assert.equal(a.attributes().attack,23);
 assert.ok(a.upgrade(swords[0].uid));assert.ok(a.upgrade(swords[0].uid));assert.equal(a.count('steel'),0);
 const before=a.serialize();assert.equal(a.upgrade(swords[0].uid),false);assert.equal(a.serialize(),before);
 assert.equal(a.discard(swords[0].uid),false);assert.ok(a.equip(swords[1].uid));assert.equal(a.attributes().attack,20);
 assert.ok(a.discard(swords[0].uid));assert.ok(a.add('vest'));assert.ok(a.equip(a.snapshot().items.find(x=>x.itemId==='vest').uid));
 assert.equal(a.attributes().defense,10);
});
test('GF-TRAIN-27: save válido, rejeição de referências e isolamento de projeto',()=>{
 const a=make(),b=make();a.add('blade');a.equip(a.snapshot().items[0].uid);
 assert.ok(b.load(a.serialize()));assert.deepEqual(a.snapshot(),b.snapshot());
 const valid=b.serialize(),s=b.snapshot();
 for(const raw of [{...s,projectId:'other'},{...s,catalogVersion:999},{...s,equipped:{...s.equipped,armor:s.items[0].uid}},
  {...s,items:[...s.items,...s.items]},{...s,items:[{...s.items[0],level:99}]}]){
  assert.equal(b.load(JSON.stringify(raw)),false);assert.equal(b.serialize(),valid);
 }
 b.reset();assert.equal(b.attributes().attack,0);
});
test('GF-TRAIN-27: acessório acompanha osso Three.js e troca não altera pose',()=>{
 const env={console,AbortController,AbortSignal,TextDecoder,TextEncoder,Uint8Array,Uint8ClampedArray};vm.createContext(env);
 vm.runInContext(fs.readFileSync(require.resolve('../vendor/three-source.js'),'utf8'),env);
 vm.runInContext(env.GameForgeThreeSource,env);const T=env.THREE;
 const model=new T.Group(),hand=new T.Bone();hand.name='RightHand';model.add(hand);
 const socket=F.sockets(model),sword=new T.Group(),other=new T.Group(),q=hand.quaternion.clone();
 assert.ok(socket.attach('weapon','RightHand',sword,{position:[0,.5,0]}));
 hand.rotation.z=Math.PI/2;model.updateMatrixWorld(true);assert.ok(Math.abs(sword.getWorldPosition(new T.Vector3()).x+.5)<1e-6);
 const animated=hand.quaternion.clone();assert.ok(socket.attach('weapon','RightHand',other));assert.equal(sword.parent,null);
 assert.ok(hand.quaternion.angleTo(animated)<1e-7);assert.equal(other.parent,hand);
 assert.equal(socket.attach('weapon','missing',new T.Group()),false);assert.equal(other.parent,hand);
 socket.clear();assert.equal(other.parent,null);assert.notEqual(hand.quaternion.z,q.z);
});
