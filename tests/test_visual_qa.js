const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../js');
const QA=require(path.join(root,'visual-qa.js'));
const bridge=require(path.join(root,'qa-bridge.js'));
const model=require(path.join(root,'model-inspector.js'));
require(path.join(root,'runtime-template.js'));
require(path.join(root,'generator.js'));
assert.equal(typeof bridge.install,'function');
const report=QA.checkBasic(
 {image:'data:image/png;base64,xxx',width:960,height:540,errors:[],telemetry:{frames:20,player:{x:10,y:100}}},
 {image:'data:image/png;base64,yyy',width:960,height:540,errors:[],telemetry:{frames:50,player:{x:100,y:100},state:'play'}},
 'arena');
assert.equal(report.issues.length,0);
assert(report.passes.some(x=>x.includes('Movimentação')));
const broken=QA.checkBasic(
 {image:'a',width:960,height:540,telemetry:{frames:10,player:{x:80,y:10}}},
 {image:'b',width:960,height:540,errors:['TypeError'],telemetry:{frames:10,player:{x:80,y:10},state:'play'}},
 'arena');
assert(broken.issues.some(x=>x.type==='freeze'));
assert(broken.issues.some(x=>x.type==='movement'));
assert(broken.issues.some(x=>x.type==='runtime'));
const boneModel={asset:{version:'2.0'},nodes:[{name:'Hip'}],skins:[{joints:[0]}],meshes:[{primitives:[]}],materials:[{}],animations:[{name:'Idle',channels:[{target:{node:0}}]}]};
const audited=model.inspect(boneModel);
assert.equal(audited.bones,1);assert.equal(audited.animations[0],'Idle');
assert(audited.warnings.some(x=>x.includes('walk')));
const json=Buffer.from(JSON.stringify(boneModel),'utf8');
const pad=(4-json.length%4)%4;
const padded=Buffer.concat([json,Buffer.alloc(pad,32)]);
const glb=Buffer.alloc(20+padded.length);
glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);
glb.writeUInt32LE(padded.length,12);glb.writeUInt32LE(0x4e4f534a,16);padded.copy(glb,20);
const parsed=model.readGlb(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.length));
assert.equal(parsed.skins.length,1);
assert.throws(()=>model.readGlb(new ArrayBuffer(20)),/inválido/);
console.log('OK: QA telemetria, regressões e diagnóstico estrutural GLB.');
