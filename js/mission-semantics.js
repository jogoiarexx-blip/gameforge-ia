/* GameForge Action Model v1.
 * Interpreta relações entre sujeito, ação, objeto, contagem, condição e fase.
 * Parser determinístico e auditável: sem executar instruções do GDD.
 */
(function(root){
'use strict';
function gameForgeMissionSemanticsFactory(){
 const n=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const actionRules=[
  {id:'eliminate',pattern:/\b(?:eliminar?|elimine|derrotar?|derrote|neutralizar?|neutralize|matar?|mate|vencer|ven[çc]a)\b.{0,70}?\b(?:guarda|guardas|inimigo|inimigos|sentinela|sentinelas)\b/g,target:'guard',max:3,actor:'player',effect:'guard:defeated'},
  {id:'collect',pattern:/\b(?:coletar?|colete|recolher|recolha|pegar?|pegue|apanhar?|apanhe)\b.{0,70}?\b(?:pacote|pacotes|prova|provas|documento|documentos|caixa|caixas|evidencia|evidencias)\b/g,target:'evidence',max:3,actor:'player',effect:'evidence:collected'},
  {id:'deliver',pattern:/\b(?:entregar?|entregue|levar?|leve)\b.{0,85}?\b(?:pacote|pacotes|prova|provas|documento|documentos|caixa|caixas|evidencia|evidencias)\b/g,target:'warehouse',max:1,actor:'player',effect:'evidence:delivered'},
  {id:'capture',pattern:/\b(?:capturar?|capture|dominar?|domine|conquistar?|conquiste|tomar? controle d[ao])\b.{0,65}?\b(?:armazem|negocio|loja|estabelecimento|propriedade)\b/g,target:'warehouse',max:1,actor:'player',effect:'business:captured'}
 ];
 const unsupportedActions=[
  {id:'drive',pattern:/\b(?:dirigir?|dirija|pilotar?|pilote)\b.{0,45}?\b(?:carro|veiculo|viatura)\b/},
  {id:'police',pattern:/\b(?:fugir?|fuja|escapar?)\b.{0,60}?\b(?:policia|viatura)\b/},
  {id:'interior',pattern:/\b(?:invadir?|invada|entrar?|entre)\b.{0,60}?\b(?:interior|predio|casa)\b/},
  {id:'dialogue',pattern:/\b(?:conversar?|converse|negociar?|negocie)\b.{0,65}?\b(?:npc|personagem|comerciante|guarda)\b/},
  {id:'stealth',pattern:/\b(?:furtividade|esgueirar|esconda|evite ser visto)\b/}
 ];
 const numberWords={um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10};
 const objectWords={guard:/\b(?:guarda|guardas|inimigo|inimigos|sentinela|sentinelas)\b/,
  evidence:/\b(?:pacote|pacotes|prova|provas|documento|documentos|caixa|caixas|evidencia|evidencias)\b/,
  warehouse:/\b(?:armazem|negocio|loja|estabelecimento|propriedade)\b/};
 const quantity=(segment,target)=>{
  const pattern=objectWords[target];
  const m=pattern.exec(segment);
  const before=m?segment.slice(Math.max(0,m.index-24),m.index):segment.slice(0,22);
  const token=/\b(\d{1,3}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\s*$/.exec(before.trim());
  if(!token)return 1;
  return numberWords[token[1]]||Number(token[1])||1;
 };
 function blocks(md,command){
  const source=String(md||''),com=String(command||''),lines=source.split(/\r?\n/);
  const results=[];let current=null;
  const section=/^#{1,4}\s*(?:fase|miss[aã]o|cap[ií]tulo)\s*(?:\d+|[IVX]+)?\s*[:—–-]?\s*(.*)$/i;
  const flush=()=>{if(current){results.push(current);current=null;}};
  for(let i=0;i<Math.min(lines.length,12000);i++){
   const line=lines[i],hit=section.exec(line.trim());
   if(hit){flush();current={title:line.replace(/^#+\s*/,'').trim().slice(0,90)||'Missão',rows:[],source:{document:'GDD',line:i+1}};continue;}
   if(current&&line.trim())current.rows.push({text:line,origin:{document:'GDD',line:i+1,excerpt:line.trim().slice(0,150)}});
  }
  flush();
  if(!results.length){
   const rows=source.split(/\r?\n/).map((text,i)=>({text,origin:{document:'GDD',line:i+1,excerpt:text.trim().slice(0,150)}}))
    .filter(x=>x.text.trim());
   const comRows=com.split(/\r?\n/).map((text,i)=>({text,origin:{document:'Comando',line:i+1,excerpt:text.trim().slice(0,150)}})).filter(x=>x.text.trim());
   return [{title:'Missão inicial',rows:[...rows,...comRows],source:{document:rows.length?'GDD':'Comando',line:1}}];
  }
  // Um comando adicional pode alterar o plano sem criar uma fase imaginária.
  if(com.trim())results[results.length-1].rows.push(...com.split(/\r?\n/).map((text,i)=>({
   text,origin:{document:'Comando',line:i+1,excerpt:text.trim().slice(0,150)}
  })).filter(x=>x.text.trim()));
  return results;
 }
 const negative=(text,index)=>/\b(?:sem|nao|evitar|nunca|proibido|nao deve)\b.{0,30}$/.test(text.slice(Math.max(0,index-36),index));
 function parse(md='',command=''){
  const phases=blocks(md,command),missions=[],globalIssues=[];
  let ordinal=0;
  for(const phase of phases.slice(0,32)){
   const steps=[],issues=[],relations=[];
   for(const row of phase.rows.slice(0,400)){
    const text=n(row.text);
    const events=[];
    for(const rule of actionRules){
     rule.pattern.lastIndex=0;let m;
     while((m=rule.pattern.exec(text))!==null){
      if(negative(text,m.index))continue;
      const qty=quantity(m[0],rule.target);
      const raw=m[0].slice(0,180);
      const precondition=/(?:depois de|apos|so depois|quando|somente se|se)\b/.test(text);
      const conditionTerms=[...text.matchAll(/\b(?:antes de|depois de|apos|quando|se|somente se)\b.{0,95}/g)]
        .map(x=>x[0].slice(0,105));
      events.push({index:m.index,action:rule.id,actor:rule.actor,target:rule.target,
       quantity:qty,preconditions:[],effect:rule.effect,raw,conditions:conditionTerms,
       status:qty>rule.max?'unsupported':'supported',source:row.origin,
       ...(qty>rule.max?{reason:'URB-01 suporta até '+rule.max+' '+(rule.target==='guard'?'guardas':'objetos')+' por missão; solicitado '+qty+'.'}:{})});
      if(rule.pattern.lastIndex===m.index)rule.pattern.lastIndex++;
     }
    }
    events.sort((a,b)=>a.index-b.index);
    for(const event of events){
     event.id='s'+(++ordinal);
     if(event.status==='unsupported')issues.push({id:event.id,action:event.action,quantity:event.quantity,
      source:event.source,reason:event.reason});
     steps.push(event);
    }
    for(const rule of unsupportedActions)if(rule.pattern.test(text)&&!negative(text,text.search(rule.pattern))){
     issues.push({action:rule.id,source:row.origin,reason:'Ação "'+rule.id+'" ainda não é executável no motor urbano 3D.'});
    }
   }
   // Relacionamentos: eliminar -> capturar, coletar -> entregar, mesmo que
   // o usuário os tenha escrito na ordem inversa.
   const byAction=act=>steps.filter(x=>x.action===act&&x.status==='supported');
   for(const capture of byAction('capture')){
    for(const guard of byAction('eliminate')){
     capture.preconditions.push(guard.id);
     relations.push({from:guard.id,to:capture.id,type:'before',reason:'Guarda precisa ser derrotado antes da captura'});
    }
   }
   for(const deliver of byAction('deliver')){
    for(const collect of byAction('collect')){
     deliver.preconditions.push(collect.id);
     relations.push({from:collect.id,to:deliver.id,type:'before',reason:'Itens devem ser coletados antes da entrega'});
    }
   }
   const sorted=[];const left=steps.filter(x=>x.status==='supported');
   for(let tries=0;left.length&&tries<25;tries++){
    const index=left.findIndex(x=>x.preconditions.every(id=>sorted.some(t=>t.id===id)));
    if(index<0)break;
    sorted.push(left.splice(index,1)[0]);
   }
   const title=phase.title;
   const rewardMatch=phase.rows.map(x=>n(x.text)).join(' ').match(/\b(?:recompensa|ganhar?|receber?)\s*(?:de )?(?:r\$\s*|\$\s*)?(\d{2,6})\b/);
   const reward=rewardMatch?Math.min(10000,Number(rewardMatch[1])):450;
   const mission={id:'m'+(missions.length+1),title,phase:missions.length+1,source:phase.source,
    actions:steps,steps:sorted,relations,issues,reward,objects:[...new Set(steps.map(x=>x.target))],
    status:issues.length?'partial':sorted.length?'supported':'unresolved'};
   if(steps.length||issues.length)missions.push(mission);
   globalIssues.push(...issues);
  }
  const limits=[];
  if(phases.length>3)limits.push({reason:'Motor urbano executa no máximo 3 fases personalizadas; GDD descreveu '+phases.length+'.',requested:phases.length,max:3});
  return {version:2,actor:'player',missions:missions.slice(0,3),issues:[...globalIssues,...limits],
   sourcePhases:phases.length,relations:missions.flatMap(m=>m.relations.map(x=>({...x,mission:m.id}))),
   note:'Ações suportadas: eliminar até 3 guardas, coletar até 3 evidências, entregar evidências e capturar um negócio. Outras ações permanecem pendentes.'};
 }
 function executable(model){
  if(!model||!Array.isArray(model.missions))return [];
  return model.missions.filter(m=>m.steps.length&&m.status==='supported').map(m=>({
   id:m.id,title:m.title,source:m.source,phase:m.phase,reward:m.reward,
   steps:m.steps.map(s=>({id:s.id,action:s.action,actor:s.actor,target:s.target,
    quantity:s.quantity,requires:s.preconditions,source:s.source,effect:s.effect})),
   relations:m.relations
  }));
 }
 return {parse,executable};
}
const api=gameForgeMissionSemanticsFactory();
root.GameForgeMissionSemantics=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
