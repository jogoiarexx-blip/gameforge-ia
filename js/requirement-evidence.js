/* GF-ARCH-14 — matriz de requisitos com evidências de execução de QA.
 * Nenhum requisito vira "aprovado" só por ter sido configurado ou descrito.
 */
(function(root){
'use strict';
const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function checksum(text){
 const raw=String(text||'');let hash=2166136261;
 for(let i=0;i<raw.length;i++){hash^=raw.charCodeAt(i);hash=Math.imul(hash,16777619);}
 return (hash>>>0).toString(16).padStart(8,'0')+':'+raw.length;
}
function fingerprint(files){
 const paths=['game.js','style.css'];
 return checksum(paths.map(p=>p+'\0'+String(files?.[p]||'')).join('\0'));
}
const categories=[
 {id:'controls',words:/moviment|caminh|corrid|pula|pulo|tecla|controle|wasd|joystick|comand|direc|camera|camer/},
 {id:'graphics',words:/graf|render|visual|textur|sombra|ilumina|luz|sprite|modelo|personagem|3d|2d|pixel|animac|hud|menu/},
 {id:'runtime',words:/erro|trav|crash|congel|bug|falha|funcion|execut|loop/},
 {id:'performance',words:/fps|desempenh|otimiz|lento|rapido|fluidez|performance/},
 {id:'progress',words:/fase|miss|checkpoint|objetivo|nivel|chefe|boss|inimig|dificuld|desafio/},
 {id:'persistence',words:/salv|save|backup|restaur|continu|inventar/},
 {id:'export',words:/export|zip|html|public|github|baixar/}
];
function category(text){
 const n=normalize(text);return categories.find(c=>c.words.test(n))?.id||'other';
}
function clauses(text){
 return String(text||'').split(/\n|;|[.!?](?=\s|$)/).map(x=>x.trim()).filter(Boolean);
}
function extract(input={}){
 const rows=[],seen=new Set(),max=40;
 function push(text,source,state='UNVERIFIED'){
  const clean=String(text||'').replace(/^\s*[-*]\s*(?:\[[x ]\]\s*)?/,'').trim().slice(0,280);
  if(!clean||clean.length<5)return;
  const key=normalize(clean).replace(/\s+/g,' ').trim();
  if(seen.has(key)||rows.length>=max)return;
  seen.add(key);
  const id='REQ-'+checksum(source+'|'+key).split(':')[0];
  rows.push({id,source,description:clean,category:category(clean),status:state,
   confidence:'NOT_ASSESSED',evidence:[],note:state==='UNSUPPORTED'?'Registrado como pendente no contrato do motor; não é mecânica implementada.':'Ainda não há teste específico deste requisito.'});
 }
 for(const c of clauses(input.instruction).slice(0,30))push(c,'INSTRUCTION');
 const gdd=String(input.gdd||'').slice(0,60000);
 const selected=gdd.split(/\r?\n/).filter(l=>/^\s*[-*]\s+/.test(l)&&l.length<350).slice(0,14);
 for(const line of selected)push(line,'GDD');
 for(const pending of (input.spec?.implementation?.pending||[]).slice(0,18)){
  push(typeof pending==='string'?pending:pending?.description,'ENGINE_PENDING','UNSUPPORTED');
 }
 return {version:14,method:'Segmentação textual e pendências declaradas; sem teste automático implícito',
  projectFingerprint:fingerprint(input.files||{}),requirements:rows,
  summary:{total:rows.length,unverified:rows.filter(r=>r.status==='UNVERIFIED').length,unsupported:rows.filter(r=>r.status==='UNSUPPORTED').length,observedPartial:0,issues:0},
  note:'Declaração, configuração e heurística não comprovam implementação. QA genérico só oferece evidência parcial.'};
}
const rules={
 controls:{pass:/\bMovimenta[cç][aã]o detectada:/i,issue:['movement','controls','input'],meaning:'QA observou deslocamento em um roteiro, não validou todos os controles do requisito.'},
 graphics:{pass:/Canvas encontrado:/i,issue:['canvas','capture','render'],meaning:'QA encontrou canvas, sem comprovar qualidade gráfica ou modelos solicitados.'},
 runtime:{pass:/Nenhum erro JavaScript comunicado/i,issue:['runtime','freeze'],meaning:'QA não detectou erro durante o roteiro, não em todas as situações.'},
 performance:{pass:/Loop de renderiza[cç][aã]o avan[cç]ou/i,issue:['freeze'],meaning:'QA observou progresso do loop, sem medir FPS nem velocidade alvo.'}
};
function evaluate(matrix,input={}){
 const base=matrix?.requirements||[],qa=input.qa||null;
 const current=fingerprint(input.files||{});
 const valid=!!qa&&matrix.projectFingerprint===current&&Array.isArray(qa.passes)&&Array.isArray(qa.issues);
 const issues=valid?qa.issues:[],passes=valid?qa.passes:[],at=valid?String(qa.at||'sem data informada'):'';
 const out=base.map(source=>{
  const row={...source,evidence:[]};
  if(row.status==='UNSUPPORTED')return row;
  row.status='UNVERIFIED';row.confidence='NOT_ASSESSED';row.note='Sem evidência específica para este requisito.';
  if(!valid)return row;
  const rule=rules[row.category];
  if(!rule)return row;
  const reported=issues.filter(i=>rule.issue.includes(String(i.type||'')));
  if(reported.length){
   row.status='ISSUE_DETECTED';row.confidence='EXECUTED_QA';
   row.evidence=reported.slice(0,3).map(i=>({source:'GAMEFORGE_VISUAL_QA',kind:'issue',text:String(i.message||'').slice(0,180),at}));
   row.note='Problema indicado pelo teste genérico; requer investigação específica.';return row;
  }
  const match=passes.find(p=>rule.pass.test(String(p)));
  if(match){
   row.status='OBSERVED_PARTIAL';row.confidence='EXECUTED_QA';
   row.evidence=[{source:'GAMEFORGE_VISUAL_QA',kind:'observation',text:String(match).slice(0,180),at}];
   row.note=rule.meaning;
  }
  return row;
 });
 const summary={total:out.length,unverified:out.filter(r=>r.status==='UNVERIFIED').length,
  unsupported:out.filter(r=>r.status==='UNSUPPORTED').length,
  observedPartial:out.filter(r=>r.status==='OBSERVED_PARTIAL').length,
  issues:out.filter(r=>r.status==='ISSUE_DETECTED').length};
 return {...matrix,projectFingerprint:current,requirements:out,summary,
  lastQa:valid?{at,scenario:String(qa.scenario||'').slice(0,80),fingerprint:current}:null};
}
function report(matrix){
 const m=matrix||{},rows=m.requirements||[],stats=m.summary||{};
 const result=['# GameForge — Evidências por requisito GF-ARCH-14','',
  'Status: UNVERIFIED (não testado), UNSUPPORTED (pendente), OBSERVED_PARTIAL (observação genérica), ISSUE_DETECTED (problema em QA).',
  'Nenhum status desta matriz significa requisito completamente aprovado.',
  '',
  'Requisitos: '+rows.length+'; observações parciais: '+(stats.observedPartial||0)+'; problemas: '+(stats.issues||0)+'; pendências: '+(stats.unsupported||0),
  'Fingerprint de código avaliado: '+(m.projectFingerprint||'não informado'),''];
 for(const row of rows){
  result.push('## '+row.id+' — '+row.status,'- Origem: '+row.source+'; categoria: '+row.category,
   '- Pedido: '+row.description,'- Nota: '+row.note);
  for(const e of row.evidence||[])result.push('- Evidência ['+e.kind+']: '+e.text+' ('+e.at+')');
  result.push('');
 }
 result.push('**Limite:** o teste QA embutido verifica um pequeno cenário; não é uma bateria completa dos requisitos declarados. Qualquer alteração de código invalida evidências da versão anterior.','');
 return result.join('\n');
}
const api={extract,evaluate,report,fingerprint,checksum,category};
root.GameForgeRequirementEvidence=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
