'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const Opt=require('../tools/optimize-glb.cjs');
function validGlb(){
 const doc={
  asset:{version:'2.0'},
  buffers:[{byteLength:36}],
  bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],
  accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]}],
  meshes:[{primitives:[{attributes:{POSITION:0},mode:4}]}],
  nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0
 };
 const bin=Buffer.alloc(36),xyz=[0,0,0,1,0,0,0,1,0];
 xyz.forEach((x,i)=>bin.writeFloatLE(x,i*4));
 const src=Buffer.from(JSON.stringify(doc)),json=Buffer.alloc(Math.ceil(src.length/4)*4,0x20);
 src.copy(json);
 const out=Buffer.alloc(12+8+json.length+8+bin.length);
 out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
 out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);
 const offset=20+json.length;
 out.writeUInt32LE(bin.length,offset);out.writeUInt32LE(0x004e4942,offset+4);bin.copy(out,offset+8);
 return out;
}
test('GF-OPEN-01b: CLI interpreta limites e impede sobrescrever origem',()=>{
 assert.throws(()=>Opt.argsFrom(['a.glb','a.glb']),/original/);
 assert.throws(()=>Opt.argsFrom(['a.glb','b.glb','--resize=123']),/resize/);
 assert.throws(()=>Opt.argsFrom(['a.glb','b.glb','--draco']),/desconhecida/);
 const p=Opt.argsFrom(['a.glb','b.glb','--webp','--resize=1024']);
 assert.equal(p.webp,true);assert.equal(p.resize,1024);
});
test('GF-OPEN-01b: rejeita alteracao de clipes e esqueletos',()=>{
 const model={meshes:[{primitives:[{}]}],skins:[{joints:[1,2]}],
  animations:[{name:'Walking',channels:[{target:{path:'rotation'}}]}]};
 assert.equal(Opt.assertPreserved(model,structuredClone(model)).before.clips[0].name,'Walking');
 assert.throws(()=>Opt.assertPreserved(model,{...model,animations:[{name:'Walk',channels:[]}]}),/animacoes/);
 assert.throws(()=>Opt.assertPreserved(model,{...model,skins:[{joints:[1]}]}),/skins/);
});
test('GF-OPEN-01b: fluxo simulado conserva bytes e nao altera o GLB original',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gf-opt-unit-'));
 try{
  const input=path.join(dir,'input.glb'),output=path.join(dir,'result.glb'),original=validGlb();
  fs.writeFileSync(input,original);
  const names=[];
  const result=Opt.optimize({input,output},(command,src,dst)=>{names.push(command);fs.copyFileSync(src,dst);});
  assert.deepEqual(names,['dedup','prune']);
  assert.equal(result.usedOptimized,false);
  assert.deepEqual(fs.readFileSync(output),original);
  assert.deepEqual(fs.readFileSync(input),original);
  assert.throws(()=>Opt.optimize({input,output},()=>{}),/ja existe/);
  assert.deepEqual(fs.readdirSync(dir).sort(),['input.glb','result.glb']);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('GF-OPEN-01b: se um comando falhar, não cria saída nem remove original',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gf-opt-fail-'));
 try{
  const input=path.join(dir,'original.glb'),output=path.join(dir,'saida.glb'),original=validGlb();
  fs.writeFileSync(input,original);
  assert.throws(()=>Opt.optimize({input,output},()=>{throw Error('falha simulada');}),/falha simulada/);
  assert.deepEqual(fs.readFileSync(input),original);
  assert.equal(fs.existsSync(output),false);
  assert.deepEqual(fs.readdirSync(dir),['original.glb']);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('GF-OPEN-01b: reconhece formato GLB real sem extensão de terceiros',()=>{
 const glb=validGlb(),obj=Opt.jsonOf(glb);
 assert.equal(obj.asset.version,'2.0');
 assert.equal(obj.meshes.length,1);
 const bad=Buffer.from(glb);bad.writeUInt32LE(1,4);
 assert.throws(()=>Opt.jsonOf(bad),/Cabecalho/);
});
module.exports={validGlb};
