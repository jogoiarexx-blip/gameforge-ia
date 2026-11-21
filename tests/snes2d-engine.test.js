'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const Parser=require('../js/parser.js'),Caps=require('../js/game-capabilities.js');
require('../js/runtime-template.js');require('../js/shooter-runtime.js');require('../js/strategy-rules.js');
require('../js/expanded-2d-runtime.js');require('../js/render-cache.js');require('../js/graphics-runtime.js');
const World=require('../js/snes2d-world.js');
require('../js/snes2d-runtime.js');
const Generator=require('../js/generator.js'),{validateFiles}=require('../tools/verify-exports.cjs');
const sample='# CASTELO DAS QUATRO TORRES\n\n## Fase 1 - Pátio\nJogo de plataforma 2D em castelo com inimigos e desafios.\n## Fase 2 - Torre\nChegar ao final.\n';
test('GF-SNES-01: selecionar motor por opção ou texto e preservar motor padrão',()=>{
 const base=Parser.parseGdd(sample,'',{dimension:'2d',genre:'platform'});
 assert.equal(base.engineMode,'default');
 const opt=Parser.parseGdd(sample,'',{dimension:'2d',genre:'platform',engineMode:'snes2d'});
 assert.equal(opt.engineMode,'snes2d');
 assert.deepEqual(opt.snes2d.layers,['background','ground','decoration','foreground','collision']);
 assert.deepEqual(Caps.check(opt),[]);
 assert.ok(opt.implementation.applied.some(x=>x.id==='snes-tileworld'));
 assert.match(opt.limitations.join(' '),/não.*ROM|não.*rom|ROM/i);
 const auto=Parser.parseGdd('','Quero um jogo de plataforma 2D usando o motor SNES 2D com castelo e pontes.');
 assert.equal(auto.engineMode,'snes2d');
 assert.equal(auto.genre,'platform');
 const classic=Parser.parseGdd('','Quero um jogo de plataforma 2D usando motor SNES 2D.',{engineMode:'default'});
 assert.equal(classic.engineMode,'default');
});
test('GF-SNES-01: rejeitar SNES 2D em dimensões e gêneros incompatíveis',()=>{
 assert.throws(()=>Parser.parseGdd('','Quero uma corrida 3D.',{genre:'racing',dimension:'3d',engineMode:'snes2d'}),/apenas para Plataforma ou RPG/);
 assert.throws(()=>Parser.parseGdd('','Quero um jogo de simulação.',{genre:'simulation',dimension:'2d',engineMode:'snes2d'}),/apenas para Plataforma ou RPG/);
 const c=Parser.parseGdd(sample,'',{genre:'platform',dimension:'2d',engineMode:'snes2d'});
 c.snes2d.chunkCols=60;assert.ok(Caps.check(c).some(x=>/SNES 2D/.test(x)));
});
test('GF-SNES-01: chunks, camadas e contrato de TileMap real',()=>{
 const w=World({genre:'platform',snes2d:{theme:'forest'}});
 assert.equal(w.info().chunks,4);assert.equal(w.info().width,2048);
 assert.deepEqual(w.LAYERS,['background','ground','decoration','foreground','collision']);
 assert.equal(w.tileAt('collision',0,224),1);
 assert.equal(w.tileAt('ground',0,224),2);
 assert.equal(w.tileAt('collision',0,200),0);
 const before=w.autotileMask(0,224);
 assert.equal(before&2,2);assert.equal(before&4,4);
 assert.equal(w.setTile('collision',0,224,0),true);
 assert.equal(w.tileAt('collision',0,224),0);
 assert.equal(w.setTile('collision',0,224,0),false);
 assert.equal(w.setTile('collision',-10,100,1),false);
 assert.equal(w.setTile('not-a-layer',0,0,1),false);
 w.build(1);assert.equal(w.tileAt('collision',0,224),1,'rebuild restaura mapa da fase');
 assert.equal(w.visibleChunks({x:0,y:0,viewW:512,viewH:288}).length,2);
});
test('GF-SNES-01: colisão AABB impõe paredes, resolve eixos e não atravessa o mapa',()=>{
 const w=World({genre:'platform',snes2d:{theme:'ruins'}});
 const p={x:28,y:200,w:13,h:16};
 const hit=w.move(p,0,90);
 assert.equal(hit.hitY,true);
 assert.ok(p.y<=208.01);
 assert.equal(w.blocked(-1,200,12,16),true);
 assert.equal(w.blocked(p.x,p.y,p.w,p.h),false);
 const q={x:45,y:197,w:13,h:16};
 w.move(q,900,0);assert.ok(q.x<=2048-q.w);
});
test('GF-SNES-01: RPG superior usa 6 chunks, walls e câmera seguindo player',()=>{
 const w=World({genre:'rpg',snes2d:{theme:'desert'}});
 assert.equal(w.info().chunks,6);assert.equal(w.info().width,1536);
 assert.equal(w.info().height,576);
 assert.equal(w.solid(0,0),true);assert.equal(w.solid(32,32),false);
 const p={x:62,y:62,w:12,h:14},from=p.x;
 const outcome=w.move(p,50,50);assert.equal(outcome.hitX,false);
 assert.ok(p.x>from);
 const c=w.createCamera();w.updateCamera(c,{x:1000,y:350,w:12,h:14},.5);
 assert.ok(c.x>0);assert.ok(c.y>0);
 assert.ok(w.visibleChunks(c).length>=1);
 assert.equal(w.autotileMask(0,0,'nonsense'),0);
});
test('GF-SNES-01: projeto SNES gera HTML offline, fontes embutidas e contrato explícito',()=>{
 for(const genre of ['platform','rpg']){
  const spec=Parser.parseGdd(sample,'',{genre,dimension:'2d',engineMode:'snes2d'});
  const files=Generator.generate(spec,sample);
  validateFiles(files,'2d',genre);
  assert.match(files['game.js'],/const GameForgeSNES2D =/);
  assert.match(files['game.js'],/function gameForgeSNES2DBoot/);
  assert.match(files['game.js'],/window\.__gameforgeTelemetry/);
  assert.match(files['SNES2D_CONTRATO.json'],/"engine": "snes2d"/);
  assert.match(files['SNES2D_LEIA.md'],/Não é um emulador de SNES/);
  assert.equal(Object.keys(files).some(x=>/\.sfc$/.test(x)),false);
  assert.doesNotThrow(()=>new vm.Script(files['game.js']));
  assert.ok(!files['index.html'].includes('https://cdn.'));
  assert.ok(!files['game.js'].includes('fetch('));
 }
});
test('GF-SNES-01: nenhum motor 2D anterior é substituído',()=>{
 for(const genre of ['platform','rpg']){
  const spec=Parser.parseGdd(sample,'',{genre,dimension:'2d',engineMode:'default'});
  const files=Generator.generate(spec,sample);
  assert.ok(!files['game.js'].includes('const GameForgeSNES2D ='));
  assert.ok(!('SNES2D_CONTRATO.json' in files));
  assert.ok(files['game.js'].includes(genre==='rpg'?'gameForgeExpanded2DBoot':'gameForgeBoot'));
 }
});

test('GF-SNES-01: Studio aceita documentos SNES 2D e preserva motor selecionado no backup',()=>{
 const Project=require('../js/project-backup.js');
 const spec=Parser.parseGdd(sample,'',{genre:'platform',dimension:'2d',engineMode:'snes2d'});
 const files=Generator.generate(spec,sample);
 assert.ok(Project.allowedFiles.includes('SNES2D_CONTRATO.json'));
 assert.ok(Project.allowedFiles.includes('SNES2D_LEIA.md'));
 const raw=Project.encode({name:'Bosque SNES',gdd:sample,instruction:'',files,
  selected:'SNES2D_CONTRATO.json',
  creationOptions:{engineMode:'snes2d',dimension:'2d',genre:'platform'}});
 const restored=Project.decode(raw);
 assert.equal(restored.creationOptions.engineMode,'snes2d');
 assert.equal(restored.selected,'SNES2D_CONTRATO.json');
 assert.equal(restored.files['SNES2D_LEIA.md'],files['SNES2D_LEIA.md']);
 assert.equal(restored.files['game.js'],files['game.js']);
});
