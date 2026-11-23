'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Nav=require('../js/scene3d-navigation.js');
function item(kind='crate',x=0,z=0,extra={}){
 return {id:'obj1',kind,collidable:true,x,z,yaw:0,scale:1,...extra};
}
test('GF-OPEN-02c: AABB da caixa acompanha tamanho, escala e rotacao Y',()=>{
 const normal=Nav.boundsFor(item('wall',3,4));
 assert.equal(normal.w,3);assert.equal(normal.d,.6);
 const turned=Nav.boundsFor(item('wall',3,4,{yaw:90,scale:2}));
 assert.ok(Math.abs(turned.w-1.2)<1e-9);
 assert.ok(Math.abs(turned.d-6)<1e-9);
 assert.equal(turned.x,3);assert.equal(turned.z,4);
 assert.equal(Nav.boundsFor(item('lamp',0,0)),null);
 assert.equal(Nav.boundsFor(item('wall',0,0,{collidable:false})),null);
});
test('GF-OPEN-02c: modelo GLB preserva deslocamento local ao aplicar transformacoes',()=>{
 const asset={x:1,z:2,w:2,d:4};
 const b=Nav.boundsFor(item('glb',3,5,{yaw:90,scale:2,assetId:'model_123456'}),asset);
 assert.ok(Math.abs(b.x-7)<1e-9); // x'=x+scale*localZ
 assert.ok(Math.abs(b.z-3)<1e-9); // z'=z-scale*localX
 assert.ok(Math.abs(b.w-8)<1e-9);
 assert.ok(Math.abs(b.d-4)<1e-9);
 assert.equal(Nav.boundsFor(item('glb',0,0,{assetId:'model_123456'})),null);
});
test('GF-OPEN-02c: fase sem obstaculos editados oferece rota apenas aproximada',()=>{
 const r=Nav.inspect({objects:[]});
 assert.equal(r.status,'CLEAR');assert.ok(r.path.length>=2);
 assert.match(r.caveat,/procedurais/);
 assert.equal(r.start.z,48*.28);
});
test('GF-OPEN-02c: colisao no inicio bloqueia acesso',()=>{
 const r=Nav.inspect({objects:[item('crate',0,13.5)]});
 assert.equal(r.status,'BLOCKED');
 assert.match(r.reason,/inicial bloqueada/);
 assert.equal(r.path.length,0);
});
test('GF-OPEN-02c: barreira transversal detecta caminho interrompido',()=>{
 const r=Nav.inspect({objects:[item('glb',0,0,{assetId:'gfbounds123',scale:1})]},{
  glbBounds:{gfbounds123:{x:0,z:0,w:80,d:2}}
 });
 assert.equal(r.status,'BLOCKED');
 assert.match(r.reason,/Nao foi encontrada passagem/);
});
test('GF-OPEN-02c: GLB nao carregado impede afirmar passagem livre',()=>{
 const r=Nav.inspect({objects:[item('glb',4,0,{assetId:'asset12345678'})]});
 assert.equal(r.status,'INCOMPLETE');assert.deepEqual(r.missing,['asset12345678']);
 assert.ok(r.path.length>0);
});
test('GF-OPEN-02c: mundo maior gera grade dentro dos limites e sem atalhos atraves de bloqueios',()=>{
 const r=Nav.inspect({objects:[item('wall',0,0)]},{size:72});
 assert.equal(r.status,'CLEAR');assert.ok(r.path.length>2);
 for(const point of r.path)assert.ok(Math.abs(point.x)<=36&&Math.abs(point.z)<=36);
});
test('GF-OPEN-02c: dados invalidos de origem ou destino sao rejeitados',()=>{
 assert.throws(()=>Nav.inspect({objects:[]},{start:{x:NaN,z:0}}),/invalidos/);
 assert.throws(()=>Nav.inspect({objects:[]},{finish:{x:0,z:Infinity}}),/invalidos/);
});
