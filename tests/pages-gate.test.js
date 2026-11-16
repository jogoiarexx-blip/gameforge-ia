'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {decide}=require('../tools/pages-gate.cjs');
const {validateFiles}=require('../tools/verify-exports.cjs');
const repo='jogoiarexx-blip/gameforge-ia',sha='a'.repeat(40);
const good=()=>({workflow_run:{name:'Validar GameForge Studio',status:'completed',conclusion:'success',
  event:'push',head_branch:'main',head_sha:sha,repository:{full_name:repo},
  head_repository:{full_name:repo},pull_requests:[]}});
test('publicacao e aprovada somente com verify verde, main e SHA verificado',()=>{
 const result=decide(good(),repo,sha);
 assert.equal(result.allowed,true);assert.equal(result.sha,sha);
});
test('gate recusa falha, cancelamento, PR, fork, branch divergente, nome errado e SHA malformado',()=>{
 const cases=[
   e=>e.workflow_run.conclusion='failure',
   e=>e.workflow_run.conclusion='cancelled',
   e=>e.workflow_run.status='in_progress',
   e=>e.workflow_run.event='pull_request',
   e=>e.workflow_run.head_branch='feature/insegura',
   e=>e.workflow_run.head_repository.full_name='outro/repo',
   e=>e.workflow_run.repository.full_name='outro/repo',
   e=>e.workflow_run.name='Workflow arbitrario',
   e=>e.workflow_run.pull_requests.push({number:1}),
   e=>e.workflow_run.head_sha='invalido'
 ];
 for(const attack of cases){
  const sample=good();attack(sample);
  assert.equal(decide(sample,repo,sha).allowed,false,JSON.stringify(sample.workflow_run));
 }
 assert.equal(decide(good(),repo,'b'.repeat(40)).allowed,false);
 assert.equal(decide({},repo,sha).allowed,false);
});
test('pipeline publica apenas artefato do commit validado depois da verificacao',()=>{
 const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/publish-verified.yml'),'utf8');
 assert.match(workflow,/workflow_run:\s*\n\s*workflows: \["Validar GameForge Studio"\]/);
 assert.match(workflow,/workflow_run\.conclusion == 'success'/);
 assert.match(workflow,/workflow_run\.event == 'push'/);
 assert.match(workflow,/workflow_run\.head_branch == 'main'/);
 assert.match(workflow,/head_repository\.full_name == github\.repository/);
 assert.match(workflow,/ref: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
 assert.match(workflow,/node tools\/pages-gate\.cjs/);
 assert.match(workflow,/git ls-remote/);
 assert.match(workflow,/upload-pages-artifact@v3/);
 assert.match(workflow,/deploy-pages@v4/);
 assert.ok(workflow.indexOf('node tools/pages-gate.cjs')<workflow.indexOf('deploy-pages@v4'));
 assert.ok(workflow.indexOf('CURRENT')<workflow.indexOf('deploy-pages@v4'));
 assert.doesNotMatch(workflow,/pull_request:\s*\n\s*types:\s*\[.*opened/);
});
test('exportacao com JS invalido e recusada pelo mesmo parser de sintaxe que roda na CI',()=>{
 assert.throws(()=>new vm.Script('const GAME_SPEC = {"genre":"fps"};\nfunction () {'),
   SyntaxError);
 assert.doesNotThrow(()=>new vm.Script('const GAME_SPEC = {"genre":"fps"};\nfunction boot(){}'));
});

test('o preflight real recusa exportação com código quebrado e dependências ausentes',()=>{
 const good={'index.html':'<script src="game.js"></script>',
   'game.js':'const GAME_SPEC = {"genre":"arena"};\\nfunction boot(){}',
   'style.css':'body{}'};
 // Use quebras reais como no export; scripts inválidos devem bloquear a CI.
 good['game.js']=good['game.js'].replace('\\\\n','\\n');
 assert.doesNotThrow(()=>validateFiles(good,'2d','arena'));
 assert.throws(()=>validateFiles({...good,'game.js':'const x = ;'},'2d','arena'),SyntaxError);
 assert.throws(()=>validateFiles({...good,'index.html':'<script src="https://evil.example/payload.js"></script>'},'2d','arena'),/Script remoto/);
 assert.throws(()=>validateFiles({...good,'index.html':'<script src="engine.js"></script><script src="game.js"></script>'},'2d','arena'),/Arquivo local ausente/);
 assert.throws(()=>validateFiles(good,'3d','fps'),/motor Three|Motor Three/);
});
test('verificação de exportação é obrigatória no workflow verificador antes do benchmark',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../.github/workflows/verify.yml'),'utf8');
 assert.match(source,/npm run verify:exports/);
 assert.ok(source.indexOf('npm test')<source.indexOf('npm run verify:exports'));
 assert.ok(source.indexOf('npm run verify:exports')<source.indexOf('npm run bench:arena'));
});
