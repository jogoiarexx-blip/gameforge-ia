'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Flow=require('../js/studio-orchestrator');
const files={
 'game.js':'const GAME_SPEC = {"genre":"arena"}; /* baseline */',
 'style.css':'body{color:white}',
 'index.html':'<link href="./style.css" rel="stylesheet"><script src="./game.js"></script>'
};
test('GF-ARCH-13: distribui um pedido simples para programação e QA',()=>{
 const plan=Flow.plan({instruction:'Aumenta a vida dos inimigos e coloca um chefe no final',spec:{genre:'arena',dimension:'2d'},files});
 assert.equal(plan.mode,'PLAN_ONLY');
 assert.deepEqual(plan.targets,['game.js']);
 assert.ok(plan.agents.some(a=>a.id==='gameplay'&&a.status==='PLANNED'));
 assert.ok(plan.agents.some(a=>a.id==='quality'&&a.status==='PLANNED'));
 assert.ok(plan.agents.every(a=>a.execution==='NOT_RUN'));
 assert.ok(plan.checks.every(c=>c.status==='PENDING'));
 assert.ok(plan.impacted.includes('index.html'));
});
test('GF-ARCH-13: gráficos roteiam CSS sem modificar nada',()=>{
 const proposal=Flow.plan({instruction:'Melhore os gráficos, cores e animações',files});
 assert.ok(proposal.targets.includes('style.css'));
 assert.ok(proposal.agents.some(a=>a.id==='graphics'&&a.status==='PLANNED'));
 assert.equal(files['style.css'],'body{color:white}');
});
test('GF-ARCH-13: protege arquivo citado por uma negativa',()=>{
 const p=Flow.plan({instruction:'Melhore o menu mas não altere o style.css',files});
 assert.ok(p.protectedFiles.includes('style.css'));
 assert.ok(!p.targets.includes('style.css'));
 assert.ok(p.restrictions.some(r=>r.includes('style.css')));
 assert.throws(()=>Flow.stage({currentFiles:files,proposedFiles:{...files,'style.css':'body{}'},route:p}),/protegido/);
});
test('GF-ARCH-13: proposta precisa de aprovação explícita antes de qualquer mudança',()=>{
 const before={...files},route=Flow.plan({instruction:'Aumentar dificuldade',files});
 const proposed={...files,'game.js':files['game.js']+'\n// changed'};
 const c=Flow.stage({currentFiles:files,proposedFiles:proposed,route});
 assert.equal(files['game.js'],before['game.js']);
 assert.equal(c.approval,'REQUIRED');assert.equal(c.status,'STAGED');
 assert.deepEqual(c.filesTouched,['game.js']);
 assert.throws(()=>Flow.apply(files,c),/aprovação explícita/);
 assert.throws(()=>Flow.apply(files,c,{approved:false}),/aprovação explícita/);
 const accepted=Flow.apply(files,c,{approved:true});
 assert.equal(accepted['game.js'],proposed['game.js']);
 assert.equal(files['game.js'],before['game.js']);
});
test('GF-ARCH-13: arquivo alterado após proposta causa conflito sem gravar',()=>{
 const c=Flow.stage({currentFiles:files,proposedFiles:{...files,'game.js':'new'}});
 const newer={...files,'game.js':'update from another editor'};
 assert.throws(()=>Flow.apply(newer,c,{approved:true}),/Conflito/);
 assert.equal(newer['game.js'],'update from another editor');
});
test('GF-ARCH-13: mudança do conteúdo do candidato é rejeitada',()=>{
 const c=Flow.stage({currentFiles:files,proposedFiles:{...files,'game.js':'new'}});
 c.changes[0].next='malicious different text';
 assert.throws(()=>Flow.apply(files,c,{approved:true}),/modificada/);
});
test('GF-ARCH-13: proposta não pode incluir fontes inesperadas nem excluir arquivos',()=>{
 assert.throws(()=>Flow.stage({currentFiles:files,proposedFiles:{...files,'vendor/hack.js':'alert(1)'}}),/lista de edição/);
 const removed={...files};delete removed['game.js'];
 assert.throws(()=>Flow.stage({currentFiles:files,proposedFiles:removed}),/Exclusão automática/);
 assert.throws(()=>Flow.stage({currentFiles:files,proposedFiles:{...files,'../evil.js':'hey'}}),/inseguro/);
});
test('GF-ARCH-13: permite relatórios novos sem execução e preserva arquivos não editados',()=>{
 const c=Flow.stage({currentFiles:files,proposedFiles:{...files,'RELATORIO_EVOLUCAO.md':'# versão revista'}});
 const applied=Flow.apply(files,c,{approved:true});
 assert.equal(applied['RELATORIO_EVOLUCAO.md'],'# versão revista');
 assert.equal(applied['style.css'],files['style.css']);
 assert.equal(files['RELATORIO_EVOLUCAO.md'],undefined);
});
test('GF-ARCH-13: sem instrução nem arquivos não inventa mecânica pronta',()=>{
 const p=Flow.plan({});
 assert.ok(p.warnings.some(w=>/vazio/.test(w)));
 assert.deepEqual(p.targets,[]);
 assert.match(Flow.report(p),/não executadas/);
});
test('GF-ARCH-13: integração com motor incremental inclui orquestração',()=>{
 require('../js/studio-intelligence');
 const Development=require('../js/development-engine');
 const plan=Development.plan('mais inimigos',{genre:'arena',dimension:'2d',stages:['a']},files);
 assert.ok(plan.orchestration);
 assert.ok(plan.orchestration.agents.some(a=>a.id==='gameplay'&&a.status==='PLANNED'));
 assert.match(Development.report(plan),/Orquestração GF-ARCH-13/);
});
test('GF-ARCH-13: HTML carrega o módulo antes de desenvolvimento e só então app',()=>{
 const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
 const i=html.indexOf('js/studio-orchestrator.js'),d=html.indexOf('js/development-engine.js'),a=html.indexOf('js/app.js');
 assert.ok(i>0&&i<d&&d<a);
 for(const id of ['dev-candidate','dev-candidate-accept','dev-candidate-discard','dev-candidate-summary']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
});
