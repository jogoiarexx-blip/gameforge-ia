'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Parser=require('../js/parser'),Design=require('../js/graphics-design'),Factory=require('../js/graphics-runtime');
const corpus=require('../training/graphics-ptbr-v4.json');
test('GF-GFX-01: 80 pedidos verificam cinco estilos nos 16 modelos',()=>{
 assert.equal(corpus.cases.length,80);assert.equal(new Set(corpus.cases.map(c=>c.instruction)).size,80);
 assert.equal(new Set(corpus.cases.map(c=>c.expected.genre+'-'+c.expected.dimension)).size,16);
 const failures=[];
 for(const {instruction,expected:e} of corpus.cases){
  const s=Parser.parseGdd('',instruction);
  for(const key of ['genre','dimension'])if(s[key]!==e[key])failures.push(instruction+' '+key+' '+s[key]);
  for(const key of ['style','quality','atmosphere'])if(s.renderProfile[key]!==e[key])failures.push(instruction+' '+key+' '+s.renderProfile[key]);
  if(s.designIR.blocked.length)failures.push(instruction+' bloqueado');
 }
 assert.deepEqual(failures,[]);
});
test('GF-GFX-01: última ordem, opções manuais e negações locais são respeitadas',()=>{
 const s=Parser.parseGdd('# Arena 3D\nVisual pixel art com sombras e qualidade alta.','Agora cartoon, qualidade leve, sem sombras e sem partículas.');
 assert.equal(s.renderProfile.style,'cartoon');assert.equal(s.renderProfile.quality,'low');assert.equal(s.renderProfile.shadows,false);assert.equal(s.renderProfile.particles,false);
 const no=Parser.parseGdd('','Quero jogo de arena 3D, sem pixel art, com cartoon.');
 assert.equal(no.renderProfile.style,'cartoon');
 const manual=Parser.parseGdd('','RPG 3D, qualidade alta.',{graphicsQuality:'low'});
 assert.equal(manual.renderProfile.quality,'low');assert.equal(manual.worldOptions.quality,'low');
 const sameLine=Parser.parseGdd('','Jogo de plataforma 2D, cartoon, depois pixel art, qualidade leve, depois qualidade alta.');
 assert.equal(sameLine.renderProfile.style,'pixel');assert.equal(sameLine.renderProfile.quality,'high');
});
test('GF-GFX-01: fotorrealismo não é apresentado como asset ou ray tracing implementado',()=>{
 const spec=Parser.parseGdd('','FPS 3D fotorrealista com texturas 4K e ray tracing.');
 assert.equal(spec.renderProfile.style,'natural');
 assert.ok(spec.implementation.pending.some(x=>x.id==='advanced-graphics'));
 assert.equal(spec.implementation.applied.some(x=>x.id==='advanced-graphics'),false);
});
test('GF-GFX-01: desenho 2D tem formas, detalhes, habitat e personagens diferenciados',()=>{
 const commands=[];
 const gradient={addColorStop:(...a)=>commands.push(['colorStop',...a])};
 const c=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(t,k)=>k in t?t[k]:(...a)=>commands.push([k,...a]),set:(t,k,v)=>(t[k]=v,true)});
 const g=Factory({renderProfile:{style:'illustrated',quality:'high',theme:'desert'}});
 g.backdrop(c,960,540,2);g.actor(c,120,120,20);g.surface(c,0,400,300,60);g.habitat(c,30,30,100,300,'aquarium');g.product(c,70,70,1,'aquarium');g.finish(c,960,540);
 assert.ok(commands.some(x=>x[0]==='ellipse'));assert.ok(commands.some(x=>x[0]==='quadraticCurveTo'));
 assert.equal(g.snapshot().actors,1);assert.equal(g.snapshot().finishes,1);
 assert.equal(g.detail,3);assert.equal(g.palette.ground,'#aa7950');
 assert.equal(Factory({renderProfile:{quality:'low'}}).detail,1);
});
test('GF-GFX-01: cena Three recebe luz, material e sombras sem recriar por quadro',()=>{
 require('../vendor/three-source');const env={AbortController,AbortSignal};require('node:vm').runInNewContext(globalThis.GameForgeThreeSource,env);const T=env.THREE;
 const scene=new T.Scene(),light=new T.DirectionalLight(),hemi=new T.HemisphereLight();scene.add(light,hemi);
 const material=new T.MeshStandardMaterial({roughness:1,metalness:0,flatShading:true});
 const mesh=new T.Mesh(new T.BoxGeometry(),material);scene.add(mesh);
 const renderer={shadowMap:{}};
 const g=Factory({renderProfile:{style:'natural',quality:'high',atmosphere:'sunset',shadows:true}});
 g.scene(T,renderer,scene,false);
 assert.equal(renderer.toneMapping,T.ACESFilmicToneMapping);assert.equal(renderer.shadowMap.enabled,true);
 assert.equal(mesh.receiveShadow,true);assert.equal(material.roughness,.72);assert.equal(material.flatShading,false);
 assert.equal(light.color.getHex(),0xffb879);
 const stats=g.snapshot();g.scene(T,renderer,scene,false);assert.deepEqual(g.snapshot(),stats,'não realoca/materializa a mesma cena a cada frame');
 const dark=Factory({renderProfile:{quality:'high',shadows:false}});dark.scene(T,renderer,scene,false);
 assert.equal(renderer.shadowMap.enabled,false);assert.equal(mesh.castShadow,false);
 const low=Factory({renderProfile:{quality:'low'}});low.scene(T,renderer,new T.Scene(),false);assert.equal(renderer.shadowMap.enabled,false);
 mesh.geometry.dispose();material.dispose();
});
test('GF-GFX-01: perfil passa por backup e registra parâmetros executáveis',()=>{
 require('../js/runtime-template');const G=require('../js/generator'),B=require('../js/project-backup');
 const s=Parser.parseGdd('','Quero jogo de arena 2D cartoon com qualidade alta.');
 const files=G.generate(s,'');const encoded=B.encode({name:'Visual',files,gdd:'',instruction:s.instructions});
 assert.equal(B.decode(encoded).files['PERFIL_VISUAL.json'],files['PERFIL_VISUAL.json']);
 assert.equal(JSON.parse(files['PERFIL_VISUAL.json']).style,'cartoon');
});
