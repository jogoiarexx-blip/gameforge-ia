'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Trainer=require('../js/three-training.js');
const Parser=require('../js/parser.js');
const Backup=require('../js/project-backup.js');
const corpus=JSON.parse(fs.readFileSync(path.join(__dirname,'../training/threejs-multigenero-ptbr-v19.json'),'utf8'));
const seven=new Set(['arena','fps','rpg','shooter','racing','platform','urban-action']);
test('GF-TRAIN-19: conjunto PT-BR 3D rotulado e sem duplicatas',()=>{
 assert.equal(corpus.version,19);
 assert.equal(corpus.cases.length,50);
 assert.equal(new Set(corpus.cases.map(x=>x.command)).size,50);
 assert.deepEqual(new Set(corpus.cases.map(x=>x.genre)),seven);
 for(const row of corpus.cases){
  assert.ok(row.id&&row.command.length>=20);
  assert.equal(row.dimension,'3d');
  for(const value of Object.values(row.expect))assert.ok(['manual','parcial','pendente'].includes(value));
 }
});
test('GF-TRAIN-19: 50 briefs multigenero estao corretos, sem falsas promessas',()=>{
 const failures=[];let labels=0;
 for(const row of corpus.cases){
  const report=Trainer.inspect({genre:row.genre,dimension:'3d'},'',row.command);
  const found=Object.fromEntries(report.items.map(x=>[x.id,x.status]));
  for(const id of new Set([...Object.keys(found),...Object.keys(row.expect)])){
   labels++;
   if(found[id]!==row.expect[id])failures.push(row.id+' '+id+': '+found[id]+' != '+row.expect[id]+' | '+row.command);
  }
  assert.equal(report.counts.manual+report.counts.parcial+report.counts.pendente,report.items.length);
  for(const item of report.items){
   assert.equal(item.origin.document,'Comando');
   assert.equal(item.origin.line,1);
   assert.ok(item.contract.length>20&&item.test.includes('tests/'));
   assert.ok(item.action.length>25);
  }
 }
 assert.deepEqual(failures,[],labels+' rótulos; falhas:\n'+failures.join('\n'));
 assert.ok(labels>=55,'Corpus não exercita respostas compostas');
});
test('GF-TRAIN-19: comando recente cancela antigo requisito não implementado',()=>{
 const r=Trainer.inspect({genre:'arena',dimension:'3d'},
  '# Projeto de arena\nQuero checkpoint em cada fase\nImportar GLB animado com rig',
  'Agora, sem checkpoints.\nNão quero GLB animado com rig.');
 assert.equal(r.items.length,0);
 const changed=Trainer.inspect({genre:'fps',dimension:'3d'},
  '# FPS\nSem checkpoint.',
  'Agora quero checkpoint persistente em cada fase.');
 assert.deepEqual(changed.items.map(x=>x.id),['checkpoints']);
 assert.deepEqual(changed.items[0].origin,{document:'Comando',line:1,excerpt:'Agora quero checkpoint persistente em cada fase.'});
});
test('GF-TRAIN-19: registros mantêm origem e ordem das linhas, sem publicar informações pessoais',()=>{
 const report=Trainer.inspect({genre:'rpg',dimension:'3d'},
  '# RPG\nPreciso posicionar GLB no cenário\nQuero colisão com paredes',
  'Quero controles de toque no celular.');
 const byId=Object.fromEntries(report.items.map(x=>[x.id,x]));
 assert.equal(byId['scene-glb'].origin.line,2);
 assert.equal(byId['scene-glb'].origin.document,'GDD');
 assert.equal(byId['collision'].origin.line,3);
 assert.equal(byId['mobile-controls'].origin.document,'Comando');
 assert.equal(report.counts.manual,2);
 assert.equal(report.counts.parcial,1);
 assert.match(Trainer.report(report),/configuração manual/);
 assert.match(Trainer.report(report),/não altera pesos/i);
});
test('GF-TRAIN-19: não injeta configuração 3D em GDD 2D',()=>{
 const row=Trainer.inspect({genre:'rpg',dimension:'2d'},'','Colocar GLB no cenário.');
 assert.equal(row.items.length,0);
 const spec=Parser.parseGdd('','RPG 2D com inventário completo.',{genre:'rpg',dimension:'2d'});
 assert.equal(spec.threeTraining,undefined);
});
test('GF-TRAIN-19: parser real inclui diagnostico, generator o exporta e backup conserva',()=>{
 require('../js/runtime-template.js');
 require('../js/shooter-runtime.js');
 require('../js/world-rules.js');
 require('../js/software-renderer.js');
 require('../js/three-runtime.js');
 require('../js/shooter-3d-runtime.js');
 require('../js/strategy-rules.js');
 require('../js/expanded-2d-runtime.js');
 require('../js/advanced-td-rules.js');
 require('../js/advanced-td-runtime.js');
 require('../js/graphics-runtime.js');
 require('../js/graphics-design.js');
 require('../js/render-cache.js');
 require('../js/qa-bridge.js');
 require('../vendor/three-source.js');
 const Generator=require('../js/generator.js');
 const spec=Parser.parseGdd('# Arena 3D\n## Fase 1 — Campo\nColocar GLB no cenário da fase.',
  'Precisa de três caminhos alternativos e controles mobile.',{dimension:'3d',genre:'arena'});
 assert.equal(spec.threeTraining.version,19);
 assert.equal(spec.threeTraining.items.find(x=>x.id==='scene-glb').status,'manual');
 assert.equal(spec.threeTraining.items.find(x=>x.id==='alternate-paths').status,'pendente');
 assert.equal(spec.threeTraining.items.find(x=>x.id==='mobile-controls').status,'parcial');
 const files=Generator.generate(spec,'# Arena 3D\n## Fase 1 — Campo\nColocar GLB no cenário da fase.');
 const audit=JSON.parse(files['TREINAMENTO_3D_GF19.json']);
 assert.equal(audit.version,19);assert.equal(audit.engine,'arena-3d');
 assert.match(files['DIAGNOSTICO_3D_GF19.md'],/GF-TRAIN-19/);
 assert.doesNotThrow(()=>new vm.Script(files['game.js']));
 const restored=Backup.decode(Backup.encode({name:'Arena',gdd:'',instruction:'',files}));
 assert.equal(restored.files['TREINAMENTO_3D_GF19.json'],files['TREINAMENTO_3D_GF19.json']);
 assert.equal(restored.files['DIAGNOSTICO_3D_GF19.md'],files['DIAGNOSTICO_3D_GF19.md']);
});
