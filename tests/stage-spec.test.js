'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const StageSpec=require('../js/stage-spec');
const Parser=require('../js/parser');
require('../js/runtime-template');
require('../js/shooter-runtime');
require('../js/world-rules');
require('../js/three-runtime');
require('../js/shooter-3d-runtime');
require('../js/software-renderer');
require('../js/strategy-rules');
require('../js/expanded-2d-runtime');
require('../js/advanced-td-rules');
require('../js/advanced-td-runtime');
require('../vendor/three-source');
const Generator=require('../js/generator');

test('GF-006: GDD cria tres fases 3D com layouts, colisoes e objetivos diferentes',()=>{
 const gdd=[
  '# Cerco ao Distrito','## Fase 1 — Pátio','Eliminar todos os inimigos','8 inimigos',
  '## Fase 2 — Armazém','Sobreviver 35 segundos','10 inimigos',
  '## Fase 3 — Avenida','Coletar 3 cristais'
 ].join('\n');
 const spec=Parser.parseGdd(gdd,'',{genre:'arena',dimension:'3d'});
 assert.equal(spec.stageSpecs.length,3);
 assert.deepEqual(spec.stageConfig.map(x=>x.layout),['courtyard','outpost','cross']);
 assert.deepEqual(spec.stageSpecs.map(x=>x.environment.layout),['courtyard','outpost','cross']);
 assert.deepEqual(spec.stageSpecs.map(x=>x.objective.kind),['eliminate','survive','collect']);
 assert.equal(spec.stageSpecs[1].objective.seconds,35);
 assert.equal(spec.stageSpecs[0].encounters.enemyCount,8);
 assert.equal(spec.stageSpecs[1].encounters.enemyCount,10);
 assert.equal(spec.stageSpecs[0].source[0].line,2);
 assert.ok(spec.stageSpecs.every(s=>s.objective.status==='implementado'));
 assert.ok(spec.stageSpecs.every(s=>s.scriptedEvents.length===0));
 const files=Generator.generate(spec,gdd);
 const stages=JSON.parse(files['FASES_EXECUTAVEIS.json']);
 assert.equal(stages.version,1);
 assert.equal(stages.stages[2].environment.layout,'cross');
 assert.match(files['PLANO_FASES.md'],/Fases executáveis/);
 const match=/const GAME_SPEC = (\{[^\n]*\});/.exec(files['game.js']);
 assert.ok(match);
 const exported=JSON.parse(match[1]);
 assert.deepEqual(exported.stageConfig,spec.stageConfig);
 assert.deepEqual(exported.stageSpecs,spec.stageSpecs);
 assert.doesNotThrow(()=>new vm.Script(files['game.js']));
});
test('GF-006: comando leigo para alterar somente a fase 2 não altera as demais',()=>{
 const gdd='# Aventura 3D\n## Fase 1 — Pátio\n## Fase 2 — Avenida\n## Fase 3 — Avenida';
 const spec=Parser.parseGdd(gdd,'Troca só a fase 2 para um armazém, não mexa nas outras.',{genre:'arena',dimension:'3d'});
 assert.deepEqual(spec.stageConfig.map(x=>x.layout),['courtyard','outpost','cross']);
 assert.equal(spec.stageSpecs[1].environment.layoutOrigin.document,'Comando');
 assert.equal(spec.stageSpecs[1].environment.layoutOrigin.line,1);
});
test('GF-006: pedidos não suportados não viram evento/diálogo ou geometria fictícia',()=>{
 const spec=Parser.parseGdd('','Crie um RPG 2D com 3 fases, pátio, polícia e diálogos.',{genre:'rpg',dimension:'2d'});
 assert.equal(spec.stageSpecs.length,3);
 assert.ok(spec.stageSpecs.every(s=>s.environment.layout===null));
 assert.ok(spec.stageSpecs.every(s=>s.objective.status==='pendente'));
 assert.ok(spec.stageSpecs.every(s=>s.scriptedEvents.length===0));
 assert.ok(!spec.implementation.applied.some(x=>x.id==='police'||x.id==='dialogue'));
});
test('GF-006: runtime utiliza os 3 layouts reais com superfícies e colisões',()=>{
 const source=fs.readFileSync(require.resolve('../js/three-runtime.js'),'utf8');
 assert.match(source,/layout==='courtyard'/);
 assert.match(source,/layout==='outpost'/);
 assert.match(source,/solids\.push\(\{x,z:-4,w:5,d:7\}\)/);
 assert.match(source,/layout:\['arena','fps','rpg'\]/);
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 assert.ok(html.indexOf('stage-spec.js')>0);
 assert.ok(html.indexOf('stage-spec.js')<html.indexOf('intent-compiler.js'));
 assert.equal(StageSpec.selectLayout([{normal:'um patio',document:'Comando',line:1}]).id,'courtyard');
});
