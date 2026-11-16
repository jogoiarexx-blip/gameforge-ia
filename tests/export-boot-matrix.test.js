'use strict';
// GF-002: testa o ARQUIVO game.js GERADO, não apenas a função-fonte do motor.
// Renderização isolada: Canvas/DOM simulados e Three.js do arquivo offline com
// apenas WebGLRenderer substituído, para detectar erros de inicialização.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const parser=require('../js/parser.js');
for(const moduleName of [
 'runtime-template','shooter-runtime','world-rules','software-renderer','three-runtime',
 'shooter-3d-runtime','strategy-rules','expanded-2d-runtime',
 'advanced-td-rules','advanced-td-runtime','combat-economy'
])require('../js/'+moduleName+'.js');
require('../vendor/three-source.js');
const generator=require('../js/generator.js');
const zipper=require('../js/zip.js');
const {validateFiles}=require('../tools/verify-exports.cjs');
const glb=require('../js/glb-runtime.js');
const assets=require('../js/asset-library.js');

function environment(files,dimension){
 const callbacks=[],handlers={},elements=new Map(),errors=[];
 let now=0,drawCount=0,lastScene=null;
 const gradient=()=>({addColorStop(){}});
 const canvas2d=new Proxy({
  createLinearGradient:gradient,createRadialGradient:gradient,
  measureText:value=>({width:String(value).length*7}),
  createImageData:(width,height)=>({data:new Uint8ClampedArray(width*height*4),width,height}),
  getImageData:(x,y,width,height)=>({data:new Uint8ClampedArray(width*height*4),width,height})
 },{get(target,key){return key in target?target[key]:()=>{};},set(target,key,value){target[key]=value;return true;}});
 function element(id){
  if(!elements.has(id)){
   const events={};
   const children=[];
   elements.set(id,{
    id,style:{},dataset:{},children,parentElement:null,
    textContent:'',innerText:'',innerHTML:'',width:960,height:540,
    classList:{add(){},remove(){},contains(){return false;}},
    addEventListener(type,handler){(events[type]??=[]).push(handler);},
    click(){for(const callback of events.click||[])callback({preventDefault(){}});},
    focus(){},setAttribute(){},
    append(...items){for(const child of items){children.push(child);if(child&&typeof child==='object')child.parentElement=this;}},
    appendChild(child){this.append(child);return child;},
    replaceChildren(...items){children.length=0;this.append(...items);},
    removeChild(child){const at=children.indexOf(child);if(at>=0)children.splice(at,1);},
    getBoundingClientRect(){return {left:0,top:0,width:960,height:540};},
    getContext(){return canvas2d;},
    setPointerCapture(){}
   });
  }
  return elements.get(id);
 }
 const doc={
  body:element('body'),getElementById:element,createElement:()=>element('created-'+elements.size),
  querySelector:()=>element('first-query'),querySelectorAll:()=>[],
  addEventListener(type,cb){(handlers[type]??=[]).push(cb);}
 };
 const env={
  console,AbortController,AbortSignal,Uint8Array,Uint8ClampedArray,TextDecoder,TextEncoder,
  document:doc,performance:{now:()=>now},
  requestAnimationFrame:callback=>callbacks.push(callback),
  addEventListener(type,cb){(handlers[type]??=[]).push(cb);},
  setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
  navigator:{userAgent:'GameForge CI'},atob:globalThis.atob,
  devicePixelRatio:1,innerWidth:960,innerHeight:540
 };
 env.window=env;env.globalThis=env;vm.createContext(env);
 if(dimension==='3d'){
  assert.ok(files['engine-3d.js'],'Motor offline 3D precisa existir');
  vm.runInContext(files['engine-3d.js'],env,{timeout:5000,filename:'engine-3d.js'});
  const T=env.THREE;
  assert.ok(T?.Scene&&T?.BufferGeometry,'Three.js local inicializou');
  env.THREE={...T,WebGLRenderer:class {
   constructor(){this.shadowMap={};this.info={render:{calls:0,triangles:0},memory:{geometries:0}};this.renderLists={dispose(){}};}
   setClearColor(){}setPixelRatio(){}setSize(width,height){element('game').width=width;element('game').height=height;}
   render(scene){drawCount++;assert.ok(scene?.isScene);lastScene=scene;}
  }};
 }
 // O HTML exportado carrega assets GLB como script inline antes de game.js.
 for(const [_,inline] of files['index.html'].matchAll(/<script>([\s\S]*?)<\/script>/gi)){
  vm.runInContext(inline,env,{timeout:5000,filename:'inline-assets.js'});
 }
 vm.runInContext(files['game.js'],env,{timeout:5000,filename:'game.js'});
 assert.ok(callbacks.length,'Motor exportado precisa agendar quadros');
 assert.equal(typeof env.__gameforgeTelemetry,'function','Telemetria do runtime exportado obrigatória');
 function tick(count=1){
  for(let n=0;n<count;n++){
   now+=1000/60;
   const cb=callbacks.shift();assert.equal(typeof cb,'function','rAF precisa continuar agendado');
   cb(now);
  }
 }
 function input(type,key){
  for(const listener of handlers[type]||[]){
   listener({key,code:key===' '?'Space':key,preventDefault(){},repeat:false,
    target:{tagName:'CANVAS'}});
  }
 }
 return {env,tick,input,element,errors,draws:()=>drawCount,scene:()=>lastScene,telemetry:()=>env.__gameforgeTelemetry()};
}
function filesFor(dimension,genre,extra=''){
 const gdd='# Matriz GameForge\n## Primeira fase\nControles, desafios e objetivo.\n';
 const spec=parser.parseGdd(gdd,extra,{genre,dimension});
 assert.equal(spec.genre,genre);
 assert.equal(spec.dimension,dimension);
 const files=generator.generate(spec,gdd);
 validateFiles(files,dimension,genre);
 return files;
}
const combinations=Object.entries(parser.styles).flatMap(([dimension,genres])=>genres.map(genre=>({dimension,genre})));
assert.equal(combinations.length,14,'A matriz deve ser atualizada quando um motor novo aparecer');

