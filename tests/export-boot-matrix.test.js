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

function environment(files,dimension){
 const callbacks=[],handlers={},elements=new Map(),errors=[];
 let now=0,drawCount=0;
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
   elements.set(id,{
    id,style:{},dataset:{},textContent:'',innerText:'',innerHTML:'',width:960,height:540,
    classList:{add(){},remove(){},contains(){return false;}},
    addEventListener(type,handler){(events[type]??=[]).push(handler);},
    click(){for(const callback of events.click||[])callback({preventDefault(){}});},
    focus(){},setAttribute(){},appendChild(){},removeChild(){},
    getBoundingClientRect(){return {left:0,top:0,width:960,height:540};},
    getContext(){return canvas2d;},
    setPointerCapture(){}
   });
  }
  return elements.get(id);
 }
 const doc={
  getElementById:element,createElement:()=>element('created-'+elements.size),
  querySelector:()=>element('first-query'),querySelectorAll:()=>[],
  addEventListener(type,cb){(handlers[type]??=[]).push(cb);}
 };
 const env={
  console,AbortController,AbortSignal,Uint8Array,Uint8ClampedArray,TextDecoder,TextEncoder,
  document:doc,performance:{now:()=>now},
  requestAnimationFrame:callback=>callbacks.push(callback),
  addEventListener(type,cb){(handlers[type]??=[]).push(cb);},
  setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
  navigator:{userAgent:'GameForge CI'},
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
   render(scene){drawCount++;assert.ok(scene?.isScene);}
  }};
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
 return {env,tick,input,element,errors,draws:()=>drawCount,telemetry:()=>env.__gameforgeTelemetry()};
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
