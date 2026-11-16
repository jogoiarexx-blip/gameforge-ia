'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/runtime-template.js'),'utf8');
const start=source.indexOf('  function buildBulletGrid(');
const end=source.indexOf('  let stage =',start);
assert.ok(start>=0&&end>start);
const env={Map,Math};
vm.runInNewContext(source.slice(start,end)+';this.build=buildBulletGrid;this.near=nearbyBullets;',env);
const {build,near}=env;
test('grade espacial retorna apenas células próximas e preserva ordem original',()=>{
 const bullets=[{x:80,y:80,id:0},{x:900,y:450,id:1},{x:100,y:80,id:2},{x:40,y:40,id:3}];
 const result=near(build(bullets),80,80);
 assert.deepEqual(Array.from(result,b=>b.id),[0,2,3]);
});
test('grade espacial preserva consulta através de fronteiras e coordenadas negativas',()=>{
 const bullets=[{x:-1,y:1,id:0},{x:1,y:1,id:1},{x:65,y:1,id:2},{x:500,y:1,id:3}];
 assert.deepEqual(Array.from(near(build(bullets),0,1),b=>b.id),[0,1,2]);
});
test('grade espacial lida com cenário vazio e não duplica projéteis',()=>{
 assert.equal(near(build([]),0,0).length,0);
 const bullets=Array.from({length:100},(_,i)=>({x:20+i*.1,y:20,id:i}));
 const result=near(build(bullets),20,20);
 assert.equal(result.length,100);
 assert.equal(new Set(result).size,100);
});
test('runtime integra grade apenas no motor arena',()=>{
 assert.match(source,/const bulletGrid=buildBulletGrid\(bullets\)/);
 assert.match(source,/for\(const b of nearbyBullets\(bulletGrid,e\.x,e\.y,e\.r\)\)/);
});

test('busca inclui projétil grande distante por mais de uma célula',()=>{
 const bullets=[{x:0,y:0,r:50,id:0},{x:500,y:500,r:5,id:1}];
 const result=near(build(bullets),100,0,60);
 assert.deepEqual(Array.from(result,b=>b.id),[0]);
});
test('busca limita candidatos pelo raio sem ignorar bordas',()=>{
 const bullets=[{x:0,y:0,r:5,id:0},{x:60,y:0,r:5,id:1},{x:180,y:0,r:5,id:2}];
 assert.deepEqual(Array.from(near(build(bullets),0,0,15),b=>b.id),[0]);
 assert.deepEqual(Array.from(near(build(bullets),64,0,15),b=>b.id),[1]);
});
