'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const Layout=require('../js/scene3d-layout.js');
const Project=require('../js/project-backup.js');
const gameForgeWorldRules=require('../js/world-rules.js');
const threeBoot=require('../js/three-runtime.js');
function obj(id='obj1',change={}){return {id,kind:'crate',name:'Caixa',x:2,z:3,yaw:0,scale:1,color:'#6699bb',collidable:true,...change};}
const layout=()=>({version:1,stages:[{objects:[obj()]}]});
test('GF-OPEN-02: valida e normaliza objetos sem mutar origem',()=>{
 const orig=layout(),copy=JSON.stringify(orig);
 const clean=Layout.normalize(orig);assert.deepEqual(clean,orig);assert.equal(JSON.stringify(orig),copy);
 assert.equal(Layout.normalize(JSON.stringify(orig)).stages[0].objects.length,1);
});
test('GF-OPEN-02: nao aceita codigo, HTML, dados invalidos, lampadas em excesso ou IDs repetidos',()=>{
 const tests=[
  {version:0,stages:[{objects:[]}]},
  {version:1,stages:[{objects:[obj('obj1',{kind:'evil'})]}]},
  {version:1,stages:[{objects:[obj('obj1',{x:99})]}]},
  {version:1,stages:[{objects:[obj('obj1',{name:'<script>'})]}]}, // nome e texto apenas, nao executavel
  {version:1,stages:[{objects:[obj('obj1',{scale:10})]}]},
  {version:1,stages:[{objects:[obj('obj1'),obj('obj1')]}]},
  {version:1,stages:[{objects:[obj('obj1',{color:'red'})]}]},
  {version:1,stages:[{objects:[obj('obj1',{collidable:'yes'})]}]},
  {version:1,stages:[{objects:[obj('obj1',{kind:'lamp'}),obj('obj2',{kind:'lamp'}),obj('obj3',{kind:'lamp'})]}]}
 ];
 for(const [i,c] of tests.entries()){
  if(i===3)assert.equal(Layout.normalize(c).stages[0].objects[0].name,'<script>');
  else assert.throws(()=>Layout.normalize(c),Error,'fixture '+i);
 }
 assert.throws(()=>Layout.normalize('x'.repeat(91000)),/90 KB/);
 assert.throws(()=>Layout.normalize({version:1,stages:Array.from({length:31},()=>({objects:[]}))}),/Quantidade/);
});
test('GF-OPEN-02: aplica somente nas fases 3D suportadas, preserva configs existentes',()=>{
 const spec={dimension:'3d',genre:'rpg',title:'Teste',stages:['A','B'],stageConfig:[{boss:'yes',enemies:3},{mission:'collect'}]};
 const next=Layout.apply(spec,layout());
 assert.equal(next.stageConfig[0].sceneObjects.length,1);
 assert.equal(next.stageConfig[0].boss,'yes');
 assert.equal(next.stageConfig[1].mission,'collect');
 assert.deepEqual(next.stageConfig[1].sceneObjects,[]);
 assert.equal(spec.stageConfig[0].sceneObjects,undefined);
 assert.equal(Layout.extract(next).stages.length,2);
 assert.throws(()=>Layout.apply({...spec,genre:'racing'},layout()),/somente/);
 assert.throws(()=>Layout.apply({...spec,dimension:'2d'},layout()),/somente/);
 assert.throws(()=>Layout.apply({...spec,stages:['A']},{version:1,stages:[{objects:[]},{objects:[]}]}),/Quantidade/);
});
test('GF-OPEN-02: backup persistente preserva JSON de cena e rejeita tamanho excessivo',()=>{
 const raw=JSON.stringify(layout());
 const snap={name:'A',gdd:'# A',instruction:'',files:{'game.js':'abc','style.css':'body{}','SCENE3D_LAYOUT.json':raw},scene3dJson:raw};
 const out=Project.decode(Project.encode(snap));assert.equal(out.scene3dJson,raw);assert.equal(out.files['SCENE3D_LAYOUT.json'],raw);
 assert.throws(()=>Project.encode({...snap,scene3dJson:'x'.repeat(91000)}),/Cena 3D/);
});
function game(overrides={}){
 const env={console,AbortController};vm.createContext(env);
 vm.runInContext(fs.readFileSync(require.resolve('../vendor/three-source.js'),'utf8'),env);
 vm.runInContext(env.GameForgeThreeSource,env);
 const nodes={},callbacks=[];let currentScene;
 const element=id=>nodes[id]||(nodes[id]={textContent:'',style:{},classList:{add(){},remove(){}},dataset:{},addEventListener(type,fn){this[type]=fn;},focus(){},getBoundingClientRect(){return {width:960,height:540}}});
 const THREE={...env.THREE,WebGLRenderer:class{constructor(){this.shadowMap={};this.info={render:{calls:0},memory:{geometries:0}};this.renderLists={dispose(){}}}setClearColor(){}setPixelRatio(){}setSize(){}render(scene){currentScene=scene;}}};
 const p={THREE,GAME_SPEC:{genre:'arena',dimension:'3d',title:'Fase',stages:['Inicio'],worldOptions:{size:48,quality:'low',seed:1},stageConfig:[{enemies:1,sceneObjects:[obj('caixa'),obj('luz',{kind:'lamp',collidable:false,x:5})]}],...overrides},
 document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){}},performance:{now:()=>0},requestAnimationFrame:cb=>callbacks.push(cb),addEventListener(){},gameForgeWorldRules,window:null,globalThis:null};
 p.window=p;p.globalThis=p;vm.createContext(p);
 vm.runInContext('('+threeBoot.toString()+')()',p);
 callbacks.shift()(16);return {scene:currentScene,element};
}
test('GF-OPEN-02: runtime exportado cria objetos e luzes que pertencem ao stage',()=>{
 const g=game(),found={};g.scene.traverse(n=>{if(n.userData.gameForgeScene3D)found[n.userData.gameForgeScene3D]=n;});
 assert.ok(found.caixa);assert.ok(found.luz);
 assert.equal(found.caixa.position.x,2);assert.equal(found.caixa.position.z,3);
 assert.equal(found.luz.children.filter(x=>x.isPointLight).length,1);
});
test('GF-OPEN-02: outro genero 3D nao recebe objetos da cena sem contrato',()=>{
 const g=game({genre:'racing'});let count=0;g.scene.traverse(n=>{if(n.userData.gameForgeScene3D)count++;});
 assert.equal(count,0);
});
