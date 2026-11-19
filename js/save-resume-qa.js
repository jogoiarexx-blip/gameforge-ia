/* GF-ARCH-17 — salvar, destruir a prévia e continuar em NOVO clone.
 * Armazenamento virtual só existe no iframe com origem opaca. Nenhum dado do
 * localStorage verdadeiro do Studio é lido/escrito, nem agentes são executados.
 */
(function(root){
'use strict';
const GF16=root.GameForgeAdvancedScenarioQA||(typeof require==='function'?require('./advanced-scenario-qa'):null);
const Evidence=root.GameForgeRequirementEvidence||(typeof require==='function'?require('./requirement-evidence'):null);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const KEY=/^gameforge-simulation-v1-[a-f0-9]{1,16}$/;
function request(input={}){return {instruction:input.instruction||'',gdd:input.gdd||'',spec:input.spec||null};}
function plan(input={}){
 const source=request(input),spec=source.spec||{},simulation=spec.simulation||{};
 const applicable=spec.genre==='simulation'&&simulation.persistence?.enabled===true;
 const related=Evidence.extract({...source,files:input.files||{}}).requirements
  .filter(r=>r.status!=='UNSUPPORTED'&&/salv|save|continu|retom|restaur|carreg|progres/i.test(r.description))
  .map(r=>r.id);
 return {version:17,kind:'VIRTUAL_STORAGE_RESTART_QA_PLAN',applicable,genre:spec.genre||'unknown',
  codeFingerprint:GF16.revision(input.files||{}),requestFingerprint:GF16.requestRevision(source),
  requirementIds:related,contract:applicable?'simulation-v1':'NOT_SUPPORTED',
  note:applicable?'Salvar, descartar iframe, criar outro e continuar com o mesmo registro em armazenamento VIRTUAL.':'Motor sem contrato de persistência de simulação compatível: inconclusivo, sem executar.'};
}
function sanitize(entries){
 if(!entries||typeof entries!=='object'||Array.isArray(entries))return {};
 const out={};let total=0;
 for(const [key,value] of Object.entries(entries)){
  if(!KEY.test(key)||typeof value!=='string'||value.length>30000)continue;
  total+=value.length+key.length;
  if(total>60000||Object.keys(out).length>=4)break;
  out[key]=value;
 }
 return out;
}
function virtualStorageBoot(seed={}){
 // É serializada para executar ANTES dos motores do jogo, no clone isolado.
 const data=Object.create(null);
 for(const [key,value] of Object.entries(seed||{})){
  if(/^gameforge-simulation-v1-[a-f0-9]{1,16}$/.test(key)&&typeof value==='string'&&value.length<=30000)data[key]=value;
 }
 const keyAllowed=k=>/^gameforge-simulation-v1-[a-f0-9]{1,16}$/.test(String(k));
 const store={
  getItem(k){return Object.hasOwn(data,String(k))?data[String(k)]:null;},
  setItem(k,v){const key=String(k),value=String(v);
   if(!keyAllowed(key)||value.length>30000)throw Error('Chave ou valor não autorizado pelo QA');
   data[key]=value;
  },
  removeItem(k){if(keyAllowed(k))delete data[String(k)];},
  clear(){for(const k of Object.keys(data))delete data[k];},
  key(i){return Object.keys(data)[i]??null;},
  get length(){return Object.keys(data).length;}
 };
 Object.defineProperty(window,'localStorage',{configurable:true,value:store});
 Object.defineProperty(window,'__gameforgeQA17Storage',{configurable:false,value:Object.freeze({
  kind:'GF17_VIRTUAL_STORE',dump:()=>({...data})})});
}
function inject(html,initial={}){
 const source=GF16.protectFocus(String(html||''));
 const csp=source.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/i);
 if(!csp||!source.includes('gameforge-qa'))throw Error('Prévia QA instrumentada/CSP ausente.');
 const safe=JSON.stringify(sanitize(initial)).replace(/</g,'\\u003c');
 const boot='<script>('+virtualStorageBoot.toString()+')('+safe+');</script>';
 return source.replace(csp[0],csp[0]+boot);
}
function stateView(t){
 const s=t?.simulation;
 if(!s||typeof s!=='object')return null;
 return {money:s.money,earned:s.earned,inventory:s.inventory,sales:s.sales,
  slots:Array.isArray(s.slots)?s.slots.map(item=>item!==null):null,
  story:s.story||null,complete:s.complete===true};
}
function sameState(a,b){
 if(!a||!b)return false;
 return ['money','earned','inventory','sales','slots','story','complete'].every(k=>JSON.stringify(a[k])===JSON.stringify(b[k]));
}
function result(p,status,reason,measures={}){
 return {version:17,kind:'SAVE_RESUME_QA_RESULT',status,reason:String(reason).slice(0,450),
  codeFingerprint:p.codeFingerprint,requestFingerprint:p.requestFingerprint,
  requirementIds:p.requirementIds,contract:p.contract,isolated:true,
  scenarios:[{id:'simulation-save-restart-resume',status,scope:
   'Gravar estado simulado, destruir iframe sandbox e recriar outro com storage virtual; NÃO valida localStorage persistente real.',
   observed:measures,at:new Date().toISOString()}],
  at:new Date().toISOString(),
  limitation:'Armazenamento em memória de um clone: o teste não garante armazenamento do navegador/dispositivo em produção.'};
}
async function run(input={}){
 const source=request(input),p=input.plan||plan(input),files=input.files||{};
 if(p.version!==17||p.kind!=='VIRTUAL_STORAGE_RESTART_QA_PLAN'||
  p.codeFingerprint!==GF16.revision(files)||p.requestFingerprint!==GF16.requestRevision(source))
  throw Error('Plano de salvamento obsoleto ou inválido.');
 if(!p.applicable)return result(p,'UNSUPPORTED','Esse motor não fornece o contrato simulation-v1 com salvamento ativado.');
 const html=String(input.html||'');
 const makeFrame=input.frameFactory||(()=>GF16.createFrame(root.document,root.document.body));
 const makeTransport=input.transportFactory||((frame)=>root.GameForgeVisualQA.transport(frame));
 const wait=input.sleep||sleep,update=input.onUpdate||(()=>{});
 let virtualStore={},savedState=null,savedRecord=null,modified=false,first=null,restored=null;
 const open=async(seed)=>{
  const frame=makeFrame();let t=null;
  try{
   frame.srcdoc=inject(html,seed);
   t=makeTransport(frame);
   let connected=false;
   for(let i=0;i<14;i++){
    try{await t.send('ping');connected=true;break;}
    catch(e){await wait(125);}
   }
   if(!connected)throw Error('Clone com armazenamento virtual não respondeu.');
   return {frame,transport:t};
  }catch(e){
   if(t)try{t.close();}catch{}
   if(frame?.remove)frame.remove();
   throw e;
  }
 };
 const close=session=>{
  if(!session)return;
  try{session.transport?.close();}finally{session.frame?.remove?.();}
 };
 const pressButton=async(t,target)=>{
  const response=await t.send('qa-click',{target});
  return response?.clicked===true;
 };
 try{
  update('GF17: criando jogo descartável com armazenamento virtual...');
  first=await open({});
  let before=await first.transport.send('inspect');
  if(before.telemetry?.state==='menu'){
   await first.transport.send('start');await wait(180);
  }
  before=await first.transport.send('inspect');
  const click=await pressButton(first.transport,'simulation-action-start');
  await wait(100);
  const after=await first.transport.send('inspect');
  const a=stateView(before.telemetry),b=stateView(after.telemetry);
  modified=click&&!sameState(a,b);
  update('GF17: salvando no clone e destruindo o primeiro jogo...');
  const saved=await pressButton(first.transport,'simulation-save');
  if(!saved)return result(p,'INCONCLUSIVE','O jogo não disponibilizou o botão de salvamento durante o roteiro.');
  const dump=await first.transport.send('qa-storage');
  if(!dump?.virtual)return result(p,'INCONCLUSIVE','Armazenamento virtual não foi confirmado.');
  virtualStore=sanitize(dump.entries);
  const keys=Object.keys(virtualStore);
  if(keys.length!==1)return result(p,'INCONCLUSIVE','O jogo não criou exatamente um registro válido de simulação.',{keys:keys.length});
  try{
   savedRecord=JSON.parse(virtualStore[keys[0]]);
   savedState=stateView({simulation:savedRecord.state});
  }catch{return result(p,'INCONCLUSIVE','Registro de salvamento ilegível no armazenamento virtual.');}
  if(!savedState)return result(p,'INCONCLUSIVE','Registro não contém estado de simulação verificável.');
  close(first);first=null;
  update('GF17: recriando o jogo do zero e recuperando o registro...');
  restored=await open(virtualStore);
  let initial=await restored.transport.send('inspect');
  const available=initial.telemetry?.persistence?.available===true;
  const resumed=await pressButton(restored.transport,'simulation-continue');
  await wait(80);
  const final=await restored.transport.send('inspect');
  const recovered=stateView(final.telemetry);
  const consistent=sameState(savedState,recovered);
  const measures={virtualStorage:true,destroyedFirstClone:true,
   savedSlotCount:savedState.slots?.filter(Boolean).length||0,
   resumed,saveAvailableOnReload:available,
   stateEqual:consistent,mutatedBeforeSave:modified};
  if(!available||!resumed)return result(p,'FAIL',
   'Existe registro virtual, mas o jogo não ofereceu continuação após recriar o iframe.',measures);
  if(!consistent)return result(p,'FAIL','O estado recuperado difere do registro salvo (campos estáveis).',measures);
  if(!modified)return result(p,'INCONCLUSIVE',
   'A restauração do registro funcionou, porém o teste não conseguiu alterar o estado antes de salvar.',measures);
  return result(p,'PASS','Estado alterado, salvo, restaurado em NOVO iframe e comparado aos dados gravados no storage virtual.',measures);
 }finally{
  close(first);close(restored);
 }
}
function valid(suite,source,files){
 return !!suite&&suite.version===17&&suite.kind==='SAVE_RESUME_QA_RESULT'&&suite.isolated===true&&
  suite.codeFingerprint===GF16.revision(files||{})&&suite.requestFingerprint===GF16.requestRevision(source||{});
}
function attach(matrix,suite,source,files){
 if(!valid(suite,source,files)||suite.status!=='PASS')return matrix;
 const rows=(matrix.requirements||[]).map(original=>{
  const row={...original,evidence:[...(original.evidence||[])]};
  if(row.status==='UNSUPPORTED'||!suite.requirementIds.includes(row.id))return row;
  row.evidence.push({source:'GF17_VIRTUAL_SAVE_RESUME',kind:'observation',
   text:suite.reason,scope:'Apenas armazenamento virtual do clone; não equivale a restore persistente real.',
   at:suite.at});
  if(row.status!=='ISSUE_DETECTED')row.status='OBSERVED_PARTIAL';
  return row;
 });
 return {...matrix,requirements:rows,summary:{total:rows.length,
  unverified:rows.filter(r=>r.status==='UNVERIFIED').length,
  unsupported:rows.filter(r=>r.status==='UNSUPPORTED').length,
  observedPartial:rows.filter(r=>r.status==='OBSERVED_PARTIAL').length,
  issues:rows.filter(r=>r.status==='ISSUE_DETECTED').length},lastRestoreQa:{at:suite.at,virtual:true}};
}
function report(suite){
 return '# GameForge — Teste de salvar e continuar GF-ARCH-17\n\n'+
  '- Resultado: **'+suite.status+'**\n- Teste: '+suite.reason+
  '\n- Contrato: '+suite.contract+
  '\n- Requisito(s): '+suite.requirementIds.join(', ')+
  '\n- Revisão: '+suite.codeFingerprint+
  '\n- Observações: '+JSON.stringify(suite.scenarios[0]?.observed||{})+
  '\n\n**Limite:** '+suite.limitation+
  '\n\nUm PASS não comprova a durabilidade do armazenamento em produção, estabilidade do dispositivo nem a restauração de todos os mecanismos do jogo.\n';
}
root.GameForgeSaveResumeQA={plan,sanitize,virtualStorageBoot,inject,stateView,sameState,run,valid,attach,report};
if(typeof module!=='undefined')module.exports=root.GameForgeSaveResumeQA;
})(typeof globalThis!=='undefined'?globalThis:this);
