'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/runtime-template.js'),'utf8');
const start=source.indexOf('  function circlesOverlap(');
const end=source.indexOf('  let stage =',start);
assert.ok(start>=0&&end>start,'núcleo de colisão encontrado no runtime');
const sandbox={};
vm.runInNewContext(source.slice(start,end)+';this.circle=circlesOverlap;this.rect=rectanglesOverlap;',sandbox);
const circle=sandbox.circle,rect=sandbox.rect;
test('círculos: sobreposição, tangência e simetria',()=>{
 const a={x:0,y:0,r:10},b={x:15,y:0,r:10},c={x:20,y:0,r:10};
 assert.equal(circle(a,b),true);assert.equal(circle(b,a),true);
 assert.equal(circle(a,c),false);assert.equal(circle(c,a),false);
 assert.equal(circle(a,{x:21,y:0,r:10}),false);
});
test('círculos: margem de coleta e raio inválido',()=>{
 assert.equal(circle({x:0,y:0,r:10},{x:25,y:0,r:10},7),true);
 assert.equal(circle({x:0,y:0,r:0},{x:0,y:0,r:0}),false);
 assert.equal(circle(null,{x:0,y:0,r:10}),false);
});
test('retângulos: interseção, bordas e simetria',()=>{
 const a={x:0,y:0,w:10,h:10},b={x:9,y:9,w:10,h:10},c={x:10,y:0,w:10,h:10};
 assert.equal(rect(a,b),true);assert.equal(rect(b,a),true);
 assert.equal(rect(a,c),false);assert.equal(rect(c,a),false);
});
test('runtime usa o núcleo em colisões dos três gêneros',()=>{
 for(const snippet of ['circlesOverlap(e,player)','circlesOverlap(b,e)','circlesOverlap(player,d,7)','circlesOverlap(player,e,4)','circlesOverlap(player,o)'])
  assert.ok(source.includes(snippet),snippet);
});
