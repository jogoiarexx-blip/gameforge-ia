'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const GLB=require('../js/glb-runtime.js');
const Animator=require('../js/actor-animations.js')();
const Assets=require('../js/asset-library.js');
function three(){
 const env={console,AbortController,AbortSignal,TextDecoder,TextEncoder,Uint8Array,Uint8ClampedArray};vm.createContext(env);
 vm.runInContext(fs.readFileSync(require.resolve('../vendor/three-source.js'),'utf8'),env);
 vm.runInContext(env.GameForgeThreeSource,env);
 return env.THREE;
}
function fixture(){
 const parts=[],views=[],accessors=[];let bytes=0;
 function add(values,type,componentType,itemSize){
  const size=values.BYTES_PER_ELEMENT;
  const pad=(4-bytes%4)%4;
  if(pad){parts.push(Buffer.alloc(pad));bytes+=pad;}
  const buffer=Buffer.from(values.buffer,values.byteOffset,values.byteLength),offset=bytes;
  parts.push(buffer);bytes+=buffer.length;
  const viewIndex=views.push({buffer:0,byteOffset:offset,byteLength:buffer.length})-1;
  return accessors.push({bufferView:viewIndex,componentType,type,count:values.length/itemSize})-1;
 }
 const pos=add(new Float32Array([0,0,0,1,0,0,0,1,0]),'VEC3',5126,3);
 const joints=add(new Uint16Array([0,0,0,0,0,0,0,0,0,0,0,0]),'VEC4',5123,4);
 const weights=add(new Float32Array([1,0,0,0,1,0,0,0,1,0,0,0]),'VEC4',5126,4);
 const inverse=add(new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),'MAT4',5126,16);
 const times=add(new Float32Array([0,1]),'SCALAR',5126,1);
 const rotations=add(new Float32Array([0,0,0,1,0,.70710678,0,.70710678]),'VEC4',5126,4);
 const json={asset:{version:'2.0'},buffers:[{byteLength:bytes}],bufferViews:views,accessors,
  meshes:[{primitives:[{attributes:{POSITION:pos,JOINTS_0:joints,WEIGHTS_0:weights}}]}],
  nodes:[{name:'Armature',children:[1]},{name:'mixamorig:RightArm'},{name:'Model',mesh:0,skin:0}],
  skins:[{joints:[1],inverseBindMatrices:inverse}],scenes:[{nodes:[0,2]}],scene:0,
  animations:[
   {name:'Idle',samplers:[{input:times,output:rotations}],channels:[{sampler:0,target:{node:1,path:'rotation'}}]},
   {name:'Walking',samplers:[{input:times,output:rotations}],channels:[{sampler:0,target:{node:1,path:'rotation'}}]},
   {name:'Running',samplers:[{input:times,output:rotations}],channels:[{sampler:0,target:{node:1,path:'rotation'}}]},
   {name:'Aim',samplers:[{input:times,output:rotations}],channels:[{sampler:0,target:{node:1,path:'rotation'}}]},
   {name:'Attack',samplers:[{input:times,output:rotations}],channels:[{sampler:0,target:{node:1,path:'rotation'}}]},
   {name:'Hit',samplers:[{input:times,output:rotations}],channels:[{sampler:0,target:{node:1,path:'rotation'}}]},
   {name:'Death',samplers:[{input:times,output:rotations}],channels:[{sampler:0,target:{node:1,path:'rotation'}}]}
  ]};
 const data=Buffer.from(JSON.stringify(json));const jsonlen=(data.length+3)&~3;
 const bin=Buffer.concat(parts),binlen=(bin.length+3)&~3,out=Buffer.alloc(12+8+jsonlen+8+binlen);
 out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
 out.writeUInt32LE(jsonlen,12);out.writeUInt32LE(0x4e4f534a,16);out.fill(32,20,20+jsonlen);data.copy(out,20);
 const at=20+jsonlen;out.writeUInt32LE(binlen,at);out.writeUInt32LE(0x004e4942,at+4);bin.copy(out,at+8);
 return new Uint8Array(out);
}
test('GF-015 decoder GLB reproduz rig, skin e sete clips reais em Three.js',()=>{
 const T=three(),bytes=fixture();
 const preflight=GLB.decode(null,bytes);assert.equal(preflight.primitives,1);
 const model=GLB.decode(T,bytes),meshes=[];
 model.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
 assert.equal(meshes.length,1);
 assert.equal(meshes[0].skeleton.bones.length,1);
 assert.equal(model.animations.length,7);
 assert.equal(model.userData.gameForgeAsset.animated,true);
 assert.equal(model.userData.gameForgeAsset.skinned,true);
 const anim=Animator.create(T,model);
 assert.equal(anim.available,true);
 assert.equal(anim.map.idle,'Idle');
 assert.equal(anim.map.walk,'Walking');
 assert.equal(anim.map.run,'Running');
 assert.equal(anim.map.aim,'Aim');
 assert.equal(anim.map.attack,'Attack');
 assert.equal(anim.map.hit,'Hit');
 assert.equal(anim.map.death,'Death');
 assert.equal(anim.setState('walk'),true);
 const bone=meshes[0].skeleton.bones[0],before=bone.quaternion.y;
 anim.update(.25);assert.notEqual(bone.quaternion.y,before,'AnimationMixer altera quaternion do osso');
 assert.equal(anim.setState('run'),true);
 assert.equal(anim.setState('attack'),true);
 anim.update(.2);assert.equal(anim.setState('death'),true);
 anim.dispose();
});
test('GF-015 manifestos aceitam papeis de jogador/inimigo e preservam cena antiga',()=>{
 const item={id:'character001',name:'personagem.glb',bytes:240,role:'player',placement:{x:0,z:0,scale:1}};
 const m=Assets.append(null,item);
 assert.equal(m.assets[0].role,'player');
 const newer=Assets.update(m,'character001',{role:'enemy'});
 assert.equal(newer.assets[0].role,'enemy');
 const scene=Assets.append(null,{...item,id:'scenex123',role:'scene'});
 assert.equal(scene.assets[0].role,'scene');
 assert.throws(()=>Assets.append(null,{...item,id:'badrole10',role:'boss'}),/Papel/);
});
test('GF-015 player e inimigo GLB são acoplados aos dois runtimes urbanos, sem CDN',()=>{
 const source=['urban-runtime.js','urban-mission-runtime.js'].map(file=>fs.readFileSync(require('node:path').join(__dirname,'../js',file),'utf8'));
 for(const s of source){
  assert.match(s,/gameForgeDecodeGLB/);
  assert.match(s,/GameForgeActorAnimations\.create/);
  assert.match(s,/role===role/);
  assert.match(s,/actorClipCount/);
 }
});

