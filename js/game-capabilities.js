/* GF-004 — Contrato verificável de capacidades por gênero e dimensão.
 * Configuração em GAME_SPEC != mecânica inédita programada.
 * Esta matriz descreve apenas caminhos do runtime com cobertura da suíte.
 */
(function(root){
'use strict';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const dims=(genre,dim)=>genre+'-'+dim;
const support={
 'simulation-automation':{engines:['simulation-2d'],contract:'GAME_SPEC.simulation.automation + GameForgeSimulationRules.tick',test:'tests/simulation-automation.test.js',pattern:/automacao|automatic|automatizar|idle/},
 'simulation-walk':{engines:['simulation-2d'],contract:'GAME_SPEC.simulation.exploration + gameForgeSimulationBoot',test:'tests/simulation-exploration.test.js',pattern:/personagem andando|caminhar|andar|interagir|aproximar/},
 'simulation-free':{engines:['simulation-2d'],contract:'GAME_SPEC.simulation.exploration.mode=free + gameForgeExploration2DFactory',test:'tests/simulation-free-movement.test.js',pattern:/exploracao livre|movimentacao livre|andar livremente|caminhar livremente|wasd/},
 'simulation-save':{engines:['simulation-2d'],contract:'GAME_SPEC.simulation.persistence + GameForgeSimulationRules.persistence',test:'tests/simulation-save.test.js',pattern:/salvar|salvamento|save|continuar|guardar progresso/},
 'aquarium-care':{engines:['simulation-2d'],contract:'GAME_SPEC.simulation.aquariumCare + GameForgeSimulationRules',test:'tests/aquarium-care.test.js',pattern:/aquario|peixe|fome|alimentar|crescer|agua/},
 'visual-profile':{all:true,contract:'GAME_SPEC.renderProfile + gameForgeGraphicsFactory',test:'tests/graphics.test.js',pattern:/pixel|cartoon|low.?poly|ilustrad|realista|qualidade|sombras|particulas|por do sol/},
 'simulation-cycle':{engines:['simulation-2d'],contract:'GAME_SPEC.simulation + gameForgeSimulationRulesFactory',test:'tests/simulation.test.js',pattern:/aquario|fazenda|loja|plantar|vender|estoque/},
 'stage-count':{all:true,contract:'GAME_SPEC.stages',test:'tests/intent-compiler.test.js',pattern:/\b(fases|missoes|niveis|levels)\b/},
 'waves':{engines:['shooter-3d','tower-defense-2d','lane-defense-2d','block-td-2d'],contract:'GAME_SPEC.stageConfig[].waves',test:'tests/intent-compiler.test.js',pattern:/\b(onda|wave)/},
 'enemies':{engines:['arena-2d','arena-3d','shooter-2d','fps-3d','rpg-2d','rpg-3d','platform-2d','racing-3d'],contract:'GAME_SPEC.stageConfig[].enemies',test:'tests/intent-compiler.test.js',pattern:/\b(inimigo|adversario|monstro)/},
 'laps':{engines:['racing-3d'],contract:'GAME_SPEC.stageConfig[].laps',test:'tests/intent-compiler.test.js',pattern:/\b(voltas?)\b/},
 'boss':{engines:['arena-2d','arena-3d','shooter-2d','shooter-3d','fps-3d','rpg-2d','rpg-3d'],contract:'GAME_SPEC.stageConfig[].boss',test:'tests/intent-compiler.test.js',pattern:/\b(chefe|chefao|boss)/},
 'mission':{engines:['arena-3d','fps-3d','rpg-3d'],contract:'R.missionReady() e GAME_SPEC.stageConfig[].mission',test:'tests/mission-objectives.test.js',pattern:/\b(sobreviv|resistir|coletar|recolher|eliminar|derrotar|matar)/},
 'objective-label':{engines:['arena-3d','fps-3d','rpg-3d','platform-3d','racing-3d','shooter-3d'],contract:'GAME_SPEC.stageConfig[].objective (somente texto HUD)',test:'tests/campaign-editor.test.js',pattern:/\b(objetivo|meta|missao principal)\s*:/},
 'theme-stage':{engines:['arena-3d','fps-3d','rpg-3d','platform-3d','racing-3d','shooter-3d'],contract:'GAME_SPEC.stageConfig[].theme',test:'tests/intent-evolution.test.js',pattern:/\b(cenario|tema|ambiente|visual|floresta|neon|deserto|ruinas)\b/},
 'theme':{engines:['arena-3d','fps-3d','rpg-3d','platform-3d','racing-3d','shooter-3d','shooter-2d'],contract:'GAME_SPEC.worldOptions.theme',test:'tests/intent-compiler.test.js',pattern:/\b(cenario|tema|ambiente|visual|floresta|neon|deserto|ruinas)\b/},
 'difficulty':{all:true,contract:'GAME_SPEC.tuning.difficulty',test:'tests/intent-evolution.test.js',pattern:/\b(dificuldade|dificil|facil|hardcore)/},
 'speed':{engines:['arena-2d','arena-3d','shooter-2d','shooter-3d','fps-3d','rpg-2d','rpg-3d','platform-2d','platform-3d','racing-2d','racing-3d'],contract:'GAME_SPEC.tuning.playerSpeedMultiplier',test:'tests/intent-compiler.test.js',pattern:/\b(velocidade|mais rapida|mais rapido|mais lento)/},
 'fire':{engines:['arena-2d','arena-3d','shooter-2d','shooter-3d','fps-3d','rpg-2d','rpg-3d'],contract:'GAME_SPEC.tuning.fireRateMultiplier',test:'tests/intent-compiler.test.js',pattern:/\b(tiros|disparos|cadencia)/},
 'combat-store':{engines:['fps-3d'],contract:'gameForgeCombatEconomyFactory + GAME_SPEC.combatEconomy.enabled',test:'tests/combat-economy.test.js',pattern:/\b(loja|comprar|kit medico|municao|melhoria de arma)/},
 'combat-store-prices':{engines:['fps-3d'],contract:'GAME_SPEC.combatEconomy.prices',test:'tests/combat-economy.test.js',pattern:/\b(preco|custa|custo|valor|creditos)/}
};
const alias={
 'boss-only-last':'boss','boss-last':'boss','boss-all':'boss','boss-off':'boss','boss-stage':'boss',
 'combat-store-off':'combat-store','skill-tree':'skill-tree','craft':'craft','dialog':'dialog',
 'stealth':'stealth','network':'network','physics':'physics','animated-assets':'animated-assets',
 'procedural-world':'procedural-world','complex-ai':'complex-ai','story':'story',
 'skills':'skill-tree','inventory-3d':'inventory-3d'
};
const unimplemented={
 'skill-tree':/arvore de habilidades?|skill tree|pontos? de habilidade|skill points/,
 'craft':/crafting|fabricar|fabricacao/,
 'dialog':/dialogo|conversa com npc/,
 'stealth':/furtividade|stealth/,
 'network':/multiplayer|multijogador/,
 'physics':/fisica realista|destruicao|destrutivel/,
 'animated-assets':/glb animad|personagem animad|rig/,
 'procedural-world':/mundo infinito|terreno infinito/,
 'complex-ai':/inimigos? inteligentes?|ia de inimigos?|comportamento tatico/,
 'story':/cutscenes?|cena cinematica|historia ramificada/,
 'inventory-3d':/inventario|mochila|equipamento/
};
const physicalEngine=(spec)=>dims(spec.genre,spec.dimension);
const normalizeId=id=>alias[id]||id;
function capability(id,spec){
 const key=normalizeId(id),definition=support[key];
 if(!definition)return {id:key,allowed:false,implemented:false,reason:'Sem contrato executável catalogado para este requisito.'};
 const allowed=!!(definition.all||definition.engines.includes(physicalEngine(spec)));
 return {id:key,allowed,implemented:['combat-store','simulation-cycle','aquarium-care','simulation-save','simulation-automation','simulation-walk','simulation-free'].includes(key),contract:definition.contract,test:definition.test,
   reason:allowed?'Mecânica do motor identificada; verificar GAME_SPEC e testes.':'O motor '+physicalEngine(spec)+' não implementa este parâmetro.'};
}
function provenance(item,source,command){
 const detail=String(item.detail||'');
 const linked=/\b(GDD|Comando)\s+linha\s+(\d+)\b/i.exec(detail);
 const sources=[{kind:'GDD',value:String(source||'')},{kind:'Comando',value:String(command||'')}];
 if(linked){
  const selected=sources.find(x=>x.kind.toLowerCase()===linked[1].toLowerCase());
  const line=Number(linked[2]),lines=selected?.value.split(/\r?\n/)||[];
  if(line>0&&line<=lines.length)
   return {document:selected.kind,line,excerpt:lines[line-1].trim().slice(0,160)};
 }
 const def=support[normalizeId(item.id)]?.pattern||unimplemented[normalizeId(item.id)];
 // Busca apenas linhas relevantes, sem serializar o GDD inteiro nem o contexto pessoal.
 if(def){
  for(const selected of [sources[1],sources[0]]){
   const lines=selected.value.split(/\r?\n/);
   for(let i=0;i<lines.length;i++){
    if(lines[i].length>2100)continue;
    if(def.test(norm(lines[i])))return {document:selected.kind,line:i+1,excerpt:lines[i].trim().slice(0,160)};
   }
  }
 }
 const origin=String(item.where||'');
 const m=/^(GDD|Comando)$/.exec(origin);
 return {document:m?.[1]||'Não localizada',line:null,excerpt:''};
}
function audit(spec,gdd='',instruction=''){
 if(!spec||!spec.implementation)throw Error('GAME_SPEC com interpretação é obrigatório.');
 const applied=spec.implementation.applied||[],pending=spec.implementation.pending||[];
 const items=[],keys=new Map();const counts={implementada:0,configurada:0,pendente:0,incompativel:0};
 const classify=(entry,kind)=>{
  const cap=capability(entry.id,spec);
  // "Pendente" não é promovido só porque há uma capacidade com nome semelhante.
  const status=kind==='pending'?(cap.contract&&!cap.allowed?'incompativel':'pendente'):
    !cap.allowed?'incompativel':cap.implemented&&['combat-store','simulation-cycle','aquarium-care','simulation-save','simulation-automation','simulation-walk','simulation-free'].includes(entry.id)?'implementada':'configurada';
  const where=String(entry.where||'Jogo inteiro');
  const origin=provenance(entry,gdd,instruction);
  const reason=status==='implementada'?'Módulo funcional existente no runtime com teste automatizado.':
   status==='configurada'?'Valor de GAME_SPEC definido; não equivale a novo módulo programado.':
   status==='incompativel'?cap.reason:'Requisito sem lógica executável demonstrada para este pedido.';
  const record={id:String(entry.id),capability:cap.id,status,description:String(entry.description).slice(0,260),
    where,origin,contract:cap.allowed?cap.contract||null:null,test:cap.allowed?cap.test||null:null,reason};
  const unique=cap.id+'|'+where+'|'+kind;
  // Última configuração prevalece quando instruções posteriores sobrescrevem o GDD.
  if(keys.has(unique)){const index=keys.get(unique);counts[items[index].status]--;items[index]=record;}
  else if(items.length<120){keys.set(unique,items.length);items.push(record);}else return;
  counts[status]++;
 };
 applied.forEach(item=>classify(item,'applied'));
 pending.forEach(item=>classify(item,'pending'));
 const summary=Object.entries(counts).map(([status,count])=>status+': '+count).join(' · ');
 return {version:1,engine:physicalEngine(spec),items,counts,summary,
  note:'Configuração no GAME_SPEC não é prova de mecânica inédita. Só módulos com código e teste são chamados implementados.'};
}
function check(spec){
 const errors=[];
 if(!spec||typeof spec!=='object')return ['GAME_SPEC não é objeto.'];
 const engine=physicalEngine(spec),stages=spec.stages||[];
 if(spec.genre==='simulation'){
  const c=spec.simulation;
  if(spec.dimension!=='2d'||!c||!['farm','aquarium','shop'].includes(c.domain))errors.push('Contrato de simulação 2D ausente ou inválido.');
  else for(const [key,min,max] of [['slots',1,12],['startingMoney',1,9999],['target',10,99999],['seconds',2,300],['cost',1,500],['price',1,2000]]){
   if(!Number.isFinite(c[key])||c[key]<min||c[key]>max||(key==='slots'&&!Number.isInteger(c[key])))errors.push('Simulação: '+key+' fora do limite.');
  }
 }

 if(!Array.isArray(stages)||stages.length<1||stages.length>(spec.genre==='lane-defense'?40:30))
  errors.push('Número de fases fora do limite do motor.');
 const persistence=spec.simulation?.persistence;
 if(persistence&&(persistence.version!==1||typeof persistence.enabled!=='boolean'))errors.push('Salvamento de simulação inválido.');
 const exploration=spec.simulation?.exploration;
  if(exploration){
   if(engine!=='simulation-2d'||exploration.enabled!==true||!Number.isFinite(exploration.speed)||!Number.isFinite(exploration.reach))errors.push('Exploração de simulação inválida.');
   if(exploration.mode==='free'){
    if(exploration.version!==2||exploration.speed<70||exploration.speed>350||exploration.reach<15||exploration.reach>100||typeof exploration.guide!=='boolean')errors.push('Exploração livre fora dos limites.');
   }else if(exploration.version!==1||exploration.mode!==undefined)errors.push('Modo por estações inválido.');
  }
  const automation=spec.simulation?.automation;
 if(automation){
  if(engine!=='simulation-2d'||automation.version!==1||automation.enabled!==true||!Number.isFinite(automation.intervalSeconds)||automation.intervalSeconds<1||automation.intervalSeconds>60)errors.push('Automação de simulação inválida.');
  for(const key of ['start','care','finish','sell','clean'])if(typeof automation[key]!=='boolean')errors.push('Automação: '+key+' deve ser booleano.');
  if(!['start','care','finish','sell','clean'].some(k=>automation[k]===true))errors.push('Automação sem etapas ativas.');
  if(automation.sell&&spec.simulation.domain!=='farm'||automation.clean&&spec.simulation.domain!=='aquarium')errors.push('Automação incompatível com o domínio.');
 }
 const ac=spec.simulation?.aquariumCare;
 if(ac?.enabled){
  if(engine!=='simulation-2d'||spec.simulation.domain!=='aquarium')errors.push('Cuidados de aquário exigem simulação de aquário 2D.');
  for(const [key,min,max] of [['hungerSeconds',5,600],['waterSeconds',5,600],['juvenilePrice',1,2000],['youngPrice',1,2000]])if(!Number.isFinite(ac[key])||ac[key]<min||ac[key]>max)errors.push('Aquário: '+key+' fora do limite.');
  for(const key of ['hungerEnabled','feedingRequired','waterEnabled','sellYoung'])if(typeof ac[key]!=='boolean')errors.push('Aquário: '+key+' deve ser booleano.');
  if(ac.juvenilePrice>ac.youngPrice||ac.youngPrice>spec.simulation.price)errors.push('Preços do aquário devem crescer com a idade.');
 }
 if(Array.isArray(spec.stageConfig))spec.stageConfig.forEach((s,i)=>{
  if(!s||typeof s!=='object')return;
  for(const [key,value] of Object.entries(s)){
   const id=({waves:'waves',enemies:'enemies',laps:'laps',boss:'boss',mission:'mission',theme:'theme-stage',objective:'objective-label'})[key];
   if(!id)continue;
   if(!capability(id,spec).allowed && value!==undefined&&value!==null&&value!=='auto'&&value!=='default'&&value!==0&&value!=='')
    errors.push('Fase '+(i+1)+': '+key+' incompatível com '+engine+'.');
   if(['waves','enemies','laps'].includes(key)&&(!Number.isInteger(value)||value<0||value>100))
    errors.push('Fase '+(i+1)+': '+key+' fora do limite numérico.');
   if(key==='mission'&&!['default','eliminate','collect','survive'].includes(value))
    errors.push('Fase '+(i+1)+': modo de missão inválido.');
  }
 });
 if(spec.combatEconomy?.enabled&&!capability('combat-store',spec).allowed)
  errors.push('Loja de combate disponível somente no FPS 3D.');
 return errors.slice(0,25);
}
function report(spec){
 const a=spec?.implementation?.audit;
 if(!a)return '# Auditoria de capacidades\n\nNenhum contrato compilado.\n';
 const lines=['# Contrato executável do GameForge','',
  'Motor: '+a.engine,'','Resumo: '+a.summary,'',
  '| Estado | Solicitação | Fonte | Evidência | Motivo |',
  '|---|---|---|---|---|'];
 for(const e of a.items){
  const safe=s=>String(s||'—').replace(/[\r\n|]/g,' ').slice(0,210);
  const position=e.origin.document+(e.origin.line?':'+e.origin.line:'');
  lines.push('| '+safe(e.status)+' | '+safe(e.description)+' | '+safe(position)+' | '+safe(e.contract||e.test)+' | '+safe(e.reason)+' |');
 }
 lines.push('','**Nota:** '+a.note);
 return lines.join('\n')+'\n';
}
const api={capability,audit,check,report,support};
root.GameForgeCapabilities=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
