'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Scenarios=require('../js/scenario-qa');
const Evidence=require('../js/requirement-evidence');
const baseFiles={'game.js':'const GAME_SPEC = {"genre":"arena"};','style.css':'body{}'};
const source={instruction:'Melhore a movimentação do personagem; preciso salvar o jogo',gdd:'# Arena',spec:{genre:'arena',dimension:'2d'},files:baseFiles};
const snap=(x=0,frames=1,errors=[],extras={})=>({canvas:{width:800,height:600},telemetry:{frames,player:{x,y:0,z:0},state:'play',...extras},errors});
function fakeTransport(snapshots){
 const actions=[];let i=0,closed=false;
 return {actions,send:async(action,params)=>{
  actions.push({action,params});
  if(action==='inspect')return snapshots[Math.min(i++,snapshots.length-1)];
  return {ready:true};
 },close:()=>{closed=true;},get closed(){return closed;}};
}
test('GF15: plano seleciona apenas cenários tipados suportados e preserva requisito não testável',()=>{
 const p=Scenarios.plan(source);
 assert.equal(p.version,15);
 assert.equal(p.scenarios.find(x=>x.id==='movement').selected,true);
 assert.equal(p.scenarios.find(x=>x.id==='fire').selected,false);
 assert.ok(p.requirements.some(r=>r.category==='persistence'));
 assert.ok(p.scenarios.every(x=>x.expected==='OBSERVATION_ONLY'));
});
test('GF15: requisito de disparo ativa somente teste conhecido de espaço',()=>{
 const p=Scenarios.plan({...source,instruction:'Adicione disparos ao personagem'});
 assert.equal(p.scenarios.find(x=>x.id==='fire').selected,true);
 assert.equal(p.scenarios.find(x=>x.id==='movement').selected,false);
});
test('GF15: versão modificada bloqueia execução antes de enviar comandos',async()=>{
 const p=Scenarios.plan(source),io=fakeTransport([snap()]);
 await assert.rejects(()=>Scenarios.execute({...source,plan:p,files:{...baseFiles,'game.js':'novo'},transport:io}),/mudaram/);
 assert.deepEqual(io.actions,[]);
});
test('GF15: lista de cenários arbitrários é rejeitada',async()=>{
 const p=Scenarios.plan(source);p.scenarios.push({id:'execute-shell',selected:true});
 const io=fakeTransport([snap()]);
 await assert.rejects(()=>Scenarios.execute({...source,plan:p,transport:io}),/fora da lista/);
 assert.deepEqual(io.actions,[]);
});
test('GF15: canvas inexistente ou inválido nunca é aprovado',()=>{
 assert.equal(Scenarios.decide('canvas',snap(),{canvas:null}).result,'INCONCLUSIVE');
 assert.equal(Scenarios.decide('canvas',snap(),{canvas:{width:0,height:0}}).result,'FAIL');
 assert.equal(Scenarios.decide('canvas',snap(),snap()).result,'PASS');
});
test('GF15: telemetria ausente é inconclusiva, nunca resultado inventado',()=>{
 const no={canvas:{width:40,height:40},telemetry:null,errors:[]};
 for(const id of ['frames','movement','fire'])assert.equal(Scenarios.decide(id,no,no).result,'INCONCLUSIVE');
});
test('GF15: frames e deslocamento são medições tipadas',()=>{
 assert.equal(Scenarios.decide('frames',snap(0,4),snap(0,8)).result,'PASS');
 assert.equal(Scenarios.decide('frames',snap(0,4),snap(0,4)).result,'FAIL');
 const moved=Scenarios.decide('movement',snap(0),snap(0.3));
 assert.equal(moved.result,'PASS');
 assert.ok(moved.measures.distance>0);
 assert.equal(Scenarios.decide('movement',snap(0),snap(0)).result,'FAIL');
 assert.equal(Scenarios.decide('fire',snap(),snap(),{during:snap(0,1,[],{playerBullets:3})}).result,'PASS');
 assert.equal(Scenarios.decide('fire',snap(),snap(),{during:snap(0,1,[],{playerBullets:0})}).result,'FAIL');
});
test('GF15: erros de runtime prevalecem sobre canvas ativo',()=>{
 assert.equal(Scenarios.decide('runtime',snap(),snap(0,4,['Uncaught ReferenceError'])).result,'FAIL');
 assert.equal(Scenarios.decide('runtime',snap(),snap()).result,'PASS');
});
test('GF15: executa controle permitido, solta tecla e fecha canal',async()=>{
 const p=Scenarios.plan(source);
 const io=fakeTransport([snap(0,1),snap(0,1),snap(0,1),snap(0,10),snap(20,12)]);
 const result=await Scenarios.execute({...source,plan:p,transport:io,sleep:async()=>{}});
 assert.equal(result.kind,'TYPED_QA_RESULT');
 assert.ok(result.results.some(x=>x.id==='movement'&&x.result==='PASS'));
 assert.ok(result.results.some(x=>x.id==='frames'&&x.result==='PASS'));
 assert.ok(io.actions.some(x=>x.action==='press'&&x.params.key==='ArrowRight'));
 assert.ok(io.actions.some(x=>x.action==='release'&&x.params.key==='ArrowRight'));
 assert.ok(!io.actions.some(x=>x.action==='press'&&x.params.key===' '));
 assert.ok(io.closed);
 assert.match(Scenarios.report(result),/não comprova o requisito completo/i);
});
test('GF15: mesmo com erro durante controle, libera tecla',async()=>{
 const p=Scenarios.plan(source);
 let pressed=false,released=false,closed=false;
 const io={send:async(action)=>{
  if(action==='inspect')return snap(0,10);
  if(action==='press'){pressed=true;throw Error('Falha simulada');}
  if(action==='release'){released=true;}
  return {};
 },close:()=>{closed=true;}};
 const suite=await Scenarios.execute({...source,plan:p,transport:io,sleep:async()=>{}});
 assert.equal(pressed,true);assert.equal(released,true);assert.equal(closed,true);
 assert.equal(suite.results.find(x=>x.id==='movement').result,'ERROR');
});
test('GF15: associa evidência positiva apenas a requisito explicitamente mapeado',()=>{
 const matrix=Evidence.extract(source),p=Scenarios.plan(source);
 const row=matrix.requirements.find(r=>r.category==='controls');
 const suite={version:15,kind:'TYPED_QA_RESULT',codeFingerprint:p.codeFingerprint,requestFingerprint:p.requestFingerprint,
  completed:'2026-11-19',results:[{id:'movement',result:'PASS',reason:'Movimento medido',scope:'Só ArrowRight',
  at:'2026-11-19',requirementIds:[row.id]}]};
 const merged=Scenarios.attach(matrix,suite,source,baseFiles);
 assert.equal(merged.requirements.find(r=>r.id===row.id).status,'OBSERVED_PARTIAL');
 assert.ok(merged.requirements.find(r=>r.id===row.id).evidence.some(e=>e.source==='GF15_TYPED_SCENARIO'));
 assert.equal(merged.requirements.find(r=>r.category==='persistence').status,'UNVERIFIED');
 const changed=Scenarios.attach(matrix,suite,{...source,instruction:'outra melhoria'},baseFiles);
 assert.ok(!changed.requirements.some(r=>r.evidence?.some(e=>e.source==='GF15_TYPED_SCENARIO')));
});
test('GF15: falha gera alerta; pendência declarada não recebe aprovação',()=>{
 const withPending={...source,spec:{implementation:{pending:[{description:'Salvamento não suportado'}]}}};
 const m=Evidence.extract(withPending),p=Scenarios.plan(withPending);
 const row=m.requirements.find(r=>r.category==='controls');
 const suite={version:15,kind:'TYPED_QA_RESULT',codeFingerprint:p.codeFingerprint,requestFingerprint:p.requestFingerprint,
  completed:'hoje',results:[{id:'movement',result:'FAIL',reason:'Não moveu',scope:'ArrowRight',at:'hoje',requirementIds:[row.id]}]};
 const merged=Scenarios.attach(m,suite,withPending,baseFiles);
 assert.equal(merged.requirements.find(r=>r.id===row.id).status,'ISSUE_DETECTED');
 assert.ok(merged.requirements.some(r=>r.status==='UNSUPPORTED'));
});
test('GF15: backup permite ambos os relatórios sem dados secretos',()=>{
 const Backup=require('../js/project-backup');
 const input={name:'Teste',gdd:'# teste',files:{...baseFiles,
  'RESULTADOS_TESTES_GF15.json':'{"version":15}',
  'RELATORIO_TESTES_GF15.md':'# Evidências'}};
 const output=Backup.decode(Backup.encode(input));
 assert.equal(output.files['RESULTADOS_TESTES_GF15.json'],'{"version":15}');
 assert.equal(output.files['RELATORIO_TESTES_GF15.md'],'# Evidências');
});
test('GF15: painel e carregamento de scripts estão conectados ao Studio',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'..','js/app.js'),'utf8');
 const bridge=fs.readFileSync(path.join(__dirname,'..','js/qa-bridge.js'),'utf8');
 assert.match(html,/id="gf15-run"/);assert.match(html,/id="gf15-summary"/);
 assert.ok(html.indexOf('js/scenario-qa.js')>html.indexOf('js/requirement-evidence.js'));
 assert.ok(html.indexOf('js/scenario-qa.js')<html.indexOf('js/app.js'));
 assert.match(app,/runTypedQa/);assert.match(app,/GameForgeScenarioQA\.attach/);
 assert.match(bridge,/case 'inspect':result=inspect/);
});

test('GF15: restrição negativa não dispara ações proibidas no roteiro',()=>{
 const p=Scenarios.plan({...source,instruction:'Melhorar inimigos; não disparar tiros nem movimentar jogador'});
 assert.equal(p.scenarios.find(x=>x.id==='fire').selected,false);
 assert.equal(p.scenarios.find(x=>x.id==='movement').selected,false);
});
test('GF15: tela de menu ou derrota não produz falso erro de movimento',()=>{
 const menu=snap(0);menu.telemetry.state='menu';
 const defeat=snap(0);defeat.telemetry.state='defeat';
 assert.equal(Scenarios.decide('movement',menu,snap(0)).result,'INCONCLUSIVE');
 assert.equal(Scenarios.decide('fire',defeat,snap(),{during:snap(0,1,[],{playerBullets:0})}).result,'INCONCLUSIVE');
});
