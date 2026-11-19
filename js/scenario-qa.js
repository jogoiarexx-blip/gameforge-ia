/* GF-ARCH-15: roteiros de QA tipados, limitados a ações conhecidas.
 * Não avalia código arbitrário, não executa plugins nem valida requisitos por inferência.
 * É um teste da prévia jogável, não prova da implementação completa. */
(function(root){
'use strict';
const Evidence=root.GameForgeRequirementEvidence||(typeof require==='function'?require('./requirement-evidence'):null);
const clean=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const SCENARIOS=Object.freeze({
 canvas:{name:'Canvas visível e dimensionado',category:'graphics',scope:'Apenas existência e dimensões do canvas'},
 runtime:{name:'Erros JavaScript observados',category:'runtime',scope:'Somente erros relatados na prévia durante o roteiro'},
 frames:{name:'Avanço do loop de renderização',category:'performance',scope:'Somente progresso dos frames, sem medir FPS'},
 movement:{name:'Movimento horizontal pelo teclado',category:'controls',scope:'Somente deslocamento após ArrowRight, sem testar animações, câmera nem outros botões'},
 fire:{name:'Disparo ao pressionar espaço',category:'combat',scope:'Somente projéteis observados na telemetria durante a tecla espaço'}
});
const MOVEMENT=/\b(moviment\w*|caminh\w*|andar|anda|desloc\w*|setas?|wasd|w\s*a\s*s\s*d)\b/i;
const FIRE=/\b(atir\w*|dispar\w*|tiros?|proj[eé]teis?|shoot\w*)\b/i;
const PERF=/\b(fps|desempenh\w*|fluidez|renderiz\w*|frames?|otimiz\w*)\b/i;
const CANVAS=/\b(canvas|tela|renderiz\w*)\b/i;
const RUNTIME=/\b(erros?|trav\w*|crash\w*|bugs?|falhas?|congel\w*)\b/i;
function plan(input={}){
 const files=input.files||{},matrix=Evidence.extract({...input,files});
 const permitted=matrix.requirements.filter(r=>r.status!=='UNSUPPORTED');
 const rows=[
  {id:'canvas',matcher:CANVAS},
  {id:'runtime',matcher:RUNTIME},
  {id:'frames',matcher:PERF},
  {id:'movement',matcher:MOVEMENT},
  {id:'fire',matcher:FIRE}
 ].map(({id,matcher})=>{
  const matched=permitted.filter(r=>matcher.test(clean(r.description))).map(r=>r.id);
  return {id,name:SCENARIOS[id].name,category:SCENARIOS[id].category,scope:SCENARIOS[id].scope,
   requirementIds:matched,selected:id==='canvas'||id==='runtime'||id==='frames'||matched.length>0,
   expected:'OBSERVATION_ONLY'};
 });
 return {version:15,kind:'TYPED_QA_PLAN',codeFingerprint:Evidence.fingerprint(files),
  requestFingerprint:Evidence.requestFingerprint(input),requirements:matrix.requirements,
  scenarios:rows,notes:['Apenas os cenários definidos no motor podem ser executados.',
  'Testes marcados PASS comprovam somente o comportamento observado em seu roteiro.',
  'Salvamento, chefes, animações, missões e gráficos artísticos não são cobertos automaticamente.']};
}
function inspectSnapshot(value){
 if(!value||typeof value!=='object')return {telemetry:null,errors:[],canvas:null};
 return {telemetry:value.telemetry&&typeof value.telemetry==='object'?value.telemetry:null,
  errors:Array.isArray(value.errors)?value.errors.slice(0,8).map(x=>String(x).slice(0,180)):[],
  canvas:value.canvas||null};
}
function pos(snapshot){
 const p=snapshot?.telemetry?.player;
 if(!p||typeof p!=='object')return null;
 const x=Number(p.x),y=Number(p.y??0),z=Number(p.z??0);
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z))return null;
 return {x,y,z};
}
const pass=(id,result,reason,measures={})=>({id,result,reason:String(reason).slice(0,220),measures});
function decide(id,before,after,extra={}){
 const a=inspectSnapshot(before),b=inspectSnapshot(after);
 if(id==='canvas'){
  const w=Number(b.canvas?.width),h=Number(b.canvas?.height);
  if(!b.canvas)return pass(id,'INCONCLUSIVE','A prévia não retornou dados do canvas.');
  return Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0?
   pass(id,'PASS','Canvas retornou dimensões positivas.',{width:w,height:h}):
   pass(id,'FAIL','Canvas ausente ou com dimensões inválidas.',{width:w||0,height:h||0});
 }
 if(id==='runtime'){
  const errors=[...new Set([...a.errors,...b.errors])].slice(0,8);
  return errors.length?pass(id,'FAIL','Erros JavaScript registrados pelo QA.',{errors}):
   pass(id,'PASS','Nenhum erro registrado durante esta inspeção limitada.',{observedErrorCount:0});
 }
 if(id==='frames'){
  const start=a.telemetry?.frames,end=b.telemetry?.frames;
  if(!Number.isFinite(start)||!Number.isFinite(end))return pass(id,'INCONCLUSIVE','Sem contador de frames instrumentado.');
  return end>start?pass(id,'PASS','Contador de frames avançou.',{before:start,after:end,delta:end-start}):
   pass(id,'FAIL','Contador de frames não avançou.',{before:start,after:end,delta:end-start});
 }
 if(id==='movement'){
  const p1=pos(a),p2=pos(b);
  if(!p1||!p2)return pass(id,'INCONCLUSIVE','Posição do jogador não instrumentada.');
  const delta=Math.hypot(p2.x-p1.x,p2.y-p1.y,p2.z-p1.z);
  return delta>0.1?pass(id,'PASS','Deslocamento observado após ArrowRight.',{distance:Math.round(delta*100)/100,axis:'x/y/z',key:'ArrowRight'}):
   pass(id,'FAIL','Nenhum deslocamento mensurável após ArrowRight.',{distance:Math.round(delta*100)/100,key:'ArrowRight'});
 }
 if(id==='fire'){
  const n=extra?.during?.telemetry?.playerBullets;
  if(!Number.isFinite(n))return pass(id,'INCONCLUSIVE','Telemetria de projéteis indisponível.');
  return n>0?pass(id,'PASS','Projéteis observados durante espaço pressionado.',{count:n,key:' '}):
   pass(id,'FAIL','Nenhum projétil observado durante o comando.',{count:n,key:' '});
 }
 throw Error('Cenário não reconhecido: '+id);
}
function ensurePlan(input){
 if(!input||input.version!==15||input.kind!=='TYPED_QA_PLAN'||!Array.isArray(input.scenarios))
  throw Error('Plano de QA inválido.');
 if(input.scenarios.some(x=>!SCENARIOS[x.id]))throw Error('Cenário fora da lista permitida.');
}
async function execute(input={}){
 const p=input.plan;ensurePlan(p);
 if(p.codeFingerprint!==Evidence.fingerprint(input.files||{})||
    p.requestFingerprint!==Evidence.requestFingerprint(input))
  throw Error('O código ou os requisitos mudaram. Refaça o plano antes do QA.');
 const transport=input.transport||(root.GameForgeVisualQA?.transport&&root.GameForgeVisualQA.transport(input.frame));
 if(!transport||typeof transport.send!=='function'||typeof transport.close!=='function')
  throw Error('Canal de testes não disponível.');
 const wait=typeof input.sleep==='function'?input.sleep:sleep;
 const onUpdate=typeof input.onUpdate==='function'?input.onUpdate:()=>{};
 const chosen=p.scenarios.filter(s=>s.selected),results=[],started=new Date().toISOString();
 let held=null;
 const send=(action,params)=>transport.send(action,params||{});
 try{
  await send('ping');
  let current=inspectSnapshot(await send('inspect'));
  if(current.telemetry?.state==='menu'){
   await send('start');await wait(120);
   current=inspectSnapshot(await send('inspect'));
  }
  for(const s of chosen){
   onUpdate('GF15: '+s.name);
   const before=current;
   let after=before,extra={};
   try{
    if(s.id==='frames'){
     await wait(250);after=inspectSnapshot(await send('inspect'));
    }else if(s.id==='movement'||s.id==='fire'){
     const key=s.id==='movement'?'ArrowRight':' ';
     held=key;
     await send('press',{key});await wait(s.id==='movement'?650:260);
     if(s.id==='fire')extra.during=inspectSnapshot(await send('inspect'));
     await send('release',{key});held=null;
     await wait(80);
     after=inspectSnapshot(await send('inspect'));
    }else after=inspectSnapshot(await send('inspect'));
    results.push({...decide(s.id,before,after,extra),name:s.name,scope:s.scope,
     requirementIds:s.requirementIds,at:new Date().toISOString()});
    current=after;
   }catch(err){
    results.push({...pass(s.id,'ERROR','Falha ao executar cenário: '+String(err?.message||err)),
     name:s.name,scope:s.scope,requirementIds:s.requirementIds,at:new Date().toISOString()});
    try{current=inspectSnapshot(await send('inspect'));}catch{}
   }finally{
    if(held){try{await send('release',{key:held});}catch{} held=null;}
   }
  }
 }finally{
  if(held){try{await send('release',{key:held});}catch{}}
  transport.close();
 }
 const counts={pass:results.filter(x=>x.result==='PASS').length,
  fail:results.filter(x=>x.result==='FAIL').length,
  inconclusive:results.filter(x=>x.result==='INCONCLUSIVE').length,
  error:results.filter(x=>x.result==='ERROR').length};
 return {version:15,kind:'TYPED_QA_RESULT',started,completed:new Date().toISOString(),
  codeFingerprint:p.codeFingerprint,requestFingerprint:p.requestFingerprint,
  results,counts,coverage:'PARTIAL_OBSERVATION',note:'PASS certifica somente o cenário observado, nunca o requisito completo.'};
}
function validResult(suite,source,files){
 return !!suite&&suite.version===15&&suite.kind==='TYPED_QA_RESULT'&&
  suite.codeFingerprint===Evidence.fingerprint(files||{})&&
  suite.requestFingerprint===Evidence.requestFingerprint(source||{})&&
  Array.isArray(suite.results);
}
function attach(matrix,suite,source,files){
 if(!validResult(suite,source,files))return matrix;
 const rows=(matrix.requirements||[]).map(original=>{
  const r={...original,evidence:[...(original.evidence||[])]};
  if(r.status==='UNSUPPORTED')return r;
  const related=suite.results.filter(x=>Array.isArray(x.requirementIds)&&x.requirementIds.includes(r.id));
  const negative=related.find(x=>x.result==='FAIL'||x.result==='ERROR');
  const positive=related.find(x=>x.result==='PASS');
  const evidence=related.filter(x=>['PASS','FAIL','ERROR'].includes(x.result)).map(x=>({
   source:'GF15_TYPED_SCENARIO',scenarioId:x.id,kind:x.result==='PASS'?'observation':'issue',
   text:x.reason,scope:x.scope,at:x.at}));
  r.evidence.push(...evidence);
  if(negative){r.status='ISSUE_DETECTED';r.note='Problema observado em um teste direcionado: '+negative.scope;}
  else if(positive&&r.status!=='ISSUE_DETECTED'){
   r.status='OBSERVED_PARTIAL';r.note='Cenário direcionado observado: '+positive.scope;
  }
  return r;
 });
 const summary={total:rows.length,unverified:rows.filter(x=>x.status==='UNVERIFIED').length,
  unsupported:rows.filter(x=>x.status==='UNSUPPORTED').length,
  observedPartial:rows.filter(x=>x.status==='OBSERVED_PARTIAL').length,
  issues:rows.filter(x=>x.status==='ISSUE_DETECTED').length};
 return {...matrix,requirements:rows,summary,lastTypedQa:{at:suite.completed,coverage:'PARTIAL_OBSERVATION',tests:suite.results.length}};
}
function report(suite){
 const rows=suite?.results||[],out=['# GameForge — Testes direcionados GF-ARCH-15','',
  'Versão do código: '+(suite?.codeFingerprint||'?'),
  'Plano dos requisitos: '+(suite?.requestFingerprint||'?'),
  'Executado em: '+(suite?.completed||'?'),
  'Cenários executados: '+rows.length,
  '**PASS indica apenas a observação descrita. Não comprova o requisito completo.**',''];
 for(const r of rows)out.push('## '+r.id+' — '+r.result,
  '- '+r.name,'- Escopo: '+r.scope,'- Resultado: '+r.reason,
  '- Requisitos vinculados: '+(r.requirementIds.join(', ')||'verificação básica'),
  '- Dados: '+JSON.stringify(r.measures||{}),'');
 out.push('Testes não implementados automaticamente: salvamento real, IA dos inimigos, chefes, progressão, qualidade artística, segurança de rede e desempenho FPS.');
 return out.join('\n')+'\n';
}
const api={SCENARIOS,plan,decide,execute,attach,validResult,report};
root.GameForgeScenarioQA=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