for(const {dimension,genre} of combinations){
 test('GF-002 exportação e inicialização offline '+dimension+'/'+genre,()=>{
  const files=filesFor(dimension,genre);
  const h=environment(files,dimension);
  const before=h.telemetry();
  assert.equal(before.state,'menu',genre+': inicia no menu');
  h.tick(2);
  h.element('start').click();
  assert.equal(h.telemetry().state,'play',genre+': botão Jogar deve funcionar');
  const start=h.telemetry();
  h.input('keydown','ArrowRight');
  h.tick(12);
  h.input('keyup','ArrowRight');
  const after=h.telemetry();
  assert.ok(after.state==='play'||after.state==='victory'||after.state==='intermission',genre+': estado inesperado');
  assert.ok(Number.isFinite(after.player?.x),genre+': jogador precisa ter posição válida');
  assert.ok(after.frames>=start.frames,genre+': relógio de quadros não pode regredir');
  if(dimension==='3d')assert.ok(h.draws()>0,genre+': renderer não recebeu cena');
  if(after.state==='play'){
   h.element('pause').click();
   h.tick(1); // Alguns motores publicam telemetria apenas no próximo quadro.
   assert.equal(h.telemetry().paused,true,genre+': pausa');
   h.tick(8);
   assert.equal(h.telemetry().paused,true,genre+': pausa persistente');
  }
 });
}
test('GF-002 exportação FPS com loja inicia após serializar múltiplos módulos',()=>{
 const files=filesFor('3d','fps','Crie um FPS 3D com loja para comprar munição, kit médico e melhorar armas.');
 assert.match(files['game.js'],/gameForgeCombatEconomyFactory/);
 const h=environment(files,'3d');h.tick(2);h.element('start').click();h.tick(15);
 assert.equal(h.telemetry().state,'play');
});
test('GF-002 ZIP reversível preserva os arquivos de todos os gêneros, incluindo dependências locais',async()=>{
 for(const {dimension,genre} of combinations){
  const generated=filesFor(dimension,genre);
  const archive=zipper.zipFiles(generated);
  const bytes=new Uint8Array(await archive.arrayBuffer());
  const decoded=zipper.unzipFiles(bytes);
  assert.deepEqual(Object.keys(decoded).sort(),Object.keys(generated).sort(),genre+': nomes no ZIP');
  for(const [name,contents] of Object.entries(generated)){
   assert.equal(Buffer.compare(Buffer.from(decoded[name]),Buffer.from(contents)),0,dimension+'/'+genre+': '+name);
  }
  if(dimension==='3d')assert.ok(decoded['engine-3d.js']&&decoded['THREE-LICENSE.txt']);
 }
});
test('GF-002 mutação no código exportado é detectada e ZIP não mascara quebra',()=>{
 const files=filesFor('3d','fps');
 const bad={...files,'game.js':files['game.js']+'\nconst x = ;'};
 assert.throws(()=>validateFiles(bad,'3d','fps'),SyntaxError);
 assert.doesNotThrow(()=>validateFiles(files,'3d','fps'));
});

