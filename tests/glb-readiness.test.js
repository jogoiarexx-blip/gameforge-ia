'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const readiness=require('../js/glb-readiness.js');
const Inspector=require('../js/model-inspector.js');
function model(extra={}){
 return {asset:{version:'2.0'},buffers:[{byteLength:36}],
  accessors:[{count:9,type:'VEC3'}],
  meshes:[{primitives:[{attributes:{POSITION:0}}]}],nodes:[{mesh:0}],
  scenes:[{nodes:[0]}],scene:0,...extra};
}
test('GF-OPEN-01: GLB simples gera contagem e relatorio sem alterar o modelo',()=>{
 const json=model(),before=JSON.stringify(json);
 const result=readiness.analyze(json,{bytes:256,role:'scene'});
 assert.equal(result.status,'REVIEW'); // objeto estatico recebe aviso informativo
 assert.equal(result.triangles,3);
 assert.equal(result.vertices,9);
 assert.match(readiness.format(result),/triangulos/);
 assert.equal(JSON.stringify(json),before);
});
test('GF-OPEN-01: personagem mostra ausencias reais e reconhece aliases dos clips',()=>{
 const a=readiness.analyze(model({skins:[{joints:[0]}],
   animations:[{name:'Idle'},{name:'Walking'},{name:'Shooting'},{name:'Death'}]}),{role:'player',bytes:1200});
 assert.equal(a.stateMap.walk,'Walking');
 assert.equal(a.stateMap.attack,'Shooting');
 assert.equal(a.stateMap.death,'Death');
 assert.ok(a.warnings.some(w=>w.includes('hit')));
 assert.ok(!a.warnings.some(w=>w.includes('walk')));
});
test('GF-OPEN-01: rejeita Draco obrigatorio e imagens externas',()=>{
 const result=readiness.analyze(model({
   extensionsRequired:['KHR_draco_mesh_compression'],
   images:[{uri:'https://example.org/texture.png'}]
 }),{bytes:2000});
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.blockers.length,2);
 assert.match(readiness.format(result),/INCOMPATIVEL/);
});
test('GF-OPEN-01: extensao webp e imagem embutida sao permitidas',()=>{
 const r=readiness.analyze(model({
  extensionsRequired:['EXT_texture_webp'],
  images:[{bufferView:0,mimeType:'image/webp'}],
  bufferViews:[{buffer:0,byteLength:36}]
 }),{bytes:128});
 assert.deepEqual(r.blockers,[]);
});
test('GF-OPEN-01: modelo pesado avisa sem fingir compressao e nao libera modo de linha',()=>{
 const r=readiness.analyze(model({accessors:[{count:600000}],meshes:[{primitives:[{mode:1,attributes:{POSITION:0}}]}]}),{bytes:18*1024*1024,role:'enemy'});
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.blockers.some(x=>/TRIANGLES/.test(x)));
 assert.ok(r.recommendations.some(x=>x.includes('glTF-Transform')));
});
test('GF-OPEN-01: analise estrutural rejeita dados invalidos',()=>{
 assert.throws(()=>readiness.analyze({asset:{version:'1.0'}}),/glTF 2.0/);
 assert.equal(typeof Inspector.readGlb,'function');
});
