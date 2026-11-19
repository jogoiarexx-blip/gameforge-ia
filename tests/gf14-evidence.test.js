'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../js/code-provenance'),R=require('../js/requirement-evidence');
const files={'game.js':'const GAME_SPEC = {"genre":"arena"};','style.css':'body{color:white}'};
test('GF14: tokenizador ignora comentários, strings, modelos e rastreia linha',()=>{
 const src='/* function nope(){} */\nconst str="function fake(){}";\n'+
  'const literal = '+String.fromCharCode(96)+'function alsoFake(){}'+String.fromCharCode(96)+';\nfunction genuine(){return 1;}\n';
 const result=C.index({'js/example.js':src});
 assert.deepEqual(C.locationFor(result,'genuine').map(x=>x.line),[4]);
 for(const name of ['nope','fake','alsoFake'])assert.deepEqual(C.locationFor(result,name),[]);
 assert.equal(result.capabilities.parsesScopes,false);
});
test('GF14: conecta arquivos pelo símbolo declarado e indica evidência inferida',()=>{
 const model=C.index({
  'js/alpha.js':'root.GameForgeAlpha={}; function localFn(){}',
  'js/beta.js':'root.GameForgeAlpha.doThing(); localFn();',
 });
 assert.ok(model.definitions.some(x=>x.name==='GameForgeAlpha'&&x.line===1));
 assert.ok(model.links.some(x=>x.symbol==='GameForgeAlpha'&&x.from==='js/beta.js'&&x.to==='js/alpha.js'&&x.evidence==='INFERRED'));
 assert.match(C.report(model),/não resolve escopos/);
});
test('GF14: declaração ambígua em dois arquivos não cria relação falsa',()=>{
 const model=C.index({'a.js':'function duplicate(){}','b.js':'function duplicate(){}','c.js':'duplicate();'});
 assert.ok(!model.links.some(e=>e.symbol==='duplicate'));
});
test('GF14: origem por arquivo e linha é verificável, sem execução arbitrária',()=>{
 const model=C.index({'a.js':'// begin\nclass Client{}\nfunction run(){}'});
 assert.deepEqual(C.locationFor(model,'Client').map(x=>x.line),[2]);
 assert.deepEqual(C.locationFor(model,'run').map(x=>x.line),[3]);
 assert.equal(model.capabilities.executesCode,false);
});
test('GF14: requisitos declarados não viram aprovação automaticamente',()=>{
 const matrix=R.extract({instruction:'Melhore os controles; salve a partida; aumente a qualidade gráfica',files});
 assert.equal(matrix.summary.total,3);
 assert.ok(matrix.requirements.every(r=>r.status==='UNVERIFIED'));
 const assessed=R.evaluate(matrix,{files});
 assert.ok(assessed.requirements.every(r=>r.status==='UNVERIFIED'));
});
test('GF14: QA genérico mostra evidência parcial, não requisito aprovado',()=>{
 const m=R.extract({instruction:'Melhorar o controle do personagem; melhorar o salvamento',files});
 const a=R.evaluate(m,{files,qa:{at:'2026-11-19T13:00:00Z',scenario:'movimento',
  issues:[],passes:['Movimentação detectada: 40 unidades.','Nenhum erro JavaScript comunicado pelo jogo durante a inspeção.']}});
 const controls=a.requirements.find(r=>r.category==='controls');
 const save=a.requirements.find(r=>r.category==='persistence');
 assert.equal(controls.status,'OBSERVED_PARTIAL');
 assert.equal(controls.evidence[0].source,'GAMEFORGE_VISUAL_QA');
 assert.equal(save.status,'UNVERIFIED');
 assert.equal(a.summary.observedPartial,1);
});
test('GF14: alerta de execução tem prioridade sobre mensagem de sucesso',()=>{
 const m=R.extract({instruction:'Corrigir o movimento do personagem',files});
 const a=R.evaluate(m,{files,qa:{at:'test',scenario:'correção',passes:['Movimentação detectada: 20 unidades.'],
  issues:[{type:'movement',message:'O personagem quase não se moveu'}]}});
 assert.equal(a.requirements[0].status,'ISSUE_DETECTED');
 assert.equal(a.requirements[0].evidence[0].kind,'issue');
});
test('GF14: nova versão do jogo não reaproveita QA de código anterior',()=>{
 const m=R.extract({instruction:'Melhorar controle WASD',files});
 const changed={...files,'game.js':'alterado'};
 const a=R.evaluate(m,{files:changed,qa:{at:'test',passes:['Movimentação detectada: 25 unidades.'],issues:[]}});
 assert.equal(a.requirements[0].status,'UNVERIFIED');
 assert.equal(a.lastQa,null);
 assert.notEqual(a.projectFingerprint,m.projectFingerprint);
});
test('GF14: requisito pendente não pode ser marcado como executado por QA genérico',()=>{
 const m=R.extract({instruction:'Quero o sistema de crafting',files,spec:{implementation:{pending:[{description:'Crafting não suportado'}]}}});
 const result=R.evaluate(m,{files,qa:{at:'test',passes:['Nenhum erro JavaScript comunicado pelo jogo durante a inspeção.'],issues:[]}});
 assert.ok(result.requirements.some(r=>r.status==='UNSUPPORTED'));
 assert.ok(!result.requirements.some(r=>r.status==='VERIFIED'));
});
test('GF14: relatórios e matriz sobrevivem a backup portátil',()=>{
 const backup=require('../js/project-backup');
 const data={name:'GF14',gdd:'# teste',instruction:'melhore controle',files:{
  ...files,'MAPA_CODIGO_GF14.json':'{"version":14}',
  'MATRIZ_REQUISITOS_GF14.json':'{"version":14,"requirements":[]}',
  'RELATORIO_REQUISITOS_GF14.md':'# Relatório'
 }};
 const copy=backup.decode(backup.encode(data));
 for(const name of ['MAPA_CODIGO_GF14.json','MATRIZ_REQUISITOS_GF14.json','RELATORIO_REQUISITOS_GF14.md'])
  assert.equal(copy.files[name],data.files[name]);
});
test('GF14: interface e script mantêm ordem e controles reais',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const code=html.indexOf('js/code-provenance.js'),req=html.indexOf('js/requirement-evidence.js'),dev=html.indexOf('js/development-engine.js'),app=html.indexOf('js/app.js');
 assert.ok(code>0&&req>code&&dev>req&&app>dev);
 assert.match(html,/id="gf14-inspect"/);assert.match(html,/id="gf14-summary"/);
 const source=fs.readFileSync(path.join(__dirname,'..','js/app.js'),'utf8');
 assert.match(source,/refreshEvidence\(report\)/);
 assert.match(source,/refreshEvidence\(\)/);
});

