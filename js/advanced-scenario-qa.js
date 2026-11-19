/* GF-ARCH-16: observações avançadas apenas numa cópia DESCARTÁVEL do jogo.
 * Não há eval, execução de plugins, escrita no projeto ou sandbox de agentes.
 * PASS nunca equivale a "mecânica completa validada". */
(function(root){
'use strict';
const Evidence=root.GameForgeRequirementEvidence||(typeof require==='function'?require('./requirement-evidence'):null);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const defs={
 save:{label:'Checkpoint e sinalização de salvamento',pattern:/salv|checkpoint|retom|continu|carreg|save/i,scope:'Somente mudanças declaradas na telemetria; não testa restauração após fechar o jogo'},
 mission:{label:'Progressão de missão',pattern:/miss|objetiv|fase|progres|etapa|campanh|quest|level/i,scope:'Somente mudança de fase, etapa ou missão durante um roteiro curto'},
 enemy:{label:'Atividade dos inimigos',pattern:/inimig|monstr|advers|hostil|guard|npc|enemy/i,scope:'Somente alterações observadas na posição de amostras de inimigos'},
 boss:{label:'Presença e dano do chefe',pattern:/chefe|boss|guardiao/i,scope:'Somente redução observada de HP do chefe após uma ação de disparo'}
};
const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function request(input){return {instruction:input?.instruction||'',gdd:input?.gdd||'',spec:input?.spec||null};}

function revision(files={}){
 const include=['game.js','style.css','engine-3d.js','ASSET_LIBRARY.json','ASSET_CENARIO.json','ASSET_CENARIO.b64'];
 return Evidence.checksum(include.map(name=>name+'\0'+String(files[name]||'')).join('\0'));
}
function requestRevision(src={}){
 const spec=src.spec||{};
 const mechanics={genre:spec.genre||'',dimension:spec.dimension||'',stages:spec.stages||[],
  bosses:spec.features?.bosses??null,persistence:spec.simulation?.persistence||null,
  missions:spec.urbanMissions||null};
 return Evidence.checksum(Evidence.requestFingerprint(src)+'\0'+JSON.stringify(mechanics));
}

function plan(input={}){
 const src=request(input),matrix=Evidence.extract({...src,files:input.files||{}});
 const genre=String(src.spec?.genre||''),featureBoss=src.spec?.features?.bosses===true;
 const configuredSave=src.spec?.simulation?.persistence?.enabled===true;
 const configuredMission=Array.isArray(src.spec?.stages)&&src.spec.stages.length>1||
  (Array.isArray(src.spec?.urbanMissions)&&src.spec.urbanMissions.length>0);
 const autoEnemies=['arena','fps','shooter','rpg','urban-action'].includes(genre);
 const options=Object.entries(defs).map(([id,cfg])=>{
  const matches=matrix.requirements.filter(r=>r.status!=='UNSUPPORTED'&&cfg.pattern.test(normalize(r.description))).map(r=>r.id);
  const selected=matches.length>0||
   (id==='save'&&configuredSave)||
   (id==='mission'&&configuredMission)||
   (id==='enemy'&&autoEnemies)||
   (id==='boss'&&featureBoss);
  return {id,title:cfg.label,scope:cfg.scope,selected,requirementIds:matches};
 });
 return {version:16,kind:'DISPOSABLE_PREVIEW_QA_PLAN',codeFingerprint:revision(input.files||{}),
  requestFingerprint:requestRevision(src),scenarios:options,notes:[
   'A prévia descartável usa iframe com sandbox allow-scripts, sem allow-same-origin.',
   'Mesmo resultado PASS representa somente observação parcial.',
   'Sem origem persistente, salvamento e retomada reais não são comprovados.'
  ]};
}
const metric=snapshot=>{
 const t=snapshot?.telemetry||{};
 const numeric=x=>Number.isFinite(x)?x:null;
 const sam=Array.isArray(t.enemySamples)?t.enemySamples.slice(0,8).map((x,i)=>({
  id:x?.id==null?'index:'+i:String(x.id).slice(0,32),
  x:numeric(x?.x),y:numeric(x?.y),z:numeric(x?.z)
 })).filter(x=>x.x!==null):[];
 return {
  stage:numeric(t.stage),missionStepIndex:numeric(t.missionStepIndex),
  sideQuestStepIndex:numeric(t.sideQuestStepIndex),
  missionComplete:typeof t.mission?.complete==='boolean'?t.mission.complete:null,
  state:String(t.state||'unknown').slice(0,32),enemies:numeric(t.enemies),
  enemySamples:sam,bossHp:numeric(t.bossHp),bossAlive:typeof t.bossAlive==='boolean'?t.bossAlive:null,
  checkpointAvailable:typeof t.checkpointAvailable==='boolean'?t.checkpointAvailable:null,
  checkpointStage:numeric(t.checkpointStage),
  persistenceAvailable:typeof t.persistence?.available==='boolean'?t.persistence.available:null,
  persistenceEnabled:typeof t.persistence?.enabled==='boolean'?t.persistence.enabled:null,
  saveStatus:typeof t.saveStatus==='string'?t.saveStatus.slice(0,60):
   typeof t.persistence?.status==='string'?t.persistence.status.slice(0,60):null,
  errors:Array.isArray(snapshot?.errors)?snapshot.errors.slice(0,4).map(x=>String(x).slice(0,120)):[]
 };
};
function observation(id,result,reason,details={}){
 return {id,result,reason:String(reason).slice(0,240),details};
}
function decide(id,observations){
 if(!Object.hasOwn(defs,id))throw Error('Roteiro fora da lista GF16: '+id);
 const rows=(Array.isArray(observations)?observations:[]).map(metric);
 if(rows.length<2)return observation(id,'INCONCLUSIVE','Amostras insuficientes para analisar mudança de estado.');
 const first=rows[0],last=rows[rows.length-1];
 if(id==='save'){
  const availability=rows.map(x=>x.checkpointAvailable??x.persistenceAvailable);
  const change=availability[0]===false&&availability.some(v=>v===true);
  const stageChanged=first.checkpointStage!==null&&last.checkpointStage!==null&&
    last.checkpointStage>first.checkpointStage;
  if(change||stageChanged)return observation(id,'PASS',
    'Sinal de checkpoint/salvamento mudou durante a prévia; restauração após reinício NÃO foi verificada.',
    {availableBefore:availability[0],availableAfter:availability[availability.length-1],
     checkpointStageBefore:first.checkpointStage,checkpointStageAfter:last.checkpointStage});
  return observation(id,'INCONCLUSIVE',
   'Nenhuma transição de checkpoint observada. O iframe isolado não permite validar gravação e restauração reais.',
   {declaredSaveStatus:last.saveStatus,storageLikelyRestricted:true});
 }
 if(id==='mission'){
  const changes=rows.some(x=>
   (first.stage!==null&&x.stage!==null&&x.stage>first.stage)||
   (first.missionStepIndex!==null&&x.missionStepIndex!==null&&x.missionStepIndex>first.missionStepIndex)||
   (first.sideQuestStepIndex!==null&&x.sideQuestStepIndex!==null&&x.sideQuestStepIndex>first.sideQuestStepIndex)||
   (first.missionComplete===false&&x.missionComplete===true));
  if(changes)return observation(id,'PASS','Mudança de etapa/fase ou conclusão observada.',
   {stageBefore:first.stage,stageAfter:last.stage,missionStepBefore:first.missionStepIndex,
    missionStepAfter:last.missionStepIndex});
  return observation(id,'INCONCLUSIVE','Nenhuma transição de missão no roteiro curto; não prova falha.',
   {stage:first.stage,missionStep:first.missionStepIndex});
 }
 if(id==='enemy'){
  const origin=rows.find(x=>x.enemySamples.length>0);
  if(!origin)return observation(id,'INCONCLUSIVE','Motor não forneceu amostras de posição de inimigos.');
  const original=new Map(origin.enemySamples.filter(x=>!x.id.startsWith('index:')).map(x=>[x.id,x]));
  if(!original.size)return observation(id,'INCONCLUSIVE','Inimigos sem IDs estáveis; movimento individual não pode ser confirmado.',
   {enemiesObserved:origin.enemies});
  let maximum=0,matches=0;
  for(const r of rows){
   for(const e of r.enemySamples){
    const p=original.get(e.id);
    if(!p||e.x===null)continue;matches++;
    const d=Math.hypot(e.x-p.x,(e.y??0)-(p.y??0),(e.z??0)-(p.z??0));
    maximum=Math.max(maximum,d);
   }
  }
  if(maximum>0.1)return observation(id,'PASS','Inimigo identificado mudou de posição durante o roteiro.',
   {maxDistance:Math.round(maximum*100)/100,matchedSamples:matches});
  return observation(id,'INCONCLUSIVE','Nenhum deslocamento identificado; o comportamento pode ser intencional ou exigir combate.',
   {maxDistance:maximum,matchedSamples:matches});
 }
 if(id==='boss'){
  const hp=rows.map(x=>x.bossHp).filter(Number.isFinite);
  if(hp.length>=2&&hp.some(v=>v<hp[0]-0.01))
   return observation(id,'PASS','HP do chefe diminuiu durante a ação permitida.',
     {bossHpFirst:hp[0],bossHpMinimum:Math.min(...hp)});
  return observation(id,'INCONCLUSIVE',
   hp.length?'HP do chefe permaneceu igual; o tiro pode não ter acertado ou o chefe estava invulnerável.':
    'Nenhum chefe com HP instrumentado apareceu no roteiro.',
   {bossVisible:rows.some(x=>x.bossAlive===true),bossHpReadings:hp.length});
 }
}
function createFrame(doc,host){
 if(!doc||!host||typeof doc.createElement!=='function'||typeof host.appendChild!=='function')
  throw Error('Área de teste descartável indisponível.');
 const frame=doc.createElement('iframe');
 frame.setAttribute('sandbox','allow-scripts');
 frame.setAttribute('referrerpolicy','no-referrer');
 frame.setAttribute('aria-hidden','true');
 frame.setAttribute('tabindex','-1');
 frame.setAttribute('title','Teste GameForge descartável GF16');
 frame.style.cssText='position:fixed;left:-20000px;top:0;width:960px;height:600px;opacity:0;pointer-events:none;border:0;';
 host.appendChild(frame);
 return frame;
}
async function run(input={}){
 const src=request(input),p=input.plan||plan(input);
 if(p.version!==16||p.kind!=='DISPOSABLE_PREVIEW_QA_PLAN'||!Array.isArray(p.scenarios)||
    p.scenarios.some(x=>!Object.hasOwn(defs,x.id)))throw Error('Plano GF16 inválido.');
 if(p.codeFingerprint!==revision(input.files||{})||
    p.requestFingerprint!==requestRevision(src))
  throw Error('Código/GDD mudaram antes do teste descartável; refaça o plano.');
 if(typeof input.html!=='string'||!input.html.includes('gameforge-qa')&&
    !input.html.includes('GameForge'))throw Error('HTML instrumentado ausente.');
 const makeFrame=input.frameFactory||(()=>createFrame(root.document,root.document.body));
 const frame=makeFrame(),wait=input.sleep||sleep;
 const createTransport=input.transportFactory||((f)=>root.GameForgeVisualQA.transport(f));
 let channel=null;
 const observations=[],steps=[],at=new Date().toISOString();
 let keyHeld=null;
 const update=typeof input.onUpdate==='function'?input.onUpdate:()=>{};
 const send=(action,args={})=>channel.send(action,args);
 try{
  if(!frame)throw Error('Não foi possível abrir o iframe descartável.');
  frame.srcdoc=input.html;
  channel=createTransport(frame);
  let connected=false,lastErr;
  for(let i=0;i<12;i++){
   try{await send('ping');connected=true;break;}catch(err){lastErr=err;await wait(175);}
  }
  if(!connected)throw Error('Prévia descartável não respondeu ao QA: '+String(lastErr?.message||lastErr));
  let sample=await send('inspect');
  if(sample.telemetry?.state==='menu'){
   await send('start');await wait(220);sample=await send('inspect');
  }
  observations.push(sample);
  update('Amostrando inimigos e progresso na prévia independente...');
  await wait(1100);
  observations.push(await send('inspect'));
  // Roteiro limitadíssimo: nunca testa mudanças irreversíveis, nem scripts arbitrários.
  if(p.scenarios.some(s=>s.selected&&['enemy','mission','save'].includes(s.id))&&
     observations.at(-1)?.telemetry?.state==='play'){
   keyHeld='ArrowRight';
   await send('press',{key:keyHeld});await wait(600);
   await send('release',{key:keyHeld});keyHeld=null;await wait(150);
   observations.push(await send('inspect'));
  }
  if(p.scenarios.some(s=>s.selected&&s.id==='boss')&&
     observations.at(-1)?.telemetry?.state==='play'){
   keyHeld=' ';
   await send('press',{key:keyHeld});await wait(500);
   observations.push(await send('inspect'));
   await send('release',{key:keyHeld});keyHeld=null;await wait(150);
   observations.push(await send('inspect'));
  }
  const errors=observations.flatMap(x=>Array.isArray(x.errors)?x.errors:[]);
  for(const s of p.scenarios.filter(x=>x.selected)){
   update('Analisando: '+s.title);
   const item=decide(s.id,observations);
   if(errors.length&&item.result==='PASS'){
    item.result='INCONCLUSIVE';
    item.reason='Erros de execução na prévia impedem confirmar o cenário como observado.';
   }
   steps.push({...item,title:s.title,scope:s.scope,requirementIds:s.requirementIds,at:new Date().toISOString()});
  }
 }finally{
  if(keyHeld&&channel){try{await send('release',{key:keyHeld});}catch{}}
  if(channel)channel.close();
  if(frame&&typeof frame.remove==='function')frame.remove();
 }
 const counts={pass:steps.filter(s=>s.result==='PASS').length,
  inconclusive:steps.filter(s=>s.result==='INCONCLUSIVE').length,
  fail:steps.filter(s=>s.result==='FAIL').length};
 return {version:16,kind:'ISOLATED_ADVANCED_QA_RESULT',started:at,completed:new Date().toISOString(),
  codeFingerprint:p.codeFingerprint,requestFingerprint:p.requestFingerprint,
  isolated:true,originPolicy:'sandbox=allow-scripts (no allow-same-origin)',
  results:steps,counts,scope:'OBSERVED_PARTIAL_ONLY',
  note:'Nenhum teste de carregamento pós-reinício foi realizado; uma ausência de progresso no roteiro curto não prova defeito.'};
}
function valid(result,source,files){
 return result?.version===16&&result.kind==='ISOLATED_ADVANCED_QA_RESULT'&&result.isolated===true&&
  result.codeFingerprint===revision(files||{})&&
  result.requestFingerprint===requestRevision(source||{})&&Array.isArray(result.results);
}
function attach(matrix,result,source,files){
 if(!valid(result,source,files))return matrix;
 const requirements=(matrix.requirements||[]).map(old=>{
  const row={...old,evidence:[...(old.evidence||[])]};
  if(row.status==='UNSUPPORTED')return row;
  const relevant=result.results.filter(x=>x.requirementIds?.includes(row.id)&&x.result==='PASS');
  for(const test of relevant){
   row.evidence.push({source:'GF16_ISOLATED_QA',scenarioId:test.id,kind:'observation',
    text:test.reason,scope:test.scope,at:test.at});
  }
  if(relevant.length&&row.status!=='ISSUE_DETECTED'){
   row.status='OBSERVED_PARTIAL';row.note='Observação em prévia descartável; não prova todo o requisito.';
  }
  return row;
 });
 const summary={total:requirements.length,unverified:requirements.filter(r=>r.status==='UNVERIFIED').length,
  unsupported:requirements.filter(r=>r.status==='UNSUPPORTED').length,
  observedPartial:requirements.filter(r=>r.status==='OBSERVED_PARTIAL').length,
  issues:requirements.filter(r=>r.status==='ISSUE_DETECTED').length};
 return {...matrix,requirements,summary,lastAdvancedQa:{
  at:result.completed,isolated:true,tests:result.results.length,scope:'OBSERVED_PARTIAL_ONLY'}};
}
function report(suite){
 const rows=suite?.results||[];
 const lines=['# GF-ARCH-16 — QA avançado em prévia descartável','',
  'Isolamento: '+(suite?.originPolicy||'não comprovado'),
  'Revisão código: '+(suite?.codeFingerprint||'-'),
  'Revisão requisitos: '+(suite?.requestFingerprint||'-'),
  'Concluído em: '+(suite?.completed||'-'),
  'Cenários observados: '+rows.length,'',
  '**PASS significa apenas observação parcial; não é verificação end-to-end.**',''];
 for(const r of rows){
  lines.push('## '+r.id+' — '+r.result,'- '+r.title,
   '- Escopo: '+r.scope,'- Observação: '+r.reason,
   '- Medidas: '+JSON.stringify(r.details||{}),
   '- IDs de requisito: '+(r.requirementIds||[]).join(', '),'');
 }
 lines.push('## Limites','- Não há teletransporte, invencibilidade ou alteração forçada do estado do jogo.',
  '- Sem origem persistente no iframe, não é possível confirmar salvar → fechar → reabrir.',
  '- Eventos de missão/chefes podem não ocorrer em um roteiro curto; ausência gera INCONCLUSIVE.',
  '- A instrumentação de inimigos mede deslocamento, não inteligência, decisões ou dificuldade.','');
 return lines.join('\n');
}
root.GameForgeAdvancedScenarioQA={revision,requestRevision,plan,metric,decide,createFrame,run,valid,attach,report};
if(typeof module!=='undefined')module.exports=root.GameForgeAdvancedScenarioQA;
})(typeof globalThis!=='undefined'?globalThis:this);
