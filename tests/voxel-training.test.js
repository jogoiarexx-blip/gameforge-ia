'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Trainer=require('../js/voxel-training.js');
const Parser=require('../js/parser.js');
const Backup=require('../js/project-backup.js');
const corpus=JSON.parse(fs.readFileSync(path.join(__dirname,'../training/prismal-voxel-ptbr-v22.json'),'utf8'));
test('GF-TRAIN-22: corpus rotulado usa referencia publica Prismal Voxel, sem duplicatas',()=>{
 assert.equal(corpus.version,22);
 assert.equal(corpus.cases.length,47);
 assert.equal(corpus.sourceRepo,'jogoiarexx-blip/Prismal-voxel');
 assert.equal(new Set(corpus.cases.map(x=>x.command)).size,corpus.cases.length);
 assert.ok(new Set(corpus.cases.map(x=>x.genre)).size>=6);
 for(const x of corpus.cases)assert.ok(x.command.length>25);
});
test('GF-TRAIN-22: 47 pedidos voxel e 110 rotulos aprovados sem atribuir motores inexistentes',()=>{
 const misses=[];let labels=0;
 for(const row of corpus.cases){
  const result=Trainer.inspect({genre:row.genre,dimension:'3d'},'',row.command);
  assert.equal(result.version,22);
  assert.equal(result.applicable,true,row.id);
  assert.equal(result.counts.prototipo+result.counts.parcial+result.counts.pendente,result.items.length);
  const found=Object.fromEntries(result.items.map(x=>[x.id,x.status]));
  for(const key of new Set([...Object.keys(row.expect),...Object.keys(found)])){
   labels++;if(found[key]!==row.expect[key])misses.push(row.id+' '+key+' expected '+row.expect[key]+' actual '+found[key]);
  }
  for(const item of result.items){
   assert.equal(item.origin.document,'Comando');
   assert.equal(item.origin.line,1);
   assert.ok(item.contract.length>25&&item.next.length>25);
  }
 }
 assert.equal(labels,110,'mudanca de corpus exige revisao do baseline');
 assert.deepEqual(misses,[]);
});
test('GF-TRAIN-22: negação recente remove requisito específico sem bloquear outros',()=>{
 const r=Trainer.inspect({genre:'rpg',dimension:'3d'},
  '# Voxel\nQuero P2P\nQuero crafting em bancada',
  'Sem multiplayer. Quero forno para fundir e bússola.');
 const ids=r.items.map(x=>x.id);
 assert.ok(!ids.includes('coop-p2p'));
 assert.ok(ids.includes('craft-stations'));
 assert.ok(ids.includes('waypoint'));
 const explicit=Trainer.inspect({},'','Minecraft sem crafting, quero minerar.');
 assert.ok(!explicit.items.some(x=>x.id==='craft-stations'));
 assert.ok(explicit.items.some(x=>x.id==='mining-building'));
 assert.equal(Trainer.inspect({},'','FPS 3D com loja e armas.').applicable,false);
 assert.equal(Trainer.inspect({},'','FPS 3D com loja e armas.').items.length,0);
});
test('GF-TRAIN-22: avisos distinguem prototipo de mecânica implementada',()=>{
 const p=Trainer.inspect({genre:'rpg'},'','Minecraft com P2P, mundos salvos e chunks.');
 const t=Trainer.report(p);
 assert.match(t,/sem motor voxel completo/i);
 assert.match(t,/P2P.*experimental/);
 assert.match(t,/pendente/);
 assert.match(t,/Prismal Voxel/);
 assert.equal(p.items.find(x=>x.id==='coop-p2p').status,'pendente');
});
test('GF-TRAIN-22: parser, arquivos exportados e backup do Studio guardam diagnostico voxel',()=>{
 for(const module of ['runtime-template','shooter-runtime','world-rules','software-renderer',
  'three-runtime','shooter-3d-runtime','strategy-rules','expanded-2d-runtime',
  'advanced-td-rules','advanced-td-runtime','graphics-runtime','graphics-design',
  'render-cache','qa-bridge'])require('../js/'+module+'.js');
 require('../vendor/three-source.js');
 const Generator=require('../js/generator.js');
 const gdd='# Mundo de blocos\n## Fase 1\nExplorar mundo voxel. Preciso de chunks, forno, bússola e autosave.';
 const spec=Parser.parseGdd(gdd,'Sem multiplayer. Quero construir casas.',{genre:'rpg',dimension:'3d'});
 assert.equal(spec.voxelTraining.version,22);
 assert.ok(spec.voxelTraining.items.some(x=>x.id==='chunk-stream'));
 assert.ok(spec.voxelTraining.items.some(x=>x.id==='craft-stations'));
 assert.ok(spec.voxelTraining.items.some(x=>x.id==='waypoint'));
 assert.ok(spec.voxelTraining.items.some(x=>x.id==='world-save'));
 assert.ok(!spec.voxelTraining.items.some(x=>x.id==='coop-p2p'));
 assert.ok(spec.limitations.some(s=>/sem motor voxel completo/i.test(s)));
 const files=Generator.generate(spec,gdd);
 assert.equal(JSON.parse(files['TREINAMENTO_VOXEL_GF22.json']).version,22);
 assert.match(files['DIAGNOSTICO_VOXEL_GF22.md'],/GF-TRAIN-22/);
 assert.match(files['DIAGNOSTICO_VOXEL_GF22.md'],/não foi criado um motor voxel completo/i);
 assert.doesNotThrow(()=>new vm.Script(files['game.js']));
 const backup=Backup.decode(Backup.encode({name:'Treino voxel',gdd,instruction:'',files}));
 assert.equal(backup.files['TREINAMENTO_VOXEL_GF22.json'],files['TREINAMENTO_VOXEL_GF22.json']);
 assert.equal(backup.files['DIAGNOSTICO_VOXEL_GF22.md'],files['DIAGNOSTICO_VOXEL_GF22.md']);
 const ordinary=Parser.parseGdd('','FPS 3D com inimigos e loja.',{genre:'fps',dimension:'3d'});
 assert.equal(ordinary.voxelTraining,undefined,'não adicionar peso aos projetos não voxel');
 const ordinaryFiles=Generator.generate(ordinary,'');
 assert.equal(ordinaryFiles['TREINAMENTO_VOXEL_GF22.json'],undefined);
});
test('GF-TRAIN-22: painel e scripts carregam antes do analisador Studio',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(html,/id="voxel-training-report"/);
 assert.ok(html.indexOf('./js/voxel-kit.js')<html.indexOf('./js/parser.js'));
 assert.ok(html.indexOf('./js/voxel-training.js')<html.indexOf('./js/parser.js'));
 assert.ok(html.indexOf('./js/voxel-training.js')<html.indexOf('./js/app.js'));
 assert.match(js,/GameForgeVoxelTraining\.report\(spec\.voxelTraining\)/);
});
