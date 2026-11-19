'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const GF17=require('../js/save-resume-qa');
const Evidence=require('../js/requirement-evidence');
const files={'game.js':'const GAME_SPEC={"genre":"simulation"};','style.css':'body{}'};
const spec={genre:'simulation',title:'Fazenda QA',simulation:{persistence:{enabled:true}}};
const source={instruction:'Salve e continue a fazenda',gdd:'# Fazendinha',spec,files};
const html='<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="script-src \'unsafe-inline\'"></head><body>gameforge-qa</body></html>';
const key='gameforge-simulation-v1-deadbeef';
const before={money:20,earned:0,inventory:0,sales:0,slots:[null,null],story:null,complete:false};
const changed={...before,money:10,slots:[{age:0,cared:false},null]};
const saved={version:1,signature:'test',state:changed,selected:0};
function snapshot(state,other={}){
 return {telemetry:{state:'play',simulation:state,persistence:{available:false,enabled:true},...other}};
}
function mock(conditions={}){
 let stage=0,removed=0,closed=0,clicks=[],frames=[],seeded=[];
 const frameFactory=()=>{
  const frame={set srcdoc(html){seeded.push(html)},remove(){removed++}};
  frames.push(frame);return frame;
 };
 const transportFactory=()=>{
  stage++;const current=stage;
  return {send:async(action,params={})=>{
   if(action==='ping')return {ready:true};
   if(action==='inspect'){
    if(current===1)return snapshot(clicks.includes('simulation-action-start')?changed:before);
    return snapshot(conditions.mismatch?before:changed,{persistence:{available:true,enabled:true}});
   }
   if(action==='start')return {};
   if(action==='qa-click'){
    clicks.push(params.target);
    if(params.target==='simulation-action-start')return {clicked:!conditions.noMutation};
    if(params.target==='simulation-save')return {clicked:!conditions.noSave};
    if(params.target==='simulation-continue')return {clicked:!conditions.noContinue};
    return {clicked:false};
   }
   if(action==='qa-storage')return {virtual:true,entries:conditions.noStorage?{}:{[key]:JSON.stringify(saved)}};
   throw Error('Unexpected '+action);
  },close(){closed++;}};
 };
 return {frameFactory,transportFactory,get removed(){return removed;},get closed(){return closed;},clicks,frames,seeded};
}
test('GF17: só suporta simulação com salvamento explicitamente ativado',()=>{
 assert.equal(GF17.plan(source).applicable,true);
 assert.equal(GF17.plan({...source,spec:{genre:'rpg'}}).applicable,false);
 assert.equal(GF17.plan({...source,spec:{genre:'simulation',simulation:{persistence:{enabled:false}}}}).applicable,false);
});
test('GF17: só aceita chaves conhecidas e limites de memória no clone',()=>{
 const only=GF17.sanitize({[key]:'{"ok":true}',evil:'secreto',
  'gameforge-simulation-v1-cafebabe':'x'.repeat(32000)});
 assert.deepEqual(Object.keys(only),[key]);
});
test('GF17: injeção preserva CSP e não libera mesma origem',()=>{
 const made=GF17.inject(html,{[key]:'teste'});
 assert.match(made,/GF17_VIRTUAL_STORE/);
 assert.match(made,/Content-Security-Policy/);
 assert.match(made,/localStorage/);
 assert.doesNotMatch(made,/allow-same-origin/);
 assert.throws(()=>GF17.inject('<html>sem CSP</html>'),/CSP/);
});
test('GF17: armazenamento virtual funciona sem usar armazenamento real',()=>{
 const virtualWindow={};
 const func=new Function('window','seed','('+GF17.virtualStorageBoot.toString()+')(seed);');
 func(virtualWindow,{});
 const virtual=virtualWindow.localStorage;
 virtual.setItem(key,'salvo');
 assert.equal(virtual.getItem(key),'salvo');
 assert.equal(virtualWindow.__gameforgeQA17Storage.dump()[key],'salvo');
 assert.throws(()=>virtual.setItem('gameforge-studio-v03','secreto'),/não autorizado/);
});
test('GF17: salva, destrói o primeiro iframe, recria e compara estado',async()=>{
 const io=mock(),p=GF17.plan(source);
 const r=await GF17.run({...source,plan:p,html,sleep:async()=>{},
  frameFactory:io.frameFactory,transportFactory:io.transportFactory});
 assert.equal(r.status,'PASS');
 assert.equal(r.scenarios[0].observed.mutatedBeforeSave,true);
 assert.equal(r.scenarios[0].observed.stateEqual,true);
 assert.equal(io.frames.length,2);
 assert.equal(io.removed,2);
 assert.equal(io.closed,2);
 assert.ok(io.clicks.includes('simulation-action-start'));
 assert.ok(io.clicks.includes('simulation-save'));
 assert.ok(io.clicks.includes('simulation-continue'));
 assert.match(io.seeded[1],/deadbeef/);
});
test('GF17: sem mudança na partida não inventa aprovação',async()=>{
 const io=mock({noMutation:true});
 const r=await GF17.run({...source,html,frameFactory:io.frameFactory,transportFactory:io.transportFactory,sleep:async()=>{}});
 assert.equal(r.status,'INCONCLUSIVE');
 assert.equal(io.removed,2);
});
test('GF17: save desabilitado, storage ausente e continue desabilitado têm estado honesto',async()=>{
 for(const [config,expected] of [[{noSave:true},'INCONCLUSIVE'],[{noStorage:true},'INCONCLUSIVE'],[{noContinue:true},'FAIL']]){
  const io=mock(config);
  const r=await GF17.run({...source,html,frameFactory:io.frameFactory,transportFactory:io.transportFactory,sleep:async()=>{}});
  assert.equal(r.status,expected);
  assert.equal(io.frames.length,io.removed);
 }
});
test('GF17: resultado obsoleto bloqueado sem criar janelas ou acesso ao storage',async()=>{
 const io=mock();
 await assert.rejects(()=>GF17.run({...source,files:{...files,'game.js':'mudou'},html,
  plan:GF17.plan(source),frameFactory:io.frameFactory,transportFactory:io.transportFactory}),/obsoleto/);
 assert.equal(io.frames.length,0);
});
test('GF17: evidência positiva associada só aos requisitos corretos',async()=>{
 const io=mock();
 const suite=await GF17.run({...source,html,frameFactory:io.frameFactory,transportFactory:io.transportFactory,sleep:async()=>{}});
 const matrix=Evidence.extract(source);
 const merged=GF17.attach(matrix,suite,source,files);
 assert.equal(merged.requirements[0].status,'OBSERVED_PARTIAL');
 assert.ok(merged.requirements[0].evidence.some(e=>e.source==='GF17_VIRTUAL_SAVE_RESUME'));
 assert.equal(GF17.attach(matrix,suite,{...source,instruction:'outro'},files),matrix);
});
test('GF17: backups portáteis retêm dados e não incluem alterações indevidas no jogo',()=>{
 const Backup=require('../js/project-backup');
 const project={name:'GF17',gdd:'# Teste',files:{...files,
 'RESULTADOS_RESTAURACAO_GF17.json':'{"version":17}',
 'RELATORIO_RESTAURACAO_GF17.md':'# QA'}};
 const restored=Backup.decode(Backup.encode(project));
 assert.equal(restored.files['RESULTADOS_RESTAURACAO_GF17.json'],'{"version":17}');
 assert.equal(restored.files['RELATORIO_RESTAURACAO_GF17.md'],'# QA');
 assert.equal(restored.files['game.js'],files['game.js']);
});
test('GF17: interface, bridge e limites são conectados',()=>{
 const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 const html=read('index.html'),app=read('js/app.js'),bridge=read('js/qa-bridge.js');
 assert.match(html,/id="gf17-run"/);
 assert.ok(html.indexOf('js/save-resume-qa.js')<html.indexOf('js/app.js'));
 assert.match(app,/GameForgeSaveResumeQA\.run/);
 assert.match(app,/GameForgeSaveResumeQA\.attach/);
 assert.match(bridge,/case 'qa-storage'/);
 assert.match(bridge,/case 'qa-click'/);
});
