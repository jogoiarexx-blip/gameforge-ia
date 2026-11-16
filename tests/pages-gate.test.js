'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {decide}=require('../tools/pages-gate.cjs');
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
