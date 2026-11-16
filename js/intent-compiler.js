/* Compilador de instrucoes GameForge: texto em PT-BR -> configuracao EXECUTAVEL do motor.
 * Nunca gera JavaScript arbitrario a partir do texto; identifica somente contratos suportados.
 * Funciona offline; requisitos nao cobertos permanecem explicitamente pendentes.
 */
(function(root){
'use strict';
// Normalizações conservadoras para comandos leigos; o GDD original nunca é alterado.
// Não transformamos palavras genéricas (ex. "carro") em gêneros sem evidência.
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/\b([23])\s+d\b/g,'$1d')
 .replace(/\b(?:qro|keru)\b/g,'quero')
 .replace(/\bn\s+(?=quero|usar|ter|colocar|coloca|pode|precisa)\b/g,'nao ')
 .replace(/\b(?:navezinha|navezinha|navina)\b/g,'navinha')
 .replace(/\b(?:platafoma|platafomra)\b/g,'plataforma')
 .replace(/\b(?:corrda|corida)\b/g,'corrida')
 .replace(/\b(?:primera|prmeira)\s+pessoa\b/g,'primeira pessoa')
 .replace(/\b(?:inimigu|inimigus)\b/g,'inimigos')
 .replace(/\b(?:shefe|xefe)\b/g,'chefe')
 .replace(/\btreis\b/g,'tres')
 .replace(/\btorre\s+defen[cs]e\b/g,'tower defense')
 .replace(/\bdefesa\s+por\s+linha\b/g,'defesa por linhas');
const capabilities=root.GameForgeCapabilities||(typeof require==='function'?require('./game-capabilities'):null);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const words={um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10,quinze:15,vinte:20,trinta:30};
const DIG='(?:\\d{1,3}|uma?|duas?|dois|tres|quatro|cinco|seis|sete|oito|nove|dez|quinze|vinte|trinta)';
function number(value){const n=Number(value);return Number.isFinite(n)?Math.trunc(n):words[normalize(value)]||null;}
function quantity(text,noun){
 const t=normalize(text),n=noun;
 const before=new RegExp('\\b('+DIG+')\\s+(?:\\w+\\s+){0,2}(?:'+n+')\\b','i').exec(t);
 const after=new RegExp('\\b(?:'+n+')\\s*(?:[:=]|de|com|por fase|em cada fase|no total)\\s*('+DIG+')\\b','i').exec(t);
 return number(before?.[1]||after?.[1]);
}
function briefFromCommand(instruction){
 const value=String(instruction||'').trim();
 if(!value)throw Error('Escreva uma ideia ou carregue um GDD para criar o jogo.');
 const title=(/(?:chamad[oa]|nomead[oa]|titulo|título)\s*[:=]?\s*["“']([^"”']{3,75})["”']/i.exec(value)||[])[1];
 const t=normalize(value);
 const guessed=/navinha|nave espacial|shoot.?em.?up/.test(t)?'Jogo de Nave':
  /primeira pessoa|\bfps\b/.test(t)?'FPS de Ação':
  /corrida|carros?|velocidade/.test(t)?'Jogo de Corrida':
  /\brpg\b/.test(t)?'RPG de Aventura':
  /plataforma|platformer/.test(t)?'Jogo de Plataforma':'Novo Jogo';
 const dim=/\b3d\b|tres dimensoes/.test(t)?' 3D':/\b2d\b/.test(t)?' 2D':'';
 const clean=(title||guessed+dim).replace(/[<>]/g,'').slice(0,85);
 return '# '+clean+'\n\n## Ideia original\n'+value+'\n';
}
function stageIndex(text){
 const m=/\b(?:fase|missao|level|stage|etapa)\s*(\d{1,2})\b/.exec(normalize(text));
 return m?Number(m[1])-1:null;
}
function requirements(text,origin){
 // Dividir por linhas preserva escopo de titulos: informacoes de fase nao vazam para outras fases.
 const lines=String(text||'').split(/\r?\n/),result=[],global=[];
 let current=null,scope=null;
 for(let i=0;i<lines.length;i++){
  const raw=lines[i].trim();if(!raw)continue;
  const line=normalize(raw);
  const heading=/^#{1,6}\s+/.test(raw);
  const inline=stageIndex(line);
  if(heading){
   current=inline;scope=inline!==null?'stage':'section';
  } else if(inline!==null&&(/^[-*+]\s*/.test(raw)||/^(?:fase|missao|level|stage|etapa)\b/.test(line))){
   current=inline;scope='stage';
  }
  if(raw.length>2200)continue;
  const record={text:raw,normal:line,origin,line:i+1,stage:inline!==null?inline:(scope==='stage'?current:null)};
  result.push(record);
 }
 return result;
}
function compile(spec,gdd,instruction='',options={}){
 if(!spec||typeof spec!=='object')throw Error('GameSpec ausente.');
 const source=String(gdd||''),extra=String(instruction||'');
 const active=source.trim()?source:extra;
 const sections=[...requirements(source,'GDD'),...requirements(extra,'Comando')];
 const parsed=spec;
 const implementation={version:1,source:source.trim()?(extra.trim()?'gdd+comando':'gdd'):'comando',
   applied:[],pending:[],warnings:[],requirements:[],summary:''};
 const recognized=new Map();
 const push=(status,id,description,where,detail='')=>{
  const key=id+'|'+where+'|'+status;
  if(recognized.has(key)){
    // O comando recente substitui a explicacao do GDD antigo, assim como a configuracao.
    Object.assign(recognized.get(key),{description,detail});
    return;
  }
  if(implementation[status].length>=100){
    if(!implementation.warnings.includes('Muitas regras encontradas: exibindo as primeiras 100 por categoria.'))
      implementation.warnings.push('Muitas regras encontradas: exibindo as primeiras 100 por categoria.');
    return;
  }
  const record={id,description,where,detail};
  recognized.set(key,record);
  implementation[status].push(record);
 };
 const warn=(text)=>{if(!implementation.warnings.includes(text))implementation.warnings.push(text);};
 const supports=(genres,dims)=>genres.includes(spec.genre)&&(!dims||dims.includes(spec.dimension));
 const limit=spec.genre==='lane-defense'?40:30;
 const stages=Array.isArray(spec.stages)?spec.stages:[];
 if(!stages.length)stages.push('Fase 1 — Início');
 // Uma quantidade de fases em comando novo prevalece sobre titulos antigos do GDD.
 const counts=[...sections].filter(r=>r.origin==='Comando').concat(sections.filter(r=>r.origin==='GDD'));
 const countLine=counts.find(r=>/\b(?:\d{1,3}|uma?|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|quinze|vinte|trinta)\s+(?:fases|missoes|niveis|levels)\b/.test(r.normal)
    ||/\b(?:fases|missoes|niveis)\s*(?:[:=]|de|com)\s*(?:\d{1,3}|uma?|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|quinze|vinte|trinta)/.test(r.normal));
 const requested=countLine?quantity(countLine.normal,'fases|missoes|niveis|levels'):null;
 if(requested!==null){
  const target=clamp(requested,1,limit);
  if(requested>limit)warn('Foram solicitadas '+requested+' fases; o motor limita a '+limit+'.');
  if(stages.length!==target){
   if(countLine.origin==='Comando'&&source.trim()&&spec.sourceConflict){
    // Nao reutilizar historia/nomes de um GDD de outro genero para um novo jogo.
    parsed.stages=Array.from({length:target},(_,i)=>'Fase '+(i+1));
   }else{
    parsed.stages=Array.from({length:target},(_,i)=>stages[i]||'Fase '+(i+1));
   }
  }
  push('applied','stage-count','Campanha configurada com '+target+' fase(s)',countLine.origin);
 }
 const count=parsed.stages.length;
 const stageConfig=Array.isArray(parsed.stageConfig)?parsed.stageConfig.slice(0,count):[];
 for(let i=0;i<count;i++)stageConfig[i]={...(stageConfig[i]||{})};
 const configure=(index,field,value,id,desc,origin)=>{
  const targets=index===null?Array.from({length:count},(_,i)=>i):index>=0&&index<count?[index]:[];
  if(!targets.length){warn('Regra '+desc+' menciona fase inexistente.');return;}
  for(const i of targets)stageConfig[i][field]=value;
  push('applied',id,desc,index===null?'Todas as fases':'Fase '+(index+1),origin);
 };
 const combined=normalize(active+'\n'+extra);
 // Ajustes de motor com efeito real no GAME_SPEC serializado.
 const tuning={...parsed.tuning};
 const changeTuning=(field,value,id,description)=>{
  tuning[field]=value;push('applied',id,description,'Jogo inteiro');
 };
 if(/\b(mais dificil|dificuldade (alta|elevada)|hardcore|inimigos? mais (fortes?|resistentes?))\b/.test(combined))
  changeTuning('difficulty',1.4,'difficulty','Dificuldade ampliada no motor');
 else if(/\b(mais facil|dificuldade (baixa|facil)|inimigos? mais fracos?)\b/.test(combined))
  changeTuning('difficulty',.8,'difficulty','Dificuldade reduzida no motor');
 if(/\b(nave|jogador|personagem|carro|veiculo)\b.{0,22}\b(mais rapid[oa]|mais veloz)\b|\baument(?:ar|e)\b.{0,20}\bvelocidade\b/.test(combined)){
  if(!capabilities||capabilities.capability('speed',spec).allowed)changeTuning('playerSpeedMultiplier',1.25,'speed','Velocidade do jogador aumentada');
  else push('pending','speed','Velocidade do jogador não configurável neste motor','Jogo inteiro');
 }else if(/\b(nave|jogador|personagem|carro)\b.{0,20}\bmais lent[oa]\b/.test(combined)){
  if(!capabilities||capabilities.capability('speed',spec).allowed)changeTuning('playerSpeedMultiplier',.8,'speed','Velocidade do jogador reduzida');
  else push('pending','speed','Velocidade do jogador não configurável neste motor','Jogo inteiro');
 }
 if(/\b(tiros?|disparos?|cadencia)\b.{0,20}\b(mais rapid|mais veloz|maior|aument)/.test(combined)&&supports(['shooter','fps','rpg','arena']))
  changeTuning('fireRateMultiplier',1.3,'fire','Cadência dos disparos aumentada');
 if(Object.keys(tuning).length)parsed.tuning=tuning;
 // Temas de ambiente, com precedencia do pedido mais recente quando houver.
 const themeRegex=/\b(neon|cyberpunk|cibernetic[oa]|deserto|desert|floresta|forest|ruinas|ruins)\b/;
 const themed=[...sections].reverse().find(r=>r.stage===null&&themeRegex.test(r.normal)&&/\b(grafico|ambiente|visual|cenario|tema|mundo|floresta|deserto|neon|ruinas)\b/.test(r.normal));
 if(themed){
  const t=themed.normal;
  const theme=/neon|cyberpunk|cibernetic/.test(t)?'neon':/deserto|desert/.test(t)?'desert':/ruinas|ruins/.test(t)?'ruins':'forest';
  if(spec.dimension==='3d'||spec.genre==='shooter'){
   parsed.worldOptions={...parsed.worldOptions,theme:spec.dimension==='3d'?theme:parsed.worldOptions?.theme};
   if(spec.genre==='shooter'&&spec.dimension==='2d')parsed.shooterOptions={...parsed.shooterOptions,theme:theme==='neon'?'neon':theme==='forest'?'dragon':'space'};
   push('applied','theme','Ambientação '+theme, 'Jogo inteiro',themed.origin);
  }
 }
 // Quantidades executaveis: fases, ondas, inimigos, voltas e chefes.
 const order=[...sections.filter(r=>r.origin==='GDD'),...sections.filter(r=>r.origin==='Comando')];
 for(const line of order){
  const t=line.normal,where=line.stage, origin=line.origin+' linha '+line.line;
  // Evitar pedidos negados: "nao quero inimigos" nao deve criar 10 inimigos.
  const negated=/\b(sem|nao quero|nenhum|nenhuma|remova|retire|elimine o sistema de)\b/.test(t);
  const wave=quantity(t,'ondas|waves');
  if(wave!==null&&/\b(onda|wave)/.test(t)){
   if(spec.genre==='shooter'&&spec.dimension==='3d'){
    const n=clamp(wave,2,6);configure(where,'waves',n,'waves','Configuração de '+n+' ondas',origin);
    if(wave!==n)warn('Ondas: pedido '+wave+', limite do shooter 3D entre 2 e 6.');
   }else if(spec.dimension==='2d'&&['tower-defense','lane-defense','block-td'].includes(spec.genre)){
    const n=clamp(wave,1,12);configure(where,'waves',n,'waves','Defesa com '+n+' ondas',origin);
    if(wave!==n)warn('Ondas limitadas a 12 neste motor.');
   }else push('pending','waves','Número de ondas por fase não configurável neste motor',origin);
  }
  const enemies=quantity(t,'inimigos|adversarios|monstros');
  if(enemies!==null&&!negated){
   const allowed=spec.dimension==='3d'?['arena','fps','rpg','racing'].includes(spec.genre):
      ['arena','platform','shooter','rpg'].includes(spec.genre);
   const max=spec.dimension==='3d'?(spec.genre==='racing'?12:24):
      spec.genre==='shooter'?80:spec.genre==='platform'?45:spec.genre==='arena'?48:36;
   if(allowed){
    const n=clamp(enemies,1,max);configure(where,'enemies',n,'enemies','Quantidade de '+n+' inimigos',origin);
    if(enemies!==n)warn('Número de inimigos reduzido ao limite seguro de '+max+'.');
   }else push('pending','enemies','Quantidade de inimigos solicitada não controlável neste motor',origin);
  }
  const perStageTheme=where!==null&&/\b(neon|cyberpunk|deserto|desert|floresta|forest|ruinas|ruins)\b/.test(t)&&
    /\b(cenario|ambiente|visual|tema|neon|floresta|deserto|ruinas)\b/.test(t);
  if(perStageTheme&&spec.dimension==='3d'){
   const theme=/neon|cyberpunk/.test(t)?'neon':/deserto|desert/.test(t)?'desert':/ruinas|ruins/.test(t)?'ruins':'forest';
   configure(where,'theme',theme,'theme-stage','Tema '+theme+' para esta fase',origin);
  }
  const objective=/^(?:[-*+]\s*)?(?:objetivo|missao principal|meta)\s*:\s*(.{5,140})/i.exec(line.text);
  if(objective&&where!==null){
   const readable=objective[1].replace(/[<>]/g,'').trim().slice(0,140);
   if(spec.dimension==='3d')
    configure(where,'objective',readable,'objective-label','Texto do objetivo visível no HUD (não define vitória)',origin);
   else push('pending','objective-label','Texto de objetivo personalizado ainda não é suportado no HUD deste motor',origin);
  }
  const laps=quantity(t,'voltas');
  if(laps!==null){
   if(spec.genre==='racing'&&spec.dimension==='3d'){
    const n=clamp(laps,1,8);configure(where,'laps',n,'laps','Corrida com '+n+' volta(s)',origin);
    if(n!==laps)warn('Voltas limitadas a 8 por fase.');
   }else push('pending','laps','Contagem de voltas não é configurável neste estilo',origin);
  }
  const noBoss=/\b(sem|nenhum|nenhuma|retire|remover|nao quero)\b.{0,16}\b(chefe|chefao|boss)\b/.test(t);
  const onlyLast=/\b(chefe|chefao|boss)\b.{0,35}\b(somente|apenas|so)\b.{0,24}\b(ultima|final)\b|\b(somente|apenas|so)\b.{0,28}\b(ultima|final)\b.{0,24}\b(chefe|chefao|boss)\b/.test(t);
  const allBoss=/\b(chefes?|boss)\b.{0,24}\b(todas? (as )?fases|cada fase)\b|\b(cada|todas as)\b.{0,22}\b(chefe|boss)\b/.test(t);
  const bossMention=/\b(chefe|chefao|boss)\b/.test(t);
  const bossSupported=['shooter','arena','fps','rpg'].includes(spec.genre);
  if(bossMention&&(noBoss||onlyLast||allBoss||where!==null)){
   if(!bossSupported){push('pending','boss','Chefes solicitados sem suporte no motor',origin);continue;}
   if(onlyLast){configure(null,'boss','no','boss-only-last','Chefes desligados antes da última fase',origin);
     configure(count-1,'boss','yes','boss-last','Chefe ativado na última fase',origin);}
   else if(allBoss)configure(null,'boss','yes','boss-all','Chefe em cada fase',origin);
   else if(noBoss)configure(where,'boss','no','boss-off','Chefe desativado',origin);
   else if(where!==null)configure(where,'boss','yes','boss-stage','Chefe ativado',origin);
  }
  // Objetivos implementados de verdade no portal 3D arena/FPS/RPG, nao no shooter.
  if(where!==null||/\b(todas? as fases|cada fase)\b/.test(t)){
   const survive=/\b(sobreviv|resistir|aguenta)\w*/.test(t);
   const collect=/\b(coletar?|recolher|juntar)\b.*\b(cristais?|reliquias?)\b/.test(t);
   const eliminate=/\b(eliminar?|derrotar?|matar?)\b.*\b(todos?|inimigos?|guardioes?)\b/.test(t);
   const mode=survive?'survive':collect?'collect':eliminate?'eliminate':null;
   if(mode){
    if(spec.dimension==='3d'&&['arena','fps','rpg'].includes(spec.genre)){
     const seconds=/\b(\d{1,3})\s*(segundos?|s\b)/.exec(t);
     const targets=where!==null?[where]:Array.from({length:count},(_,i)=>i);
     let affected=0;
     for(const i of targets){
      if(i<0||i>=count){warn('Missão referencia fase inexistente.');continue;}
      // "Objetivo: sobreviver" é rótulo descritivo e não pode apagar 60 s
      // configurados na linha anterior da mesma fase.
      const same=stageConfig[i].mission===mode;
      if(same&&!seconds&&/^[-*+]?\s*(?:objetivo|missao principal|meta)\s*:/.test(t))continue;
      stageConfig[i]={...stageConfig[i],mission:mode};
      if(mode==='survive')stageConfig[i].seconds=clamp(Number(seconds?.[1])||stageConfig[i].seconds||45,5,180);
      affected++;
     }
     if(affected)push('applied','mission','Objetivo de '+({survive:'sobrevivência',collect:'coleta',eliminate:'eliminação'}[mode]),where===null?'Todas as fases':'Fase '+(where+1),origin);
    }else push('pending','mission','Objetivo solicitado não implementado neste motor',origin);
   }
  }
 }
 // Loja de combate: este contrato só é executável no FPS 3D com módulo integrado.
 // A presença de palavras como "economia" isoladas não habilita compras automáticas.
 const demand=normalize(source+'\n'+extra);
 // Escolher a ÚLTIMA ordem explícita. "Sem loja" no GDD não vence
 // "adicione uma loja" escrito depois pelo usuário, nem vice-versa.
 const shopLines=[...sections.filter(r=>r.origin==='GDD'),...sections.filter(r=>r.origin==='Comando')];
 const disableStore=/\b(sem loja|nao quero (?:uma )?loja|remova? a loja|desativar? a loja|retirar a loja)\b/;
 const enableStore=/\b(comprar|compre|compra|loja|mercador|mercado)\b.*\b(municao|balas?|cartuchos?|armas?|vida|cura|kit medico|medkits?|upgrades?|melhorias?)\b|\b(ativar|habilitar|adicionar|criar)\b.{0,26}\bloja\b/;
 const pricePattern=/\b(municao|balas?|kit medico|cura|melhoria de arma|upgrade de arma)\b.{0,32}\b(custa|custo|preco)\b/;
 let storeAction=null,shopRequest=false,priceRequest=false;
 for(const record of shopLines){
  if(disableStore.test(record.normal))storeAction='off';
  else if(enableStore.test(record.normal)){storeAction='on';shopRequest=true;}
  if(pricePattern.test(record.normal)){priceRequest=true;if(storeAction===null)storeAction='on';}
 }
 const shopDisable=storeAction==='off';
 if(shopRequest||priceRequest||shopDisable||parsed.combatEconomy?.enabled){
  if(spec.dimension==='3d'&&spec.genre==='fps'){
   const config={enabled:storeAction==='on'||(storeAction===null&&!!parsed.combatEconomy?.enabled),startingCredits:90,startingReserve:60,
     ...(parsed.combatEconomy||{}),prices:{ammo:30,heal:45,upgrade:125,...parsed.combatEconomy?.prices}};
   if(storeAction==='on')config.enabled=true;
   if(shopDisable)config.enabled=false;
   for(const entry of shopLines){
    const t=entry.normal;
    const credit=/\b(?:comec|inici|creditos? iniciais?|saldo inicial)\w*.{0,26}\b(?:com|de|:)?\s*(\d{1,4})\s*(?:creditos?)?\b/.exec(t);
    if(credit)config.startingCredits=clamp(Number(credit[1]),0,9999);
    const stock=/\b(?:municao inicial|reserva inicial|iniciar com)\b.{0,26}\b(\d{1,3})\s*(?:balas?|municao|cartuchos?)\b/.exec(t);
    if(stock)config.startingReserve=clamp(Number(stock[1]),0,250);
    const kinds=[['ammo','municao|balas?|pacote de municao'],['heal','kit medico|kit de cura|cura|medkit'],['upgrade','upgrade de arma|melhoria de arma|melhorar arma']];
    for(const [key,noun] of kinds){
     const match=new RegExp('\\b(?:'+noun+')\\b.{0,24}\\b(?:custa|custar|preco|valor)\\s*(?:de|:|=)?\\s*(\\d{1,4})\\s*(?:creditos?)?\\b').exec(t);
     if(match)config.prices[key]=clamp(Number(match[1]),key==='upgrade'?20:5,key==='upgrade'?2000:500);
    }
   }
   parsed.combatEconomy=config;
   if(shopDisable)push('applied','combat-store-off','Loja desativada conforme instrução','FPS 3D');
   else if(config.enabled)push('applied','combat-store','Loja jogável com créditos, compra de munição, kits médicos e melhoria real de dano','FPS 3D');
   if(config.enabled&&(shopRequest||priceRequest))push('applied','combat-store-prices',
     'Preços: munição '+config.prices.ammo+', cura '+config.prices.heal+', melhorias '+config.prices.upgrade+' (aumenta por nível)',
     'FPS 3D');
  }else if(shopRequest||priceRequest){
   push('pending','combat-store','Loja de munição, cura e melhoria de armas ainda não está disponível para este motor',
     spec.genre+' '+spec.dimension);
  }
 }
 // Requisitos de recursos não implementados precisam permanecer visiveis e auditaveis.
 const pendingCatalog=[
  ['skill-tree',/arvore de habilidades?|skill tree|habilidades? (permanentes?|desbloqueaveis?)/,'Árvore de habilidades interativa'],
  ['craft',/crafting|fabricar (itens|armas)|sistema de fabricacao/,'Fabricação de itens'],
  ['dialog',/dialogos? ramificados|sistema de dialogos?|npc[s]? convers/, 'Diálogos interativos'],
  ['stealth',/furtividade|stealth|esconder de inimigos/,'Furtividade'],
  ['network',/multiplayer|multijogador|online cooperativ/,'Multijogador'],
  ['physics',/fisica realista|rigid.?body|destruicao de cenario|destrutivel/,'Simulação física avançada'],
  ['animated-assets',/glb animad|personagem animado importad|rig automatico|animacoes? (do meshy|importad)/,'Animação e rig automático de GLB'],
  ['procedural-world',/mundo aberto sem fim|mundo infinito|terreno infinito/,'Mundo aberto infinito'],
  ['complex-ai',/inimigos? (inteligentes?|com ia|que usam cobertura|que investigam)|comportamento tatico/,'IA de inimigos tática customizada'],
  ['story',/cutscenes?|cenas? cinematicas?|historia ramificada/,'Cenas e narrativa personalizadas'],
  ['skills',/sistema de habilidades? completo|skill points|pontos de habilidade/,'Sistema de habilidades personalizáveis']
 ];
 if(spec.genre==='rpg'&&spec.dimension==='3d'&&sections.some(x=>/\b(inventario|mochila|equipamentos? colecionaveis?)\b/.test(x.normal)&&
      !/\b(sem|nao quero|fora de escopo|nao usar|nao deve)\b.{0,35}\b(inventario|mochila|equipamentos?)\b/.test(x.normal)))
   push('pending','inventory-3d','Inventário equipado e persistente no RPG 3D ainda não implementado','Jogo inteiro');
 // Exclusões de escopo NÃO são exigências a programar.
 // A última decisão em cada documento ganha; o comando recente vem depois do GDD.
 for(const [id,regex,label] of pendingCatalog){
  let last=null;
  for(const line of sections){
   if(!regex.test(line.normal))continue;
   const negative=/\b(sem|nao quero|fora de escopo|nao usar|nao deve|evitar|exclui)\b.{0,70}$/.test(line.normal.slice(0,Math.max(0,line.normal.search(regex))))||
     /\b(sem|nao quero|fora de escopo|nao usar|nao deve|evitar|exclui)\b.{0,75}\b(multiplayer|crafting|furtividade|skill tree|arvore de habilidades?|dialogo|cutscenes?|mundo infinito|inventario)\b/.test(line.normal);
   last=negative?null:line;
  }
  if(last)push('pending',id,label+' — requer implementação própria','Jogo inteiro',last.origin+' linha '+last.line);
 }
 // Separar intenção de evidencia: configuracoes serializadas no código sao verificaveis.
 parsed.stageConfig=stageConfig;
 implementation.requirements=[...implementation.applied,...implementation.pending].slice(0,120);
 implementation.summary=implementation.applied.length+' configuração(ões) aplicadas; '+implementation.pending.length+' requisito(s) pendente(s)';
 parsed.implementation=implementation;
 if(capabilities)implementation.audit=capabilities.audit(parsed,source,extra);
 return parsed;
}
function report(spec){
 const p=spec?.implementation||{source:'desconhecida',applied:[],pending:[],warnings:[]};
 const source=spec?.referenceGame;
 const reference=source?'\n## Exemplo do repositório reconhecido\n'+
   '- Repositório: '+source.repository+'\n- Arquivo: '+source.url+'\n'+
   '- Técnicas para estudar: '+source.lessons.join('; ')+'\n'+
   '- Ainda não são implementadas só por reconhecer o GDD: '+source.unsupported.join('; ')+'\n':'';

 const li=(items,empty)=>items.length?items.map(x=>'- '+x.description+' ('+x.where+')'+(x.detail?' — '+x.detail:'')).join('\n'):'- '+empty;
 return '# Interpretação executável do pedido\n\n'+
  '**Origem:** '+p.source+'\n\n**Gênero:** '+spec.genre+' / '+spec.dimension+'\n\n'+
  '## Configurações implementadas no GAME_SPEC\n'+li(p.applied,'Nenhuma configuração especial identificada')+'\n\n'+
  '## Requisitos ainda não implementados\n'+li(p.pending,'Nenhuma solicitação adicional reconhecida como pendente')+'\n\n'+
  '## Alertas e limites\n'+(p.warnings.length?p.warnings.map(x=>'- '+x).join('\n'):'- Nenhum')+'\n\n'+
  reference+
  '**Como verificar:** abra game.js, localize GAME_SPEC e confira stageConfig/tuning; execute a prévia e faça testes. Não se deve marcar tarefas do GDD como concluídas apenas por aparecerem no relatório.\n\n'+(capabilities?capabilities.report(spec):'');
}
root.GameForgeIntent={compile,briefFromCommand,requirements,quantity,report,normalize};
if(typeof module!=='undefined')module.exports=root.GameForgeIntent;
})(typeof globalThis!=='undefined'?globalThis:this);
