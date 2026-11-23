/* GF-OPEN-01b: exercita glTF-Transform real em arquivo minimo, sem rede. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const GLB=require('../js/glb-runtime.js');
const Opt=require('./optimize-glb.cjs');

function fixture(){
 const doc={asset:{version:'2.0',generator:'GameForge GF-OPEN-01b test'},
  buffers:[{byteLength:36}],
  bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],
  accessors:[{bufferView:0,componentType:5126,type:'VEC3',count:3,min:[0,0,0],max:[1,1,0]}],
  meshes:[{name:'triangulo',primitives:[{mode:4,attributes:{POSITION:0}}]}],
  nodes:[{name:'Cena',mesh:0}],scenes:[{nodes:[0]}],scene:0};
 const raw=Buffer.from(JSON.stringify(doc));
 const json=Buffer.alloc(Math.ceil(raw.length/4)*4,32);raw.copy(json);
 const bin=Buffer.alloc(36);
 [0,0,0,1,0,0,0,1,0].forEach((v,i)=>bin.writeFloatLE(v,i*4));
 const out=Buffer.alloc(12+8+json.length+8+bin.length);
 out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
 out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);
 const p=20+json.length;
 out.writeUInt32LE(bin.length,p);out.writeUInt32LE(0x004e4942,p+4);bin.copy(out,p+8);
 return out;
}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gf-opt-real-'));
try{
 const input=path.join(dir,'original.glb'),output=path.join(dir,'otimizado.glb');
 fs.writeFileSync(input,fixture());
 GLB.decode(null,fs.readFileSync(input));
 const run=spawnSync(process.execPath,[path.join(__dirname,'optimize-glb.cjs'),input,output],{
  encoding:'utf8',timeout:180000
 });
 assert.equal(run.status,0,run.stderr||run.stdout||String(run.error));
 assert.ok(fs.existsSync(output));
 GLB.decode(null,fs.readFileSync(output));
 assert.deepEqual(Opt.snapshot(Opt.jsonOf(fs.readFileSync(input))).clips,
  Opt.snapshot(Opt.jsonOf(fs.readFileSync(output))).clips);
 console.log('GF-OPEN-01b: glTF-Transform real e GameForge.decode aprovaram a exportacao');
 console.log(run.stdout.trim());
}finally{fs.rmSync(dir,{recursive:true,force:true});}
