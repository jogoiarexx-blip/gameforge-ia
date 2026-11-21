'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const Parser=require('../js/parser.js'),World=require('../js/snes2d-world.js');
const Animator=require('../js/snes2d-animator.js');
const Editor=require('../js/snes2d-editor.js'),Project=require('../js/project-backup.js');
require('../js/runtime-template.js');require('../js/shooter-runtime.js');
require('../js/render-cache.js');require('../js/graphics-runtime.js');require('../js/strategy-rules.js');
require('../js/expanded-2d-runtime.js');require('../js/snes2d-runtime.js');
const Generator=require('../js/generator.js'),Caps=require('../js/game-capabilities.js');
const source='# Labirinto de pixel art\n\n## Fase 1 - Salão\nJogo de plataforma SNES 2D.\n## Fase 2 - Torre\nInimigos com animação e cristais.';
const png='data:image/png;base64,'+Buffer.alloc(70,1).toString('base64');
function atlas(){
 const frames={};
 for(let row=0;row<4;row++)for(let col=0;col<4;col++)
  frames['f'+row+'_'+col]={x:col*16,y:row*16,w:16,h:16};
 const animations={};
 for(const [row,key]of ['idle','walk','attack','hurt'].entries())
  animations[key]={fps:10,frames:Array.from({length:4},(_,i)=>'f'+row+'_'+i),
   ...(key==='attack'?{hitboxes:[{frame:1,x:12,y:3,w:6,h:9}]}:{})};
 return {frames,animations};
}
function spec(genre='platform'){return Parser.parseGdd(source,'',{genre,dimension:'2d',engineMode:'snes2d'});}
test('GF-SNES-02: Animator embutido tem estados, transições e hitbox real de ataque',()=>{
 const a=Animator({}),p=a.create('player');
 assert.equal(p.state,'idle');assert.equal(a.hasCustom('player'),false);
 a.update(p,.1,{move:true});assert.equal(p.state,'walk');
 a.update(p,.1,{attack:true});assert.equal(p.state,'attack');assert.equal(p.attackSerial,1);
 const boxes=a.hitboxes(p,{x:100,y:200,face:1});
 assert.ok(boxes.length>0);assert.ok(boxes[0].x>100);
 const before=p.hitSerial;
 a.update(p,.13,{});assert.ok(p.hitSerial>=before);assert.equal(p.state,'attack');
 a.update(p,.3,{});assert.ok(p.finished);
 a.update(p,.01,{});assert.equal(p.state,'idle');
 a.update(p,.01,{jump:true});assert.equal(p.state,'jump');
 a.update(p,.01,{hurt:true});assert.equal(p.state,'hurt');
 assert.equal(a.snapshot(p).role,'player');
});
test('GF-SNES-02: JSON de atlas validado e ataques importados não ficam em loop infinito',()=>{
 const {frames,animations}=atlas();
 const a=Animator({player:{image:png,width:64,height:64,frames,animations}});
 assert.equal(a.hasCustom('player'),true);
 const ctrl=a.create('player');
 a.update(ctrl,.1,{attack:true});assert.equal(ctrl.state,'attack');
 assert.equal(a.hitboxes(ctrl,{x:30,y:20,face:1}).length,1);
 const custom=a.verify('player',{image:png,width:64,height:64,frames,animations});
 assert.equal(custom.states.attack.loop,false);
 assert.equal(custom.states.attack.fps,10);
 assert.throws(()=>a.verify('player',{image:'https://example.com/a.png',width:64,height:64,frames,animations}),/inline/);
 assert.throws(()=>a.verify('player',{image:png,width:64,height:64,frames:{...frames,bad:{x:63,y:0,w:16,h:16}},animations}),/fora da spritesheet/);
 assert.throws(()=>a.verify('player',{image:png,width:513,height:64,frames,animations}),/Dimensões/);
 const grid=a.gridAtlas(64,64);assert.equal(grid.animations.walk.frames.length,4);
 assert.throws(()=>a.gridAtlas(62,64),/grade de 4/);
});
test('GF-SNES-02: edições de mapa têm schema, limites por fase e dados não executáveis',()=>{
 const m=Editor.normalizeMaps({version:1,stages:[[
  {layer:'collision',x:64,y:64,id:1},{layer:'collision',x:64,y:64,id:0},
  {layer:'foreground',x:64,y:64,id:5}
 ]]},'platform',2);
 assert.equal(m.stages.length,2);assert.equal(m.stages[0].length,2);
 assert.equal(m.stages[0][0].id,0);
 assert.throws(()=>Editor.normalizeMaps({version:1,stages:[[{layer:'collision',x:61,y:64,id:1}]]},'rpg',2),/inválido/);
 assert.throws(()=>Editor.normalizeMaps({version:1,stages:[[{layer:'wrong',x:64,y:64,id:1}]]},'rpg',2),/inválido/);
 assert.throws(()=>Editor.normalizeMaps({version:1,stages:[new Array(1025).fill({layer:'collision',x:16,y:16,id:1})]},'rpg',2),/1024/);
 assert.throws(()=>Editor.normalizeMaps({version:1,stages:[[],[],[]]},'rpg',2),/inválido/);
 const w=World({genre:'platform',snes2d:{theme:'forest',maps:m}});
 assert.equal(w.tileAt('collision',64,64),0);
 assert.equal(w.tileAt('foreground',64,64),5);
 w.build(1);assert.equal(w.tileAt('foreground',64,64),0);
});
test('GF-SNES-02: editar game.js sem recriar arquivos, preservar código e salvar atlas no backup',()=>{
 const s=spec(),files=Generator.generate(s,source),old=files['game.js'];
 assert.match(old,/const GameForgeSNES2DAnimator =/);
 assert.ok(Project.allowedFiles.includes('SNES2D_MAPAS.json'));
 assert.ok(Project.allowedFiles.includes('SNES2D_ATLAS.json'));
 const changes={maps:{version:1,stages:[
  [{layer:'collision',x:96,y:64,id:1},{layer:'foreground',x:96,y:64,id:5}],
  [{layer:'collision',x:112,y:80,id:1}]]},sprites:{player:{image:png,width:64,height:64,...atlas()}}};
 const result=Editor.editGenerated(files,changes);
 assert.equal(result.spec.snes2d.maps.stages[0].length,2);
 assert.equal(result.spec.snes2d.sprites.player.width,64);
 assert.equal(result.files['style.css'],files['style.css']);
 assert.equal(result.files['index.html'],files['index.html']);
 assert.equal(result.files['SNES2D_MAPAS.json'].includes('"x": 96'),true);
 assert.match(result.files['SNES2D_ATLAS.json'],/"embeddedInGameJs": true/);
 assert.equal(result.files['game.js'].includes(png),true);
 assert.doesNotThrow(()=>new vm.Script(result.files['game.js']));
 const round=Editor.extractGenerated(result.files);
 assert.equal(round.spec.snes2d.maps.stages[1][0].x,112);
 const originalRest=old.slice(old.indexOf('const gameForgeRenderCacheFactory'));
 const editedRest=result.files['game.js'].slice(result.files['game.js'].indexOf('const gameForgeRenderCacheFactory'));
 assert.equal(originalRest,editedRest,'código do motor não deve ser reescrito pelo editor');
 const raw=Project.encode({name:'Atlas de teste',gdd:source,instruction:'',files:result.files,creationOptions:{engineMode:'snes2d',dimension:'2d',genre:'platform'}});
 const restored=Project.decode(raw);
 assert.deepEqual(restored.files['SNES2D_MAPAS.json'],result.files['SNES2D_MAPAS.json']);
 assert.equal(restored.files['game.js'],result.files['game.js']);
 assert.equal(restored.creationOptions.engineMode,'snes2d');
 const w=World(result.spec);assert.equal(w.tileAt('collision',96,64),1);
});
test('GF-SNES-02: não permitir importar atlas inválido nem mudar jogo clássico ou GF-SNES-01 antigo',()=>{
 const files=Generator.generate(spec(),source);
 const invalidMaps={version:1,stages:[[{layer:'collision',x:5000,y:0,id:1}]]};
 assert.throws(()=>Editor.editGenerated(files,{maps:invalidMaps}),/Mapa:/);
 assert.throws(()=>Editor.editGenerated(files,{sprites:{player:{image:'invalid',width:64,height:64,...atlas()}}}),/inline/);
 assert.ok(Caps.check({...spec(),snes2d:{...spec().snes2d,maps:invalidMaps}}).some(x=>/SNES 2D/.test(x)));
 const normal=Generator.generate(Parser.parseGdd(source,'',{genre:'platform',dimension:'2d',engineMode:'default'}),source);
 assert.throws(()=>Editor.editGenerated(normal,{maps:{version:1,stages:[]}}),/apenas para jogo SNES 2D/);
 const legacy={...files,'game.js':files['game.js'].replace('const GameForgeSNES2DAnimator = ','const OldSprites = ')};
 assert.throws(()=>Editor.extractGenerated(legacy),/GF-SNES-01/);
});