function sampleGLB(){
 const json={
  asset:{version:'2.0'},buffers:[{byteLength:44}],
  bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:6}],
  accessors:[{bufferView:0,componentType:5126,type:'VEC3',count:3},{bufferView:1,componentType:5123,type:'SCALAR',count:3}],
  meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],
  nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0
 };
 const bin=new Uint8Array(44),dv=new DataView(bin.buffer);
 [0,0,0,1,0,0,0,1,0].forEach((v,i)=>dv.setFloat32(i*4,v,true));
 [0,1,2].forEach((v,i)=>dv.setUint16(36+i*2,v,true));
 const raw=new TextEncoder().encode(JSON.stringify(json));
 const len=Math.ceil(raw.length/4)*4,out=new Uint8Array(12+8+len+8+bin.length);
 const view=new DataView(out.buffer);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,out.length,true);
 view.setUint32(12,len,true);view.setUint32(16,0x4e4f534a,true);
 out.fill(32,20,20+len);out.set(raw,20);
 const start=20+len;view.setUint32(start,bin.length,true);view.setUint32(start+4,0x004e4942,true);
 out.set(bin,start+8);return out;
}
test('GF-002 GLB real permanece no ZIP e é instanciado na cena 3D exportada',async()=>{
 const model=sampleGLB(),id='modelogf02',files=filesFor('3d','arena');
 const manifest={version:1,assets:[{
  id,name:'cenario.glb',bytes:model.byteLength,role:'scene',
  placement:{x:5,z:4,scale:1.2}
 }]};
 const bundle={...files,
  'ASSET_LIBRARY.json':JSON.stringify(manifest),
  ['assets/'+id+'.glb']:model
 };
 bundle['index.html']=generator.shell('Cena de teste',files['style.css'],files['game.js'],false,bundle);
 validateFiles(bundle,'3d','arena');
 assert.match(bundle['index.html'],/GF_SCENE_ASSETS/);
 assert.match(bundle['index.html'],/gameForgeDecodeGLB/);
 const packed=zipper.zipFiles(bundle);
 const unpacked=zipper.unzipFiles(new Uint8Array(await packed.arrayBuffer()));
 assert.equal(Buffer.compare(Buffer.from(unpacked['assets/'+id+'.glb']),Buffer.from(model)),0);
 const restored={};
 for(const [name,bytes] of Object.entries(unpacked))
  restored[name]=name.endsWith('.glb')?bytes:new TextDecoder().decode(bytes);
 const game=environment(restored,'3d');game.tick(2);
 const imported=[];game.scene().traverse(o=>{if(o.userData?.gameForgeImported)imported.push(o);});
 assert.equal(imported.length,1,'GLB não foi instanciado após restaurar o ZIP');
 assert.equal(imported[0].position.x,5);
 assert.equal(imported[0].position.z,4);
 assert.equal(imported[0].scale.x,1.2);
 game.element('start').click();game.tick(3);
 assert.equal(game.telemetry().state,'play');
});
test('GF-002 reexportação após editar fases mantém especificação e jogo iniciável',async()=>{
 const first=parser.parseGdd('# Avanço\n## Fase Um\nInimigos e objetivos','',{dimension:'3d',genre:'fps'});
 const revised={...first,stages:['Fase Um','Fase Dois','Fase Final']};
 const files=generator.generate(revised,'# Avanço\n## Fase Um\n## Fase Dois\n## Fase Final');
 validateFiles(files,'3d','fps');
 const zip=zipper.zipFiles(files),unpacked=zipper.unzipFiles(new Uint8Array(await zip.arrayBuffer()));
 const restored=Object.fromEntries(Object.entries(unpacked).map(([name,bytes])=>[name,new TextDecoder().decode(bytes)]));
 const ctx=environment(restored,'3d');ctx.element('start').click();ctx.tick(8);
 assert.equal(ctx.telemetry().state,'play');
 assert.equal(JSON.parse(files['game.js'].match(/const GAME_SPEC = ([^\n]+);/)?.[1]).stages.length,3);
 assert.deepEqual(Array.from(revised.stages),['Fase Um','Fase Dois','Fase Final']);
});
