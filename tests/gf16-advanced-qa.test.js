'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const GF16=require('../js/advanced-scenario-qa');
const Evidence=require('../js/requirement-evidence');
const files={'game.js':'const GAME_SPEC={"genre":"arena"};','style.css':'body{margin:0}'};
const source={instruction:'Quero inimigos, chefes, missão com checkpoints e salvamento',
 gdd:'# Arena 2D\n- Chefe tem HP e inimigos patrulham\n- Missão progride por fases',files,
 spec:{genre:'arena',stages:['Fase 1','Fase 2'],features:{bosses:true}}};
function snap({stage=0,step=0,x=0,hp=12,saved=false,state='play',enemyId=7,errors=[]}={}){
 return {telemetry:{state,stage,missionStepIndex:step,
   enemies:1,enemySamples:[{id:enemyId,x,y:3,z:0}],bossHp:hp,bossAlive:hp>0,
   checkpointAvailable:saved,checkpointStage:saved?1:null},errors};
}
function simulation(data){
 const logs=[],events={removed:0,srcdoc:'',closed:0},frame={
  set srcdoc(value){events.srcdoc=value;},get srcdoc(){return events.srcdoc;},
  remove(){events.removed++;}
 };
 const io={send:async(a,v={})=>{
  logs.push([a,v]);
  if(a==='inspect')return data.shift()||snap();
  return {ready:true};
 },close(){events.closed++;}};
 return {logs,events,frame,io,frameFactory:()=>frame,transportFactory:()=>io};
}
const fullPlan=()=>GF16.plan(source);
test('GF16: plano declara quatro cenários e não inventa requisitos aprovados',()=>{
 const p=fullPlan();
 assert.equal(p.version,16);
 assert.deepEqual(p.scenarios.map(s=>s.id),['save','mission','enemy','boss']);
 assert.ok(p.scenarios.every(s=>s.selected));
 assert.ok(p.scenarios.every(s=>s.scope&&Array.isArray(s.requirementIds)));
 assert.match(p.notes.join(' '),/sem allow-same-origin/i);
});
test('GF16: missão só passa com mudança observada de progresso',()=>{
 assert.equal(GF16.decide('mission',[snap(),snap()]).result,'INCONCLUSIVE');
 const result=GF16.decide('mission',[snap(),snap({step:1})]);
 assert.equal(result.result,'PASS');
 assert.equal(result.details.missionStepAfter,1);
});
test('GF16: inimigos com ID estável e deslocamento; sem ID retorna inconclusivo',()=>{
 const real=GF16.decide('enemy',[snap({x:0}),snap({x:5})]);
 assert.equal(real.result,'PASS');
 assert.ok(real.details.maxDistance>=5);
 const fake=GF16.decide('enemy',[snap({enemyId:null,x:0}),snap({enemyId:null,x:5})]);
 assert.equal(fake.result,'INCONCLUSIVE');
 assert.equal(GF16.decide('enemy',[snap({x:0}),snap({x:0})]).result,'INCONCLUSIVE');
});
test('GF16: chefe não presente ou invulnerável é inconclusivo',()=>{
 assert.equal(GF16.decide('boss',[snap({hp:null}),snap({hp:null})]).result,'INCONCLUSIVE');
 assert.equal(GF16.decide('boss',[snap(),snap()]).result,'INCONCLUSIVE');
 assert.equal(GF16.decide('boss',[snap({hp:12}),snap({hp:10})]).result,'PASS');
});
test('GF16: sinal de checkpoint não certifica reinício',()=>{
 const unknown=GF16.decide('save',[snap(),snap()]);
 assert.equal(unknown.result,'INCONCLUSIVE');
 const observed=GF16.decide('save',[snap(),snap({saved:true})]);
 assert.equal(observed.result,'PASS');
 assert.match(observed.reason,/NÃO foi verificada/);
 assert.match(GF16.report({results:[{id:'save',result:'PASS',title:'Checkpoint',scope:'Sinal',reason:observed.reason,requirementIds:[]}]}),/não é verificação end-to-end/i);
});
test('GF16: runner executa somente na cópia e remove iframe',async()=>{
 const p=fullPlan();
 const fake=simulation([
  snap({x:0,hp:12}),snap({x:4,hp:12}),
  snap({x:5,hp:12,step:1,saved:true}),snap({x:7,hp:10,step:1,saved:true}),
  snap({x:7,hp:9,step:1,saved:true})
 ]);
 const result=await GF16.run({...source,html:'<!-- GameForge -->',plan:p,
  frameFactory:fake.frameFactory,transportFactory:fake.transportFactory,sleep:async()=>{}});
 assert.equal(result.kind,'ISOLATED_ADVANCED_QA_RESULT');
 assert.equal(result.isolated,true);
 assert.equal(result.results.length,4);
 assert.equal(result.counts.pass,4);
 assert.equal(fake.events.removed,1);
 assert.equal(fake.events.closed,1);
 assert.equal(fake.events.srcdoc,'<!-- GameForge -->');
 assert.ok(fake.logs.some(([a,v])=>a==='press'&&v.key==='ArrowRight'));
 assert.ok(fake.logs.some(([a,v])=>a==='release'&&v.key==='ArrowRight'));
 assert.ok(fake.logs.some(([a,v])=>a==='press'&&v.key===' '));
 assert.ok(fake.logs.some(([a,v])=>a==='release'&&v.key===' '));
 assert.ok(!fake.logs.some(([a])=>['reset','setState','evaluate','edit'].includes(a)));
});
test('GF16: plano alterado bloqueia execução antes de criar iframe',async()=>{
 const fake=simulation([]);
 await assert.rejects(()=>GF16.run({...source,instruction:'outra coisa',html:'<!-- GameForge -->',
  plan:fullPlan(),frameFactory:fake.frameFactory,transportFactory:fake.transportFactory}),/mudaram/);
 assert.equal(fake.events.removed,0);
 assert.equal(fake.logs.length,0);
});
test('GF16: cenário arbitrário não executa código',async()=>{
 const p=fullPlan();p.scenarios.push({id:'eval',selected:true});
 const fake=simulation([]);
 await assert.rejects(()=>GF16.run({...source,plan:p,html:'<!-- GameForge -->',
  frameFactory:fake.frameFactory,transportFactory:fake.transportFactory}),/Plano GF16 inválido/);
 assert.equal(fake.logs.length,0);
});
test('GF16: falha durante o comando ainda libera tecla e descarta iframe',async()=>{
 const fake=simulation([snap(),snap()]);
 fake.io.send=async(a,v={})=>{
  fake.logs.push([a,v]);
  if(a==='inspect')return snap();
  if(a==='press')throw Error('falha intencional');
  return {};
 };
 await assert.rejects(()=>GF16.run({...source,html:'<!-- GameForge -->',plan:fullPlan(),
  frameFactory:fake.frameFactory,transportFactory:fake.transportFactory,sleep:async()=>{}}),/falha intencional/);
 assert.ok(fake.logs.some(([a,v])=>a==='release'&&v.key==='ArrowRight'));
 assert.equal(fake.events.closed,1);
 assert.equal(fake.events.removed,1);
});
test('GF16: erros do iframe impedem promover observação positiva',async()=>{
 const p=fullPlan(),fake=simulation([
  snap({x:0,hp:12}),snap({x:4,hp:12}),
  snap({x:7,hp:8,step:1,saved:true,errors:['TypeError']}),
  snap({x:7,hp:7,step:1,saved:true})
 ]);
 const result=await GF16.run({...source,html:'<!-- GameForge -->',plan:p,
   frameFactory:fake.frameFactory,transportFactory:fake.transportFactory,sleep:async()=>{}});
 assert.equal(result.results.some(r=>r.result==='PASS'),false);
 assert.equal(result.counts.pass,0);
});
test('GF16: evidência só se associa ao mesmo código e ao requisito mapeado',()=>{
 const matrix=Evidence.extract(source),p=fullPlan();
 const row=matrix.requirements.find(x=>x.description.toLowerCase().includes('inimigos'));
 const result={version:16,kind:'ISOLATED_ADVANCED_QA_RESULT',isolated:true,
  codeFingerprint:p.codeFingerprint,requestFingerprint:p.requestFingerprint,
  completed:'hoje',results:[{id:'enemy',result:'PASS',scope:'Apenas movimento',reason:'Moveu',
   at:'hoje',requirementIds:[row.id]}]};
 const after=GF16.attach(matrix,result,source,files);
 assert.equal(after.requirements.find(x=>x.id===row.id).status,'OBSERVED_PARTIAL');
 assert.equal(after.requirements.filter(x=>x.status==='OBSERVED_PARTIAL').length,1);
 assert.equal(GF16.valid(result,{...source,instruction:'outro'},files),false);
 const changed=GF16.attach(matrix,result,{...source,instruction:'outro'},files);
 assert.equal(changed.requirements.some(x=>x.evidence.some(e=>e.source==='GF16_ISOLATED_QA')),false);
});
test('GF16: sandbox sem mesma origem e sem foco em prévia principal',()=>{
 const attrs={};
 const frame={style:{},setAttribute(name,value){attrs[name]=value;}};
 const doc={createElement(tag){assert.equal(tag,'iframe');return frame;}};
 const host={appendChild(f){assert.equal(f,frame);}};
 assert.equal(GF16.createFrame(doc,host),frame);
 assert.equal(attrs.sandbox,'allow-scripts');
 assert.equal(attrs.tabindex,'-1');
 assert.equal(attrs['aria-hidden'],'true');
 assert.equal(attrs.referrerpolicy,'no-referrer');
 assert.doesNotMatch(attrs.sandbox,/allow-same-origin/);
});
test('GF16: backup aceita relatório e resultado sem modificar arquivos do jogo',()=>{
 const Backup=require('../js/project-backup');
 const before={...files};
 const snap={name:'GF16',gdd:'# Arena',files:{...files,
  'RESULTADOS_AVANCADOS_GF16.json':'{"version":16}',
  'RELATORIO_AVANCADO_GF16.md':'# Observações'}};
 const restored=Backup.decode(Backup.encode(snap));
 assert.equal(restored.files['RESULTADOS_AVANCADOS_GF16.json'],'{"version":16}');
 assert.equal(restored.files['RELATORIO_AVANCADO_GF16.md'],'# Observações');
 assert.deepEqual(files,before);
});
test('GF16: código real produz IDs e métricas limitadas sem alterar regras',()=>{
 for(const moduleName of ['runtime-template','shooter-runtime','three-runtime']){
  const code=fs.readFileSync(path.join(__dirname,'..','js',moduleName+'.js'),'utf8');
  assert.match(code,/enemySamples:enemies\.slice\(0,8\)/);
  assert.match(code,/bossHp:/);
 }
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'..','js/app.js'),'utf8');
 assert.match(html,/id="gf16-run"/);
 assert.match(html,/js\/advanced-scenario-qa\.js/);
 assert.ok(html.indexOf('js/advanced-scenario-qa.js')<html.indexOf('js/app.js'));
 assert.match(app,/GameForgeAdvancedScenarioQA\.run/);
 assert.match(app,/GameForgeAdvancedScenarioQA\.attach/);
});