test('GF-015 v2 ataques e impactos aguardam clip; morte não volta a caminhar',()=>{
 const T=three(),model=GLB.decode(T,fixture()),anim=Animator.create(T,model);
 assert.equal(anim.setState('walk'),true);
 assert.equal(anim.setState('hit'),true);
 assert.equal(anim.state,'hit');
 assert.equal(anim.setState('walk'),false,'movimento não interrompe impacto imediatamente');
 for(let i=0;i<11;i++)anim.update(.1);
 assert.equal(anim.setState('walk'),true,'locomoção volta após fim do clipe de impacto');
 assert.equal(anim.setState('attack'),true);
 assert.equal(anim.setState('walk'),false,'tiro não reinicia locomoção antes da animação');
 assert.ok(anim.duration('death')>=.35);
 assert.equal(anim.setState('death'),true);
 assert.equal(anim.state,'death');
 for(let i=0;i<12;i++)anim.update(.1);
 assert.equal(anim.setState('walk'),false,'morte é terminal mesmo depois de terminar o clip');
 assert.equal(anim.state,'death');
 anim.dispose();
});
test('GF-015 v2 morte urbana persiste em grupo independente após objetivo e não altera recompensa',()=>{
 const source=fs.readFileSync(require('node:path').join(__dirname,'../js/urban-mission-runtime.js'),'utf8');
 assert.match(source,/corpseGroup=new T\.Group/);
 assert.match(source,/keepFallen\(target\)/);
 assert.match(source,/if\(!paused&&fallenGuards\.length\)updateFallen/);
 assert.match(source,/deathAnimations:fallenGuards\.length/);
 assert.match(source,/for\(const g of guards\)g\.animation\?\.dispose/);
 assert.match(source,/clearFallen\(\)/);
 assert.match(source,/deathOverlayPending=fallenGuards\.length>0/);
 assert.match(source,/if\(deathOverlayPending&&!fallenGuards\.length\)/);
});
