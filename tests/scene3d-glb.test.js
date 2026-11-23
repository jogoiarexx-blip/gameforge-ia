'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const Scene=require('../js/scene3d-layout.js');
const GLB=require('../js/glb-runtime.js');
const runtime=require('../js/three-runtime.js');
const R=require('../js/world-rules.js');
function entry(id='model1',assetId='assetABC1234'){
 return {id,kind:'glb',assetId,name:'Modelo',x:4,z:3,yaw:90,scale:1.4,color:'#ffffff',collidable:true};
}
function layout(items=[entry()]){return {version:1,stages:[{objects:items}]};}
function manifest(){return {version:1,assets:[
 {id:'assetABC1234',name:'modelo.glb',role:'scene',bytes:300,placement:{x:10,z:7,scale:1}}
]};}
function makeGlb(){
 const json={asset:{version:'2.0'},buffers:[{byteLength:36}],
  bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],
  accessors:[{bufferView:0,componentType:5126,type:'VEC3',count:3,min:[0,0,0],max:[1,1,0]}],
  meshes:[{primitives:[{attributes:{POSITION:0},mode:4}]}],
  nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0};
 const raw=Buffer.from(JSON.stringify(json)),j=Buffer.alloc(Math.ceil(raw.length/4)*4,32);
 raw.copy(j);const bin=Buffer.alloc(36);
 [0,0,0,1,0,0,0,1,0].forEach((v,i)=>bin.writeFloatLE(v,i*4));
 const b=Buffer.alloc(12+8+j.length+8+bin.length);
 b.writeUInt32LE(0x46546c67,0);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);
 b.writeUInt32LE(j.length,12);b.writeUInt32LE(0x4e4f534a,16);j.copy(b,20);
 const off=20+j.length;b.writeUInt32LE(bin.length,off);b.writeUInt32LE(0x004e4942,off+4);bin.copy(b,off+8);
 return b;
}
function spec(){
 return {dimension:'3d',genre:'arena',title:'Teste GLB',stages:['A','B'],
 stageConfig:[],worldOptions:{size:48,seed:1,quality:'low'}};
}
test('GF-OPEN-02b: GLB tem assetId valido e nao executa dados externos',()=>{
 assert.equal(Scene.normalize(layout()).stages[0].objects[0].assetId,'assetABC1234');
 assert.throws(()=>Scene.normalize(layout([entry('model1','../hack')])),/ID/);
 assert.throws(()=>Scene.normalize(layout([entry('model1','invalid')])),/ID/);
 assert.deepEqual(Scene.references(layout([entry(),entry('model2')])),['assetABC1234']);
 assert.throws(()=>Scene.normalize(layout([entry('model1','assetABC1234'),entry('model1','assetABC1234')])),/repetido/);
});
test('GF-OPEN-02b: GLB ausente, com papel de jogador e manisfesto invalido bloqueiam aplicacao',()=>{
 assert.deepEqual(Scene.validateAssets(layout(),manifest()),['assetABC1234']);
 const absent={version:1,assets:[]};
 assert.throws(()=>Scene.validateAssets(layout(),absent),/ausente/);
 assert.throws(()=>Scene.validateAssets(layout(),null),/biblioteca/);
 assert.throws(()=>Scene.validateAssets(layout(),{version:1,assets:[{...manifest().assets[0],role:'player'}]}),/Cenario/);
 const original=spec(),updated=Scene.apply(original,layout(),manifest());
 assert.equal(updated.stageConfig[0].sceneObjects[0].kind,'glb');
 assert.deepEqual(updated.stageConfig[1].sceneObjects,[]);
 assert.equal(original.stageConfig.length,0);
 assert.throws(()=>Scene.apply(original,layout(),absent),/ausente/);
});
function boot(extraStages){
 const env={console,AbortController};vm.createContext(env);
 vm.runInContext(fs.readFileSync(require.resolve('../vendor/three-source.js'),'utf8'),env);
 vm.runInContext(env.GameForgeThreeSource,env);
 const elements={},frames=[];let scene;
 const element=id=>elements[id]||(elements[id]={textContent:'',style:{},classList:{add(){},remove(){}},
  dataset:{},addEventListener(event,fn){this[event]=fn;},focus(){},getBoundingClientRect(){return {width:960,height:540}}});
 const T={...env.THREE,WebGLRenderer:class{
  constructor(){this.shadowMap={};this.info={render:{calls:0},memory:{geometries:0}};this.renderLists={dispose(){}}}
  setClearColor(){}setPixelRatio(){}setSize(){}render(s){scene=s}
 }};
 const binary=makeGlb();
 const assets=[{id:'assetABC1234',base64:binary.toString('base64'),role:'scene',x:10,z:7,scale:1}];
 const context={THREE:T,GAME_SPEC:{genre:'arena',dimension:'3d',title:'Teste',stages:['A','B'],
   worldOptions:{size:48,seed:1,quality:'low'},stageConfig:extraStages},
  GF_SCENE_ASSETS:assets,gameForgeDecodeGLB:GLB.decode,gameForgeWorldRules:R,
  document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){}},
  performance:{now:()=>0},requestAnimationFrame:f=>frames.push(f),addEventListener(){},window:null,globalThis:null};
 context.window=context;context.globalThis=context;
 vm.createContext(context);vm.runInContext('('+runtime.toString()+')()',context);
 function frame(){const fn=frames.shift();assert.equal(typeof fn,'function');fn(16);}
 frame();
 function models(){
  const result=[];scene.traverse(o=>{if(o.userData?.gameForgeImported&&o.userData.gameForgeAssetId==='assetABC1234')result.push(o)});
  return result;
 }
 return {models,scene,elements,frame};
}
test('GF-OPEN-02b: modelo ligado a fase nao aparece duas vezes e e transformado',()=>{
 const cfg=[{sceneObjects:[entry()]},{sceneObjects:[]}];
 const g=boot(cfg),items=g.models();
 assert.equal(items.length,1,'deve renderizar so a instancia controlada pelo editor');
 assert.equal(items[0].position.x,4);
 assert.equal(items[0].position.z,3);
 assert.equal(items[0].scale.x,1.4);
 assert.ok(Math.abs(items[0].rotation.y-Math.PI/2)<1e-5);
 assert.equal(items[0].userData.gameForgeScene3D,'model1');
});
test('GF-OPEN-02b: sem layout GLB a importacao antiga continua intacta',()=>{
 const g=boot([{},{}]),items=g.models();
 assert.equal(items.length,1);assert.equal(items[0].position.x,10);
 assert.equal(items[0].position.z,7);
});
test('GF-OPEN-02b: outro modelo sem referencia ainda e renderizado normalmente',()=>{
 const g=boot([{sceneObjects:[{id:'caixa',kind:'crate',name:'Caixa',x:2,z:2,yaw:0,scale:1,color:'#ffffff',collidable:true}]},{}]);
 const models=g.models();assert.equal(models.length,1);assert.equal(models[0].position.x,10);
});
