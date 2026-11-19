/* GF-ARCH-18 — contratos de salvamento 3D em CLONES de origem opaca.
 * Urbano: salva -> destrói -> continua em outro iframe. RPG/arena/FPS 3D:
 * verifica checkpoint APENAS quando uma transição real o produzir.
 * Sem eval, sem alterar o jogo ativo, sem aprovar o que não foi observado.
 */
(function(root){
'use strict';
const GF16=root.GameForgeAdvancedScenarioQA||(typeof require==='function'?require('./advanced-scenario-qa'):null);
const Evidence=root.GameForgeRequirementEvidence||(typeof require==='function'?require('./requirement-evidence'):null);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const URBAN=/^gameforge-urban-v1-[a-z0-9-]{1,54}(?::(?:backup|pending))?$/;
const MISSION=/^gameforge-urban-missions-v2-[a-z0-9-]{1,45}(?::(?:backup|pending))?$/;
const CAMPAIGN=/^gameforge-campaign-v1:(?:rpg|arena|fps):gf-[0-9a-f]{8}-[0-9a-f]{8}$/;
function permittedKey(key){return URBAN.test(String(key))||MISSION.test(String(key))||CAMPAIGN.test(String(key));}
function clean(entries={}){
 const out=Object.create(null);let size=0;
 if(!entries||typeof entries!=='object'||Array.isArray(entries))return {};
 for(const [k,v] of Object.entries(entries)){
  if(!permittedKey(k)||typeof v!=='string'||v.length>200000)continue;
  size+=v.length+k.length;
  if(size>220000||Object.keys(out).length>=5)break;
  out[k]=v;
 }
 return {...out};
}
function source(input={}){
 return {instruction:input.instruction||'',gdd:input.gdd||'',spec:input.spec||{}};
}
function plan(input={}){
 const s=source(input),spec=s.spec||{},genre=spec.genre,dimension=spec.dimension;
 let contract='UNSUPPORTED';
 if(dimension==='3d'&&genre==='urban-action')
  contract=Array.isArray(spec.urbanMissions)&&spec.urbanMissions.length?'URBAN_MISSIONS_V2':'URBAN_AUTOSAVE_V1';
 else if(dimension==='3d'&&['rpg','arena','fps'].includes(genre)&&
  /^gf-[0-9a-f]{8}-[0-9a-f]{8}$/.test(String(spec.projectId||''))&&
  !spec.combatEconomy?.enabled)contract='CAMPAIGN_CHECKPOINT_V1';
 const matrix=Evidence.extract({...s,files:input.files||{}});
 const matched=matrix.requirements.filter(r=>r.status!=='UNSUPPORTED'&&
  /salv|save|checkpoint|continu|retom|restaur|carreg|progres|missao|fase/i.test(
    String(r.description).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())).map(x=>x.id);
 return {version:18,kind:'3D_CONTRACT_QA_PLAN',contract,applicable:contract!=='UNSUPPORTED',
  codeFingerprint:GF16.revision(input.files||{}),
  requestFingerprint:GF16.requestRevision(s),requirementIds:matched,
  scope:contract==='URBAN_AUTOSAVE_V1'||contract==='URBAN_MISSIONS_V2'?
   'Mover jogador, confirmar registro salvo, destruir clone, restaurar em outro':
   contract==='CAMPAIGN_CHECKPOINT_V1'?
    'Somente checkpoint que tenha sido realmente produzido durante a prévia; sem transição de fase o resultado é INCONCLUSIVE':
    'Contrato de salvamento não disponível para este jogo'};
}
function boot(seed={}){
 const data=Object.create(null),audit=[];
 const allowed=k=>/^gameforge-urban-v1-[a-z0-9-]{1,54}(?::(?:backup|pending))?$/.test(String(k))||
  /^gameforge-urban-missions-v2-[a-z0-9-]{1,45}(?::(?:backup|pending))?$/.test(String(k))||
  /^gameforge-campaign-v1:(?:rpg|arena|fps):gf-[0-9a-f]{8}-[0-9a-f]{8}$/.test(String(k));
 for(const [k,v] of Object.entries(seed||{})){
  if(allowed(k)&&typeof v==='string'&&v.length<=200000)data[k]=v;
 }
 const store={
  getItem(k){return Object.hasOwn(data,String(k))?data[String(k)]:null;},
  setItem(k,value){
   const key=String(k),v=String(value),ok=allowed(key)&&v.length<=200000;
   if(audit.length<24)audit.push({op:'set',key:key.slice(0,95),size:v.length,accepted:ok});
   if(!ok)throw Error('GF18: chave ou valor recusado');
   data[key]=v;
  },
  removeItem(k){if(allowed(k))delete data[String(k)];},
  clear(){for(const key of Object.keys(data))delete data[key];},
  key(i){return Object.keys(data)[i]??null;},
  get length(){return Object.keys(data).length;}
 };
 Object.defineProperty(window,'localStorage',{configurable:true,value:store});
 Object.defineProperty(window,'__gameforgeQA18Storage',{configurable:false,value:Object.freeze({
  kind:'GF18_VIRTUAL_STORE',dump:()=>({...data}),stats:()=>audit.slice()})});
}
function inject(html,entries={}){
 const base=GF16.protectFocus(String(html||''));
 const csp=base.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/i);
 if(!csp||!base.includes('gameforge-qa'))throw Error('HTML QA e política CSP obrigatórios');
 const seed=JSON.stringify(clean(entries)).replace(/</g,'\\u003c');
 return base.replace(csp[0],csp[0]+'<script>('+boot.toString()+')('+seed+');</script>');
}
function numeric(x){return typeof x==='number'&&Number.isFinite(x)?x:null;}
function urbanState(t){
 if(!t||t.genre!=='urban-action')return null;
 return {x:numeric(t.player?.x),z:numeric(t.player?.z),health:numeric(t.health),
  cash:numeric(t.score),ammo:numeric(t.ammo),reserve:numeric(t.reserve),
  guardHp:numeric(t.enemyHp),guardDefeated:t.mission?.guardDefeated===true,
  captured:t.mission?.captured===true,missionComplete:t.mission?.complete===true,
  rewardGranted:t.mission?.rewardGranted===true};
}
function urbanSavedState(record){
 if(!record||record.version!==1)return null;
 return {x:numeric(record.x),z:numeric(record.z),health:numeric(record.health),
  cash:numeric(record.cash),ammo:numeric(record.ammo),reserve:numeric(record.reserve),
  guardHp:numeric(record.guardHp),guardDefeated:record.guardDefeated===true,
  captured:record.captured===true,missionComplete:record.missionComplete===true,
  rewardGranted:record.rewardGranted===true};
}
function urbanMissionSavedState(record){
 if(!record||record.version!==2||!record.position)return null;
 return {x:numeric(record.position.x),z:numeric(record.position.z),
  health:numeric(record.health),cash:numeric(record.cash),ammo:numeric(record.ammo),
  reserve:numeric(record.reserve),stage:Number.isInteger(record.stage)?record.stage+1:null,
  completed:Array.isArray(record.completed)?record.completed.slice():null,
  rewards:Array.isArray(record.rewards)?record.rewards.slice():null,
  counts:record.counts||null,status:record.status||null};
}
function sameUrbanMission(record,telemetry){
 const a=urbanMissionSavedState(record),b=urbanState(telemetry);
 if(!a||!b||!telemetry?.mission)return false;
 for(const k of ['x','z','health','cash','ammo','reserve']){
  if(a[k]===null||b[k]===null||Math.abs(a[k]-b[k])>0.5)return false;
 }
 if(a.stage!==telemetry.stage||
    JSON.stringify(a.rewards)!==JSON.stringify(telemetry.mission.rewards))return false;
 const progress=telemetry.mission.progress;
 if(!Array.isArray(progress)||!a.counts)return false;
 return progress.every(s=>Number(s.done)===Number(a.counts[s.id]||0));
}
function sameUrban(record,telemetry){
 const a=urbanSavedState(record),b=urbanState(telemetry);
 return !!a&&!!b&&Object.keys(a).every(k=>
  typeof a[k]==='number'?b[k]!==null&&Math.abs(a[k]-b[k])<0.5:a[k]===b[k]);
}
function viewCampaign(t){
 if(!t||!['rpg','arena','fps'].includes(t.genre))return null;
 return {stage:numeric(t.stage),health:numeric(t.health),score:numeric(t.score),
  ammo:numeric(t.ammo),rpgLevel:numeric(t.rpg?.level),rpgXP:numeric(t.rpg?.xp),
  rpgPotions:numeric(t.rpg?.potions)};
}
function campaignMatches(record,t){
 const view=viewCampaign(t);
 if(!view||!record||record.version!==1||!Number.isInteger(record.stage))return false;
 if(view.stage!==record.stage+1)return false;
 return ['health','score','ammo','rpgLevel','rpgXP','rpgPotions'].every(k=>
  typeof record[k]==='number'&&view[k]!==null&&Math.abs(record[k]-view[k])<=1);
}
function decision(p,status,reason,observed={}){
 return {version:18,kind:'3D_SAVE_CONTRACT_QA_RESULT',
  status,reason:String(reason).slice(0,350),contract:p.contract,
  codeFingerprint:p.codeFingerprint,requestFingerprint:p.requestFingerprint,
  requirementIds:p.requirementIds||[],isolated:true,
  at:new Date().toISOString(),
  scenario:{id:p.contract.startsWith('URBAN_')?'urban-autosave-restart':'campaign-checkpoint-restart',
   status,scope:p.scope,observed},
  limitation:'PASS valida restauração em storage virtual de iframe descartável, não durabilidade em disco nem missão/chefe completo.'};
}
async function run(input={}){
 const s=source(input),p=input.plan||plan(input),files=input.files||{};
 if(p.version!==18||p.kind!=='3D_CONTRACT_QA_PLAN'||
    p.codeFingerprint!==GF16.revision(files)||p.requestFingerprint!==GF16.requestRevision(s))
  throw Error('GF18: plano mudou ou é inválido.');
 if(!p.applicable)return decision(p,'UNSUPPORTED','O jogo não oferece contrato 3D de persistência conhecido.');
 const html=String(input.html||''),makeFrame=input.frameFactory||
  (()=>GF16.createFrame(root.document,root.document.body));
 const makeTransport=input.transportFactory||((frame)=>root.GameForgeVisualQA.transport(frame));
 const wait=input.sleep||sleep,progress=input.onUpdate||(()=>{});
 let first=null,second=null,held=null;
 const open=async seed=>{
  const frame=makeFrame();let transport=null;
  try{
   frame.srcdoc=inject(html,seed);
   transport=makeTransport(frame);
   let connected=false;
   for(let i=0;i<14;i++){
    try{await transport.send('ping');connected=true;break;}catch{await wait(150);}
   }
   if(!connected)throw Error('GF18: iframe 3D não respondeu ao canal QA.');
   return {frame,transport};
  }catch(err){
   if(transport)try{transport.close();}catch{}
   frame?.remove?.();throw err;
  }
 };
 const close=session=>{if(!session)return;try{session.transport?.close();}finally{session.frame?.remove?.();}};
 try{
  progress('GF18: criando a primeira prévia 3D isolada...');
  first=await open({});
  const send=(action,args={})=>first.transport.send(action,args);
  let initial=await send('inspect');
  if(initial?.telemetry?.state==='menu'){
   await send('start');await wait(250);initial=await send('inspect');
  }
  if(initial?.telemetry?.state!=='play')
   return decision(p,'INCONCLUSIVE','O jogo 3D não iniciou em estado jogável.');
  const start=initial.telemetry;
  held='ArrowRight';
  await send('press',{key:held});await wait(p.contract.startsWith('URBAN_')?2300:850);
  await send('release',{key:held});held=null;await wait(260);
  const after=(await send('inspect')).telemetry;
  const raw=await send('qa-storage');
  if(!raw?.virtual)return decision(p,'INCONCLUSIVE','Canal de armazenamento virtual não confirmado.');
  const records=clean(raw.entries);
  let key,record;
  if(p.contract.startsWith('URBAN_')){
   const filter=p.contract==='URBAN_MISSIONS_V2'?MISSION:URBAN;
   key=Object.keys(records).find(k=>filter.test(k)&&!k.includes(':backup')&&!k.includes(':pending'));
  }else{
   key=Object.keys(records).find(k=>CAMPAIGN.test(k));
  }
  if(!key)return decision(p,'INCONCLUSIVE',
   p.contract.startsWith('URBAN_')?'Nenhum salvamento urbano confiável encontrado.':
   'O RPG/arena/FPS ainda não concluiu uma fase para gerar checkpoint; não foi simulado.',
   {virtualKeyTypes:Object.keys(records).map(k=>k.startsWith('gameforge-urban-')?'urban':k.startsWith('gameforge-campaign-')?'campaign':'other'),
    rawVirtualKeys:Object.keys(raw.entries||{}).slice(0,6),virtualActions:(raw.stats||[]).slice(0,12),
    telemetryGenre:after?.genre,telemetryState:after?.state,saveStatus:after?.saveStatus,
    saveEnabled:after?.saveEnabled,inspectedErrors:(await send('inspect'))?.errors?.slice(0,3)||[]});
  try{record=JSON.parse(records[key]);}catch{
   return decision(p,'FAIL','Registro de salvamento produzido pelo jogo não é JSON válido.');
  }
  let changed=false;
  if(p.contract.startsWith('URBAN_')){
   const a=urbanState(start),b=urbanState(after);
   changed=!!a&&!!b&&a.x!==null&&b.x!==null&&
    Math.hypot(b.x-a.x,b.z-a.z)>0.2;
   if(!changed)return decision(p,'INCONCLUSIVE','O personagem urbano não mudou de posição; não há progresso suficiente para comprovar save.');
   const savedPos=p.contract==='URBAN_MISSIONS_V2'?urbanMissionSavedState(record):urbanSavedState(record);
   const startPos=urbanState(start),endPos=urbanState(after);
   const persisted=!!savedPos&&savedPos.x!==null&&savedPos.z!==null&&
     Math.hypot(savedPos.x-startPos.x,savedPos.z-startPos.z)>0.2;
   if(!persisted)return decision(p,'INCONCLUSIVE','O jogo se moveu, mas o autosave ainda não persistiu essa posição.');
   // Urbano grava a cada 1,5 s durante movimento: o registro pode ficar atrás
   // do frame final, sem ser uma falha de persistência.
   const drift=Math.hypot(savedPos.x-endPos.x,savedPos.z-endPos.z);
   if(drift>8)return decision(p,'FAIL','Autosave muito distante da posição observada.',
     {distanceFromLatest:Math.round(drift*100)/100});
  }else{
   if(!Number.isInteger(record.stage)||record.stage<1)
    return decision(p,'INCONCLUSIVE','O checkpoint gravado não corresponde a uma nova fase.');
  }
  close(first);first=null;
  progress('GF18: removendo o clone e recriando a partir do registro...');
  second=await open(records);
  let loaded=await second.transport.send('inspect');
  if(loaded?.telemetry?.state==='menu'){
   await second.transport.send('start');await wait(250);loaded=await second.transport.send('inspect');
  }
  const t=loaded?.telemetry,matching=p.contract==='URBAN_MISSIONS_V2'?
   sameUrbanMission(record,t):p.contract==='URBAN_AUTOSAVE_V1'?
   sameUrban(record,t):campaignMatches(record,t);
  const observations={destroyedClone:true,storageVirtual:true,recordKeyType:p.contract,
   changedBeforeSave:changed||record.stage>=1,
   restoredInNewClone:matching,stageAfterRestart:numeric(t?.stage)};
  if(!matching)return decision(p,'FAIL','A nova instância não recuperou os campos estáveis do registro salvo.',observations);
  return decision(p,'PASS',
   p.contract.startsWith('URBAN_')?
    'Movimento urbano e campos de missão foram salvos e restaurados em um novo iframe 3D.':
    'Checkpoint gerado por transição de fase foi recuperado em um novo iframe 3D.',observations);
 }finally{
  if(held&&first){try{await first.transport.send('release',{key:held});}catch{}}
  close(first);close(second);
 }
}
function valid(suite,src,files){
 return !!suite&&suite.version===18&&suite.kind==='3D_SAVE_CONTRACT_QA_RESULT'&&
  suite.isolated===true&&suite.codeFingerprint===GF16.revision(files||{})&&
  suite.requestFingerprint===GF16.requestRevision(src||{});
}
function attach(matrix,suite,src,files){
 if(!valid(suite,src,files)||suite.status!=='PASS')return matrix;
 const rows=(matrix.requirements||[]).map(old=>{
  const row={...old,evidence:[...(old.evidence||[])]};
  if(row.status==='UNSUPPORTED'||!suite.requirementIds.includes(row.id))return row;
  row.evidence.push({source:'GF18_3D_SAVE_RESTART',kind:'observation',text:suite.reason,
   scope:'Teste de restauração virtual, não prova durabilidade no navegador real.',at:suite.at});
  if(row.status!=='ISSUE_DETECTED')row.status='OBSERVED_PARTIAL';
  return row;
 });
 return {...matrix,requirements:rows,summary:{total:rows.length,
  unverified:rows.filter(x=>x.status==='UNVERIFIED').length,
  unsupported:rows.filter(x=>x.status==='UNSUPPORTED').length,
  observedPartial:rows.filter(x=>x.status==='OBSERVED_PARTIAL').length,
  issues:rows.filter(x=>x.status==='ISSUE_DETECTED').length},last3dRestoreQa:{at:suite.at,contract:suite.contract}};
}
function report(suite){
 return '# GameForge — Recuperação 3D GF-ARCH-18\n\n'+
  '- Contrato: '+suite.contract+'\n- Resultado: **'+suite.status+'**\n- Observação: '+suite.reason+
  '\n- ID(s) de requisito: '+suite.requirementIds.join(', ')+
  '\n- Medidas: '+JSON.stringify(suite.scenario.observed||{})+
  '\n\n**Limitação:** '+suite.limitation+
  '\n\nNão atesta que missões ou chefes foram concluídos, nem prova armazenamento persistente fora da sessão QA.\n';
}
root.GameForge3DPersistenceQA={plan,clean,permittedKey,boot,inject,urbanState,urbanSavedState,sameUrban,urbanMissionSavedState,sameUrbanMission,
 viewCampaign,campaignMatches,decision,run,valid,attach,report};
if(typeof module!=='undefined')module.exports=root.GameForge3DPersistenceQA;
})(typeof globalThis!=='undefined'?globalThis:this);
