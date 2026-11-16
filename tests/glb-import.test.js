const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const GLB=require('../js/glb-runtime.js');
const Project=require('../js/project-backup.js');
const Generator=require('../js/generator.js');
function fixture(){
  const json={
    asset:{version:'2.0'},buffers:[{byteLength:44}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:6}],
    accessors:[{bufferView:0,componentType:5126,type:'VEC3',count:3},{bufferView:1,componentType:5123,type:'SCALAR',count:3}],
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0
  };
  const bin=new Uint8Array(44);
  const view=new DataView(bin.buffer);
  [0,0,0,1,0,0,0,1,0].forEach((v,i)=>view.setFloat32(i*4,v,true));
  [0,1,2].forEach((v,i)=>view.setUint16(36+i*2,v,true));
  const enc=new TextEncoder().encode(JSON.stringify(json));
  const jlen=Math.ceil(enc.length/4)*4,all=new Uint8Array(12+8+jlen+8+bin.length),dv=new DataView(all.buffer);
  dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,all.length,true);
  dv.setUint32(12,jlen,true);dv.setUint32(16,0x4e4f534a,true);all.fill(32,20,20+jlen);all.set(enc,20);
  const off=20+jlen;dv.setUint32(off,bin.length,true);dv.setUint32(off+4,0x004e4942,true);all.set(bin,off+8);
  return all;
}
function three(){
  const context={console};vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../vendor/three-source.js'),'utf8'),context);
  vm.runInContext(context.GameForgeThreeSource,context);
  return context.THREE;
}
test('GLB estático com geometria real converte em Mesh e é normalizado para a cena',()=>{
  const root=GLB.decode(three(),fixture());
  let count=0,vertices=0;
  root.traverse(o=>{if(o.isMesh){count++;vertices+=o.geometry.getAttribute('position').count;}});
  assert.equal(count,1);assert.equal(vertices,3);assert.equal(root.userData.gameForgeAsset.animated,false);
  assert.ok(root.position.y>=-0.01);
});
test('GLB com cabeçalho inválido e extensão obrigatória é rejeitado sem executar código',()=>{
  assert.throws(()=>GLB.decode(three(),new Uint8Array(30)),/GLB inválido|Cabeçalho/);
  const b=fixture();
  const jsonLen=new DataView(b.buffer).getUint32(12,true);
  const json=JSON.parse(new TextDecoder().decode(b.subarray(20,20+jsonLen)).trim());
  json.extensionsRequired=['KHR_draco_mesh_compression'];
  const payload=JSON.stringify(json);
  assert.ok(payload.length<=jsonLen);
  b.fill(32,20,20+jsonLen);b.set(new TextEncoder().encode(payload),20);
  assert.throws(()=>GLB.decode(three(),b),/Extensões GLB obrigatórias/);
});
test('GLB importado entra na prévia HTML isolada e na exportação, com limites de coordenadas',()=>{
  globalThis.GameForgeGLB=GLB;
  const b=Buffer.from(fixture()).toString('base64');
  const files={'ASSET_CENARIO.b64':b,'ASSET_CENARIO.json':JSON.stringify({x:900,z:-900,scale:99})};
  const preview=Generator.shell('Exemplo','body{}','console.log("test")',true,files);
  assert.match(preview,/const GF_SCENE_GLB_BASE64/);
  assert.match(preview,/const gameForgeDecodeGLB/);
  assert.match(preview,/"x":35,"z":-35,"scale":4/);
  const html=Generator.shell('Exemplo','body{}','',false,files);
  assert.match(html,/<script>const GF_SCENE_GLB_BASE64/);
  assert.match(html,/<script src="game.js" defer>/);
  delete globalThis.GameForgeGLB;
});
test('backup portátil preserva modelo GLB e posição sem apagar dados antigos',()=>{
  const payload=Buffer.from(fixture()).toString('base64'),json=JSON.stringify({x:5,z:4,scale:1});
  const snapshot={name:'Jogo 3D',gdd:'# Jogo',instruction:'',files:{'game.js':'const GAME_SPEC = {};','style.css':'','ASSET_CENARIO.b64':payload,'ASSET_CENARIO.json':json},history:[]};
  // A validação exige a presença dos dois arquivos de jogo.
  snapshot.files['style.css']='body{}';
  const copy=Project.decode(Project.encode(snapshot));
  assert.equal(copy.files['ASSET_CENARIO.b64'],payload);
  assert.equal(copy.files['ASSET_CENARIO.json'],json);
  assert.equal(copy.files['game.js'],snapshot.files['game.js']);
});
