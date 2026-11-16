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
vm.runInNewContext(source.slice(start,end)+';this.build=buildBulletGrid;this.near=nearbyBullets;this.indexes=nearbyBulletIndexes;',env);
const {build,near,indexes}=env;
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
 assert.match(source,/arenaBulletGrid=buildBulletGrid\(bullets,64,arenaBulletGrid\)/);
 assert.match(source,/for\(const bulletIndex of nearbyBulletIndexes\(arenaBulletGrid,e\.x,e\.y,e\.r\)\)/);
});

test('busca inclui projétil grande distante por mais de uma célula',()=>{
 const bullets=[{x:0,y:0,r:50,id:0},{x:500,y:500,r:5,id:1}];
 const result=near(build(bullets),100,0,60);
 assert.deepEqual(Array.from(result,b=>b.id),[0]);
});
test('busca limita candidatos pelo raio sem ignorar bordas',()=>{
 const bullets=[{x:0,y:0,r:5,id:0},{x:130,y:0,r:5,id:1},{x:260,y:0,r:5,id:2}];
 assert.deepEqual(Array.from(near(build(bullets),0,0,15),b=>b.id),[0]);
 assert.deepEqual(Array.from(near(build(bullets),130,0,15),b=>b.id),[1]);
});

test('reutilização limpa células antigas e não mistura projéteis de frames distintos',()=>{
 const original=[{x:-100,y:-100,r:5,id:1},{x:600,y:400,r:5,id:2}];
 const grid=build(original),bucketMap=grid.buckets,buffer=grid.queryBuffer;
 assert.deepEqual(Array.from(indexes(grid,-100,-100,10)),[0]);
 const newer=[{x:310,y:210,r:7,id:3}];
 const same=build(newer,64,grid);
 assert.equal(same,grid);
 assert.equal(same.buckets,bucketMap);
 assert.equal(same.queryBuffer,buffer);
 assert.deepEqual(Array.from(indexes(grid,-100,-100,10)),[]);
 assert.deepEqual(Array.from(indexes(grid,310,210,10)),[0]);
 assert.deepEqual(Array.from(near(grid,310,210,10),b=>b.id),[3]);
});
test('consulta usa um só buffer e descarta resultados da consulta anterior',()=>{
 const grid=build([{x:10,y:10,r:5},{x:400,y:400,r:5}]);
 const first=indexes(grid,10,10,20);
 assert.deepEqual(Array.from(first),[0]);
 const second=indexes(grid,400,400,20);
 assert.equal(first,second);
 assert.deepEqual(Array.from(second),[1]);
 const empty=indexes(grid,850,850,20);
 assert.equal(second,empty);
 assert.deepEqual(Array.from(empty),[]);
});
test('sessão prolongada mantém pool limitado ao máximo de células ocupadas',()=>{
 const bullets=Array.from({length:110},(_,i)=>({x:i*9%950,y:i*13%510,r:5}));
 let grid=null,maxActive=0,initialBuffer=null;
 for(let frame=0;frame<1400;frame++){
  for(let i=0;i<bullets.length;i++){
   bullets[i].x=(i*17+frame*7)%950;
   bullets[i].y=(i*31+frame*11)%510;
  }
  grid=build(bullets,64,grid);
  if(!initialBuffer)initialBuffer=grid.queryBuffer;
  maxActive=Math.max(maxActive,grid.buckets.size);
  assert.ok(grid.pool.length+grid.buckets.size<=maxActive,'pool cresceu sem necessidade');
  assert.equal(grid.queryBuffer,initialBuffer);
  const candidates=indexes(grid,bullets[0].x,bullets[0].y,15);
  assert.ok(candidates.includes(0),'projétil atual precisa continuar indexado');
 }
 assert.ok(maxActive<=bullets.length);
});
