const {test}=require('node:test');
const assert=require('node:assert/strict');
const backup=require('../js/project-backup.js');
const project=()=>({name:'RPG',gdd:'# RPG',instruction:'',files:{},history:[],rpgLayoutJson:JSON.stringify({puzzle:{key:{x:300,y:850},lever:{x:1730,y:800},gate:{x:1940,y:800}},chests:[{x:475,y:800,coins:25}]})});
test('layout RPG persiste em backup portatil',()=>{
 const raw=backup.encode(project());const restored=backup.decode(raw);
 assert.equal(restored.rpgLayoutJson,project().rpgLayoutJson);
});
test('layout RPG persiste no armazenamento local compactado',()=>{
 const store=new Map();const storage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)};
 assert.equal(backup.save(storage,'gameforge',project()).ok,true);
 const restored=backup.restoreStored(store.get('gameforge'));
 assert.equal(restored.rpgLayoutJson,project().rpgLayoutJson);
});
test('layout RPG tem limite de tamanho e não executa conteúdo',()=>{
 assert.throws(()=>backup.encode({...project(),rpgLayoutJson:'x'.repeat(30001)}),/Layout RPG/);
});