test('GF14: manifesto de agentes não executa código nem concede escrita direta',()=>{
 const H=require('../js/agent-handoff');
 const pkg=H.create({instruction:'Melhorar os gráficos sem modificar style.css',
  files:{...files,'index.html':'<script src="./game.js"></script>'},
  spec:{genre:'arena',dimension:'2d'}});
 assert.equal(pkg.policy,'NO_EXECUTION');
 assert.ok(pkg.protectedFiles.includes('style.css'));
 assert.ok(pkg.tasks.every(x=>x.executable===false&&x.reviewRequired===true));
 assert.ok(pkg.tasks.every(x=>x.permissions.every(p=>['READ_MANIFEST','PROPOSE_PATCH'].includes(p))));
 assert.ok(pkg.tasks.every(x=>x.files.every(f=>f.path!=='style.css')));
});
test('GF14: manifesto e relatórios são preservados no backup',()=>{
 const H=require('../js/agent-handoff'),backup=require('../js/project-backup');
 const manifest=JSON.stringify(H.create({instruction:'Melhorar controles',files}),null,2);
 const snap={name:'Manifesto',gdd:'# Teste',files:{...files,'MANIFESTO_AGENTES_GF14.json':manifest}};
 const copy=backup.decode(backup.encode(snap));
 assert.equal(copy.files['MANIFESTO_AGENTES_GF14.json'],manifest);
});

test('GF14: alteração de instrução ou GDD invalida revisão dos requisitos',()=>{
 const old={instruction:'Melhore controles',gdd:'# Arena',files};
 const matrix=R.extract(old);
 assert.notEqual(matrix.requestFingerprint,R.requestFingerprint({...old,instruction:'Melhore o mapa'}));
 assert.notEqual(matrix.requestFingerprint,R.requestFingerprint({...old,gdd:'# FPS'}));
});
test('GF14: exportação verifica revisão antes de emitir arquivos',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','js/app.js'),'utf8');
 assert.match(source,/matrix\.requestFingerprint!==requestRev/);
 assert.match(source,/matrix\.projectFingerprint!==revision/);
 assert.match(source,/refreshEvidence\(\)/);
});
