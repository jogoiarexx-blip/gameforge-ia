/* GF-003/004 — Game Design IR v1: traça intenções concretas e proibições.
 * Não gera código arbitrário nem confunde termo detectado com módulo executável.
 */
(function(root){
'use strict';
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const patterns=Object.freeze([
 {id:'shooting',label:'Tiros e armas',pattern:/\b(tiros?|tiroteios?|atirar|disparar|pistolas?|fuzis?|municao|armas? de fogo)\b/,engines:['fps-3d','urban-action-3d','arena-2d','arena-3d','shooter-2d','shooter-3d'],partial:['urban-action-3d']},
 {id:'driving',label:'Veículos dirigíveis',pattern:/\b(dirigir|pilot(?:ar|agem)|entrar em carros?|conduzir|carros?|veiculos?|caminhoes?|carros? dirigiveis|caminhoes? dirigiveis)\b/,engines:['racing-3d','racing-2d']},
 {id:'police',label:'Polícia e nível de procurado',pattern:/\b(policia|viaturas?|estrelas? de procurad[oa]|perseguicao policial)\b/,engines:[]},
 {id:'business',label:'Conquistar ou administrar negócios',pattern:/\b(negocios?|estabelecimentos?|empresas?|propriedades|lojas? comerciais?)\b/,engines:['urban-action-3d'],partial:['urban-action-3d']},
 {id:'territories',label:'Territórios conquistáveis',pattern:/\b(territorios?|distritos?|dominar bairros?|recaptura)\b/,engines:[]},
 {id:'interiors',label:'Interiores acessíveis',pattern:/\b(interiores?|entrar em predios?|entrar em lojas?|entrar em casas?)\b/,engines:[]},
 {id:'stealth',label:'Furtividade e esconder-se',pattern:/\b(furtividade|stealth|esconder(?:-se)?|escondid[oa]s?|se esconder|nao ser visto)\b/,engines:[]},
 {id:'dialogue',label:'Diálogos interativos',pattern:/\b(dialogos?|conversar com npcs?|falar com npcs?|falas? ramificadas)\b/,engines:[]},
 {id:'quests',label:'Missões/quests roteirizadas',pattern:/\b(quests?|missoes? com escolhas|missoes? de historia|campanha roteirizada)\b/,engines:[]},
 {id:'skill-tree',label:'Árvore de habilidades',pattern:/\b(arvore de habilidades?|skill tree|habilidades? permanentes?|pontos? de habilidade|evolu(?:cao|ir|ir as) habilidades?|melhorar habilidades?)\b/,engines:[]},
 {id:'craft',label:'Fabricação de itens',pattern:/\b(crafting|fabricar itens?|fabricar armas?|sistema de fabricacao)\b/,engines:[]},
 {id:'farming',label:'Plantar, colher e gerir fazenda',pattern:/\b(fazenda|plantar|colheita|cultivar|agricultura)\b/,engines:[]},
 {id:'sailing',label:'Navegação de barcos',pattern:/\b(navegar barcos?|navegar no mar|dirigir barcos?|pilot(?:ar)? navios?|navios? dirigiveis|batalhas? navais?|barcos?|navios?|piratas?)\b/,engines:[]},
 {id:'inventory-3d',label:'Inventário de itens 3D',pattern:/\b(inventario|mochila|guardar itens?)\b/,engines:['rpg-2d'],partial:['rpg-2d']},
 {id:'animated-assets',label:'Personagens GLB animados',pattern:/\b(glb animad|personagem animad|animationmixer|esqueleto glb)\b/,engines:[]}
]);
const restrictions=Object.freeze([
 {id:'no-shooting',label:'Sem tiros ou armas',pattern:/\b(sem (?:armas?|tiros?|combate|tiroteios?)|nao (?:quero|pode|deve|ter) (?:ter )?(?:tiros?|armas?|combate|atirar)|proibid[oa]s? (?:tiros?|armas?)|sem poder atirar)\b/,
  conflicts:['fps-3d','urban-action-3d','shooter-2d','shooter-3d','arena-2d','arena-3d']},
 {id:'no-multiplayer',label:'Sem multiplayer',pattern:/\b(sem multiplayer|nao quero multiplayer|sem modo online|somente single.player)\b/,conflicts:[]},
 {id:'no-crafting',label:'Sem fabricação de itens',pattern:/\b(sem crafting|sem fabricacao|nao quero crafting)\b/,conflicts:[]},
 {id:'no-3d',label:'Sem motor 3D',pattern:/\b(sem 3d|nao usar 3d|nao quero 3d|evitar 3d)\b/,conflicts:['fps-3d','arena-3d','urban-action-3d','shooter-3d','rpg-3d','platform-3d','racing-3d']}
]);
function entries(gdd,command){
 const source=[{type:'GDD',content:String(gdd||'')},{type:'Comando',content:String(command||'')}];
 const rows=[];
 for(const part of source){
  const lines=part.content.split(/\r?\n/);
  for(let i=0;i<Math.min(lines.length,24000);i++){
   const text=lines[i].trim();if(!text||text.length>2200)continue;
   rows.push({text,normal:normalize(text),origin:{document:part.type,line:i+1,excerpt:text.slice(0,160)}});
  }
 }
 return rows;
}
function inspect(spec,gdd='',command=''){
 const engine=spec.genre+'-'+spec.dimension;
 const rows=entries(gdd,command),requirements=[],constraints=[],blocked=[];
 const seen=new Set();
 for(const rule of patterns){
  let origin=null;
  for(const row of rows){
   const match=rule.pattern.exec(row.normal);
   if(!match)continue;
   const before=row.normal.slice(Math.max(0,match.index-60),match.index);
   // Restrições não viram requisitos positivos, nem campos do motor.
   if(/\b(sem|nao quero|nao usar|proibid[ao]|evitar|fora de escopo)\b.{0,48}$/.test(before))continue;
   origin=row.origin;
  }
  if(!origin)continue;
  const available=rule.engines.includes(engine),partial=rule.partial?.includes(engine);
  requirements.push({id:rule.id,label:rule.label,status:available?(partial?'parcial':'suportado'):'pendente',
    origin,contract:available?(partial?'Módulo parcial de '+engine:'Motor de '+engine):null});
  seen.add(rule.id);
 }
 for(const rule of restrictions){
  let found=null;
  for(const row of rows)if(rule.pattern.test(row.normal))found=row.origin;
  if(!found)continue;
  const incompatible=rule.conflicts.includes(engine);
  const item={id:rule.id,label:rule.label,status:incompatible?'incompativel':'respeitada',origin:found,
    reason:incompatible?'O motor '+engine+' contém esta mecânica obrigatória; não pode ignorar a proibição.':'Restrição explicitamente registrada.'};
  constraints.push(item);
  if(incompatible)blocked.push(item);
 }
 const counts={suportado:0,parcial:0,pendente:0,incompativel:blocked.length};
 requirements.forEach(r=>counts[r.status]++);
 return {version:1,engine,requirements,constraints,blocked,counts,
  warning:blocked.length?'Regras proibitivas incompatíveis com o motor: '+blocked.map(x=>x.label).join(', ')+'. Alterar o motor ou implementar versão compatível.':'',
  note:'Requisitos pendentes e implementações parciais não são apresentados como mecânicas prontas.'};
}
function report(ir){
 if(!ir)return '# Leitura de requisitos\n\nNenhum contrato disponível.\n';
 const origin=x=>x?.line?x.document+' linha '+x.line:'Não localizada';
 const rows=['# Game Design IR — interpretação de mecânicas', '',
  'Motor: '+ir.engine,'',
  'Requisitos: '+ir.requirements.length+' · Restrições: '+ir.constraints.length+' · Bloqueios: '+ir.blocked.length,
  '','## Mecânicas identificadas',''];
 for(const req of ir.requirements)
  rows.push('- **'+req.status+'** — '+req.label+' ('+origin(req.origin)+')'+(req.contract?' · '+req.contract:''));
 if(!ir.requirements.length)rows.push('- Nenhuma mecânica especial identificada.');
 rows.push('','## Restrições explícitas','');
 for(const restriction of ir.constraints)rows.push('- **'+restriction.status+'** — '+restriction.label+' ('+origin(restriction.origin)+'): '+restriction.reason);
 if(!ir.constraints.length)rows.push('- Nenhuma restrição identificada.');
 rows.push('','**Limites:** '+ir.note);
 return rows.join('\n')+'\n';
}
function enrich(spec,gdd='',command=''){
 if(!spec||typeof spec!=='object')throw Error('GameSpec obrigatório.');
 const ir=inspect(spec,gdd,command);
 spec.designIR=ir;
 if(!spec.implementation)spec.implementation={applied:[],pending:[],warnings:[]};
 const p=spec.implementation;
 for(const req of ir.requirements.filter(x=>x.status==='pendente')){
  if(p.applied.some(x=>x.id===req.id)||p.pending.some(x=>x.id===req.id))continue;
  p.pending.push({id:req.id,description:req.label+' — exige código específico',where:'Jogo inteiro',
    detail:req.origin.document+' linha '+req.origin.line});
 }
 if(ir.warning){
  spec.limitations=Array.isArray(spec.limitations)?spec.limitations:[];
  if(!spec.limitations.includes(ir.warning))spec.limitations.unshift(ir.warning);
  p.warnings=p.warnings||[];
  if(!p.warnings.includes(ir.warning))p.warnings.push(ir.warning);
 }
 // Auditoria de projeto urbano tem contratos próprios; preservá-los em vez de
 // reclassificar recursos parciais como implementações completas.
 const cap=root.GameForgeCapabilities||(typeof require==='function'?require('./game-capabilities'):null);
 if(cap&&spec.genre!=='urban-action')p.audit=cap.audit(spec,gdd,command);
 else if(p.audit){
  const a=p.audit;
  for(const req of ir.requirements.filter(x=>x.status==='pendente')){
   if(a.items.some(x=>x.id===req.id))continue;
   a.items.push({id:req.id,status:'pendente',description:req.label,origin:req.origin,contract:null,
    reason:'Não está programado no protótipo.'});
   a.counts.pendente++;
  }
 }
 if(p.audit){
  for(const block of ir.blocked){
   p.audit.items.push({id:block.id,status:'incompativel',description:block.label,origin:block.origin,
    contract:null,reason:block.reason});
   p.audit.counts.incompativel++;
  }
  p.audit.summary=Object.entries(p.audit.counts).map(([k,v])=>k+': '+v).join(' · ');
 }
 p.summary=p.applied.length+' configuração(ões) aplicadas; '+p.pending.length+' requisito(s) pendente(s)'+
   (ir.blocked.length?'; '+ir.blocked.length+' restrição(ões) incompatíveis':'');
 return spec;
}
const api={patterns,restrictions,inspect,enrich,report};
root.GameForgeDesignIR=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
