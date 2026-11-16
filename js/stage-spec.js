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
 const combat=spec.dimension==='3d'&&COMBAT_3D.has(spec.genre);
 const stageSpecs=stages.map((name,index)=>{
  const rows=source.filter(x=>x.stage===index);
  const layout=selectLayout(rows);
  const c=configs[index]||{};
  if(combat&&layout)c.layout=layout.id;
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
    waves:Number.isInteger(c.waves)&&c.waves>0?c.waves:null,
    boss:c.boss==='yes'?true:c.boss==='no'?false:null},
   objective,checkpoint:{kind:spec.genre==='platform'&&spec.dimension==='3d'?'platform':'between-stages',
    status:spec.dimension==='3d'?'parcial':'nao_verificado'},
   scriptedEvents:[],customTriggers:[],
   note:'StageSpec representa apenas contratos do runtime. Diálogos, eventos e encontros livres não são criados por texto.'
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
   '- Inimigos definidos: '+(s.encounters.enemyCount??'procedural do motor')+
   ' · Ondas: '+(s.encounters.waves??'padrão do motor')+' · Chefe: '+
    (s.encounters.boss===null?'padrão do motor':s.encounters.boss?'sim':'não'),
   '- Origem: '+(s.source.map(x=>x.document+' linha '+x.line).join(', ')||'fase criada pelo motor'),
   '- Roteiros de eventos customizados: não implementados automaticamente','');
 }
 lines.push('**Limite técnico:** não confundir variação real de geometria/objetivos existentes com implementação integral do GDD.');
 return lines.join('\n')+'\n';
}
const api={compile,report,records,selectLayout};
root.GameForgeStageSpec=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
