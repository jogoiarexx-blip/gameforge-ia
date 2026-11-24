'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../js/voxel-atlas.js')(),K=require('../js/voxel-kit.js'),X=require('../js/voxel-textures.js')(K);
test('GF-VOXEL-10: pintura, preenchimento e restauração não alteram tiles vizinhos',()=>{
 const base=X.generate(12345).data,a=base.slice(),before=A.extract(a,2);
 assert.ok(A.pixel(a,1,15,15,[250,30,60,255]));
 assert.deepEqual(Array.from(A.extract(a,1).slice(-4)),[250,30,60,255]);
 assert.deepEqual(A.extract(a,2),before);
 assert.equal(A.pixel(a,1,16,0,[0,0,0,255]),false);
 assert.equal(A.pixel(a,31,0,0,[0,0,0,255]),false);
 assert.ok(A.fill(a,1,[1,2,3,255]));
 assert.deepEqual(Array.from(A.extract(a,1).slice(12,16)),[1,2,3,255]);
 assert.ok(A.replace(a,1,A.extract(base,1)));assert.deepEqual(a,base);
});
test('GF-VOXEL-10: atlas serializado estritamente e transparência composta',()=>{
 const a=X.generate(7).data,hex=A.encode(a);
 assert.equal(hex.length,65536);assert.deepEqual(A.decode(hex),a);
 assert.throws(()=>A.decode('ff'));assert.throws(()=>A.decode('z'.repeat(65536)));
 assert.throws(()=>A.encode(new Uint8Array(32)));
 assert.deepEqual(Array.from(A.composite(Uint8Array.of(10,20,30,255),Uint8Array.of(110,120,130,128))),[60,70,80,255]);
});
