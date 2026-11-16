/* GF-006 — StageSpec v1: GDD/brief -> fases rastreaveis a contratos reais.
 * Dados declarativos, deterministas e offline. Nao interpreta roteiro livre como codigo.
 */
(function(root){
'use strict';
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const LAYOUTS=[
 {id:'courtyard',name:'Pátio com colunatas',pattern:/\b(patio|praca|pracinha|courtyard|jardim interno)\b/},
 {id:'outpost',name:'Posto avançado com torres',pattern:/\b(armazem|deposito|fortaleza|quartel|posto avancado|outpost|base militar)\b/},
 {id:'cross',name:'Cruzamento de ruas',pattern:/\b(cruzamento|avenida|avenidas|encruzilhada|crossroads)\b/}
];
const COMBAT_3D=new Set(['arena','fps','rpg']);
const safeTitle=s=>String(s||'').replace(/[<>]/g,'').slice(0,130);
function hashString(s){
 let h=2166136261;
 for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;
 return h.toString(16).padStart(8,'0');
}
function projectIdentity(spec,gdd,command){
 const seed=JSON.stringify([spec.title,spec.genre,spec.dimension,spec.stages,String(gdd||'').slice(0,50000),String(command||'').slice(0,12000)]);
 return 'gf-'+hashString(seed)+'-'+hashString(seed.split('').reverse().join(''));
}
function selectArchetype(rows){
 let selected=null;
 const patterns=[
  ['runner',/\b(corredores?|velocistas?|inimigos? rapid[oa]s?|inimigos? velozes?|batedores?)\b/],
  ['brute',/\b(brutamontes?|tanques?|inimigos? pesad[oa]s?|gigantes? blindados?|inimigos? blindad[oa]s?)\b/],
  ['sentinel',/\b(sentinelas?|guardas? defensivos?|soldados? resistentes?)\b/],
  ['mixed',/\b(inimigos? mistos?|tipos? misturados?|mistura de inimigos?|inimigos? variados?)\b/]
 ];
 for(const row of rows){
  if(/\b(sem|nao quero|remover|retirar|evitar)\b.{0,30}\b(inimig|corredor|brutamonte|sentinela)/.test(row.normal))continue;
  for(const [kind,pattern] of patterns)if(pattern.test(row.normal))
   selected={kind,origin:{document:row.document,line:row.line}};
 }
 return selected;
}
function timedEvents(rows){
 const events=[];
 for(const row of rows){
  const t=row.normal;
  if(/\b(sem|nao quero|remova|retire|desative)\b.{0,38}\b(reforcos?|curas?|kit medico)/.test(t))continue;
  const when=/\b(?:aos?|apos|depois de|no segundo)\s*(\d{1,3})\s*(?:segundos?|s\b)/.exec(t);
  if(!when)continue;
  const at=Number(when[1]);
  if(!Number.isInteger(at)||at<5||at>120)continue;
  let type=null,amount=0;
  if(/\b(reforcos?|inimigos? extras?|onda extra)\b/.test(t)){
   type='reinforcements';
   const qty=/(\d{1,2})\s+(?:novos?\s+)?(?:inimigos?\s+)?(?:reforcos?|inimigos? extras?)/.exec(t)||/\breforcos?\s*(?:de|com)?\s*(\d{1,2})/.exec(t);
   amount=Math.max(2,Math.min(8,Number(qty?.[1])||3));
  }else if(/\b(cura|curar|recuperar vida|kit medico)\b/.test(t)){
   type='heal';
   const qty=/\b(?:cura|curar|recuperar vida|kit medico)\s*(?:de|com|\+)?\s*(\d{1,2})\b/.exec(t);
   amount=Math.max(10,Math.min(45,Number(qty?.[1])||25));
  }
  if(!type)continue;
  // Uma instância de cada evento por fase nesta versão; a última ordem prevalece.
  const id='event-'+type;
  const current=events.findIndex(x=>x.id===id);
  const event={id,type,at,amount,status:'implementado',
   origin:{document:row.document,line:row.line}};
  if(current>=0)events.splice(current,1);
  events.push(event);
 }
 return events.slice(0,2).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
}

// GF-008: gramática explícita e pequena: cada termo reconhecido vira regra jogável.
const ZONE_PATTERN=/\b(norte|sul|leste|oeste|centro)\b/;
const ZONE_IDS={norte:'north',sul:'south',leste:'east',oeste:'west',centro:'center'};
function parseMissionStep(source){
 const t=normalize(source).trim().replace(/^primeiro\s+/, '');
 const reach=/\b(va|ir|visite|visitar|chegue|chegar|alcance|alcancar|entre|entrar|passe|passar)\b/.test(t)&&ZONE_PATTERN.exec(t);
 if(reach)return {kind:'reach',zone:ZONE_IDS[ZONE_PATTERN.exec(t)[1]],label:'Chegue ao ponto '+ZONE_PATTERN.exec(t)[1]};
 if(/\b(elimine|eliminar|derrote|derrotar|mate|matar|limpe|limpar)\b/.test(t)&&
    /\b(inimigos?|guardas?|monstros?|soldados?|chefes?|guardioes?)\b/.test(t))
  return {kind:'eliminate',label:'Derrote os inimigos'};
 if(/\b(colete|coletar|pegue|pegar|reuna|reunir)\b/.test(t)&&
    /\b(cristais?|fragmentos?)\b/.test(t)){
  const qty=/\b(\d{1,2})\s+(?:cristais?|fragmentos?)\b/.exec(t);
  if(qty&&Number(qty[1])!==3)return null; // Motor atual coloca 3 cristais.
  return {kind:'collect',label:'Colete 3 cristais'};
 }
 const survive=/\b(sobreviva|sobreviver|aguarde|resista)\b.{0,45}\b(\d{1,3})\s*(?:segundos?|s\b)/.exec(t);
 if(survive){
  const seconds=Number(survive[2]);
  if(seconds>=5&&seconds<=180)return {kind:'survive',seconds,label:'Resista por '+seconds+'s'};
 }
 return null;
}
function missionSequence(rows){
 let latest=null;
 for(const row of rows){
  const t=row.normal;
  if(!/^(?:etapas|sequencia|objetivos em ordem)\s*[:\-]|^\s*primeiro\s+/.test(t))continue;
  if(/\b(sem|nao quero|remover|desativar)\b.{0,22}\b(etapas|sequencia)\b/.test(t)){
   latest={steps:null,status:'nao_solicitado',origin:{document:row.document,line:row.line}};
   continue;
  }
  const body=t.replace(/^(?:etapas|sequencia|objetivos em ordem)\s*[:\-]\s*/,'');
  const segments=body.split(/\s*(?:->|=>|;|\s*,?\s+(?:depois|entao|em seguida|por fim)\s+)\s*/).map(x=>x.trim()).filter(Boolean);
  const steps=segments.map(parseMissionStep);
  const ok=segments.length>=2&&segments.length<=5&&steps.every(Boolean);
  latest={steps:ok?steps.map((item,i)=>({...item,id:'step-'+(i+1)})):null,
   status:ok?'implementado':'pendente',
   origin:{document:row.document,line:row.line}};
 }
 return latest;
}
function zoneEvents(rows){
 const events=[];
 for(const row of rows){
  const t=row.normal;
  if(!/\b(?:ao entrar|quando entrar|ao chegar|quando chegar|ao pisar|quando pisar)\b/.test(t))continue;
  const zone=ZONE_PATTERN.exec(t);
  if(!zone)continue;
  const zoneId=ZONE_IDS[zone[1]];
  const negative=/\b(sem|nao quero|remover|retirar|evitar|desativar)\b.{0,50}\b(reforcos?|curas?|kit medico)\b/.test(t);
  const type=/\b(reforcos?|inimigos? extras?|onda extra)\b/.test(t)?'reinforcements':
   /\b(cura|curar|recuperar vida|kit medico)\b/.test(t)?'heal':null;
  if(!type)continue;
  const id='zone-'+type+'-'+zoneId,old=events.findIndex(e=>e.id===id);
  if(old>=0)events.splice(old,1);
  if(negative)continue;
  const qty=type==='reinforcements'?
   /(\d{1,2})\s+(?:novos?\s+)?(?:inimigos?\s+)?(?:reforcos?|inimigos? extras?)/.exec(t)||/\breforcos?\s*(?:de|com)?\s*(\d{1,2})/.exec(t):
   /\b(?:cura|curar|recuperar vida|kit medico)\s*(?:de|com|\+)?\s*(\d{1,2})\b/.exec(t);
  const amount=Math.max(type==='heal'?10:2,Math.min(type==='heal'?45:8,Number(qty?.[1])||(type==='heal'?25:3)));
  events.push({id,type,zone:zoneId,amount,status:'implementado',
   origin:{document:row.document,line:row.line}});
 }
 return events.slice(0,4);
}

function records(source,document){
 const rows=[],lines=String(source||'').split(/\r?\n/);
 let stage=null;
 for(let i=0;i<Math.min(lines.length,24000);i++){
  const raw=lines[i].trim(),normal=normalize(raw);
  if(!raw||raw.length>2200)continue;
  const heading=/^#{1,6}\s+/.test(raw);
  const marked=/^(?:#{1,6}\s+|[-*+]\s+)?(?:(?:na|no|para a|para o)\s+)?(?:fase|missao|etapa|level|stage)\s*(\d{1,2})\b/.exec(normal);
  const inline=!marked&&!heading?/\b(?:fase|missao|etapa|level|stage)\s*(\d{1,2})\b/.exec(normal):null;
  if(marked){stage=Number(marked[1])-1;}
  else if(heading){stage=null;}
  const rowStage=inline?Number(inline[1])-1:stage;
  if(rowStage===null||rowStage<0||rowStage>=40)continue;
  rows.push({stage:rowStage,text:raw,normal,document,line:i+1});
 }
 return rows;
}
function selectLayout(rows){
 for(let i=rows.length-1;i>=0;i--){
  const row=rows[i];
  for(const type of LAYOUTS)if(type.pattern.test(row.normal))return {id:type.id,name:type.name,origin:{document:row.document,line:row.line}};
 }
 return null;
}
function goal(genre,dimension,c){
 if(dimension!=='3d')return {kind:'desconhecida',status:'pendente',reason:'Este StageSpec nao controla objetivos do runtime 2D.'};
 if(COMBAT_3D.has(genre)){
  const mission=['eliminate','collect','survive'].includes(c.mission)?c.mission:'default';
  return {kind:mission,exit:'portal',status:'implementado',
   ...(mission==='survive'?{seconds:Number.isFinite(c.seconds)?c.seconds:45}:{})};
 }
 if(genre==='racing')return {kind:'ordered-laps',exit:'portais em ordem',status:'implementado',
   laps:Number.isInteger(c.laps)&&c.laps>0?c.laps:null};
 if(genre==='platform')return {kind:'collect-and-exit',exit:'portal',status:'implementado'};
 if(genre==='shooter')return {kind:'waves-and-boss',exit:'fim das ondas',status:'implementado',
   waves:Number.isInteger(c.waves)&&c.waves>0?c.waves:null};
 return {kind:'desconhecida',status:'pendente'};
}
function compile(spec,gdd='',command=''){
 if(!spec||typeof spec!=='object')throw Error('GameSpec ausente');
 const stages=Array.isArray(spec.stages)?spec.stages.slice(0,40):[];
 const configs=Array.isArray(spec.stageConfig)?spec.stageConfig.map(x=>x&&typeof x==='object'&&!Array.isArray(x)?{...x}:{}):[];
 const source=[...records(gdd,'GDD'),...records(command,'Comando')];
 if(!/^gf-[0-9a-f]{8}-[0-9a-f]{8}$/.test(String(spec.projectId||'')))
  spec.projectId=projectIdentity(spec,gdd,command);
 const combat=spec.dimension==='3d'&&COMBAT_3D.has(spec.genre);
 const stageSpecs=stages.map((name,index)=>{
  const rows=source.filter(x=>x.stage===index);
  const layout=selectLayout(rows);
  const c=configs[index]||{};
  if(combat&&layout)c.layout=layout.id;
  const enemy=selectArchetype(rows);
  if(combat&&enemy)c.enemyArchetype=enemy.kind;
  const events=combat?timedEvents(rows):[];
  if(combat&&events.length)c.events=events;
  const sequence=combat?missionSequence(rows):null;
  if(combat&&sequence?.steps)c.missionSteps=sequence.steps;
  const spatial=combat?zoneEvents(rows):[];
  if(combat&&spatial.length)c.zoneEvents=spatial;
  configs[index]=c;
  const mapLayout=combat?(LAYOUTS.some(x=>x.id===c.layout)?c.layout:'cross'):null;
  const configuredTheme=['forest','desert','neon','ruins'].includes(c.theme)?c.theme:
   (['forest','desert','neon','ruins'].includes(spec.worldOptions?.theme)?spec.worldOptions.theme:null);
  const objective=goal(spec.genre,spec.dimension,c);
  return {
   version:1,id:'stage-'+String(index+1).padStart(2,'0'),index,title:safeTitle(name),
   source:rows.slice(0,24).map(r=>({document:r.document,line:r.line,excerpt:r.text.slice(0,160)})),
   environment:{theme:configuredTheme,layout:mapLayout,
    layoutStatus:combat?'implementado':(layout?'pendente':'nao_solicitado'),
    ...(layout?{layoutOrigin:layout.origin}:{})},
   encounters:{enemyCount:Number.isInteger(c.enemies)&&c.enemies>0?c.enemies:null,
    archetype:combat?(c.enemyArchetype||'default'):null,
    ...(enemy?{archetypeOrigin:enemy.origin}:{}),
    waves:Number.isInteger(c.waves)&&c.waves>0?c.waves:null,
    boss:c.boss==='yes'?true:c.boss==='no'?false:null},
   objective,
   missionSequence:{steps:combat?(c.missionSteps||[]):[],
    status:combat?(sequence?.status||(c.missionSteps?.length?'implementado':'nao_solicitado')):'nao_verificado',
    ...(sequence?{origin:sequence.origin}:{})},
   zoneEvents:combat?(c.zoneEvents||[]):[],
   checkpoint:{kind:combat?'between-stages':spec.genre==='platform'&&spec.dimension==='3d'?'platform':'unsupported',
    status:combat&&!spec.combatEconomy?.enabled?'implementado':'nao_verificado'},
   events:combat?c.events||[]:[],
   scriptedEvents:[],customTriggers:[],
   note:'Executa sequências tipadas e zonas cardeais no combate 3D. Diálogos e roteiro livre não são interpretados como lógica.'
  };
 });
 spec.stageConfig=configs.slice(0,stages.length);
 spec.stageSpecs=stageSpecs;
 return spec;
}
function report(spec){
 const stages=Array.isArray(spec?.stageSpecs)?spec.stageSpecs:[];
 const lines=['# GF-006 — Fases executáveis e lacunas','','Somente campos marcados implementados possuem contrato com o motor.',''];
 for(const s of stages){
  lines.push('## '+s.id+' — '+s.title,
   '- Cenário: '+(s.environment.layout||'padrão do motor')+' · Bioma: '+(s.environment.theme||'não especificado')+
   ' · Geometria: '+s.environment.layoutStatus,
   '- Vitória: '+s.objective.kind+' · Status: '+s.objective.status,
   '- Arquétipo: '+(s.encounters.archetype||'padrão do motor')+
   ' · Eventos tipados: '+(s.events?.map(e=>e.type+' após '+e.at+'s').join(', ')||'nenhum')+
   ' · Checkpoint: '+s.checkpoint.status,
   '- Missão encadeada: '+s.missionSequence.status+' · '+(s.missionSequence.steps.map(x=>x.label).join(' → ')||'padrão do motor'),
   '- Gatilhos de zona: '+(s.zoneEvents.map(x=>x.type+' em '+x.zone).join(', ')||'nenhum'),
   '- Inimigos definidos: '+(s.encounters.enemyCount??'procedural do motor')+
   ' · Ondas: '+(s.encounters.waves??'padrão do motor')+' · Chefe: '+
    (s.encounters.boss===null?'padrão do motor':s.encounters.boss?'sim':'não'),
   '- Origem: '+(s.source.map(x=>x.document+' linha '+x.line).join(', ')||'fase criada pelo motor'),
   '- Roteiros de eventos customizados: não implementados automaticamente','');
 }
 lines.push('**Limite técnico:** não confundir variação real de geometria/objetivos existentes com implementação integral do GDD.');
 return lines.join('\n')+'\n';
}
const api={compile,report,records,selectLayout,selectArchetype,timedEvents,projectIdentity,
 parseMissionStep,missionSequence,zoneEvents};
root.GameForgeStageSpec=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
