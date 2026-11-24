'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const manifest=require('../training/repository-study-v5.json'),queries=require('../training/repository-queries-v5.json');
const Lessons=require('../js/repository-lessons'),K=require('../js/repository-knowledge'),Parser=require('../js/parser');
test('estudo: 28 arquivos em 12 projetos, hashes e tipo de evidência rastreáveis',()=>{
 assert.equal(manifest.sources.length,28);assert.equal(new Set(manifest.sources.map(s=>s.repository)).size,12);
 assert.equal(Lessons.entries.length,23);assert.equal(new Set(K.entries.map(e=>e.id)).size,K.entries.length);
 for(const lesson of Lessons.entries){
  const source=manifest.sources.find(s=>s.repository===lesson.repository&&s.path===lesson.path);
  assert.ok(source,lesson.id);assert.equal(lesson.sourceBlob,source.blob);assert.match(source.blob,/^[a-f0-9]{40}$/);
  assert.ok(lesson.guidance&&lesson.verify&&lesson.licenseStatus);
  for(const related of lesson.relatedSources)assert.ok(manifest.sources.some(s=>s.repository===lesson.repository&&s.path===related.path&&s.blob===related.blob));
 }
 for(const id of ['nidara-design-study','arkhos-design-study'])assert.equal(Lessons.entries.find(e=>e.id===id).evidenceType,'document');
});
test('estudo: 40 pedidos recuperam a técnica relevante entre as oito primeiras',()=>{
 assert.equal(queries.cases.length,40);const failures=[];
 for(const c of queries.cases)if(!K.rank(c.instruction,8).some(r=>r.id===c.expectedReference))failures.push({query:c.instruction,expected:c.expectedReference,found:K.rank(c.instruction,8).map(x=>x.id)});
 assert.deepEqual(failures,[]);
});
test('estudo: aprender uma técnica não a transforma em mecânica pronta ou muda o gênero',()=>{
 const s=Parser.parseGdd('','Quero RPG 3D com crafting e inventário, seguindo técnicas do Sucata Zero.');
 assert.equal(s.genre,'rpg');assert.ok(s.implementation.pending.some(x=>x.id==='craft'));
 assert.ok(s.learningPlan.references.length>0);
 assert.ok(s.learningPlan.references.every(r=>r.status==='reference'));
 assert.match(Parser.creationInstruction(s,'Aprimorar a oficina'),/FONTES E TÉCNICAS/);
 const files=(require('../js/runtime-template'),require('../js/world-rules'),require('../js/software-renderer'),require('../js/three-runtime'),require('../vendor/three-source'),require('../js/generator')).generate(s,'');
 const B=require('../js/project-backup'),data=B.decode(B.encode({name:'Estudo',gdd:'',files}));
 assert.equal(data.files['PLANO_APRENDIZADO.json'],files['PLANO_APRENDIZADO.json']);
 assert.match(files['FONTES_ESTUDADAS.md'],/não comprova execução/);
});
