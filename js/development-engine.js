/* GameForge v0.9 — plano auditável e edição incremental determinística.
   Reconhece somente alterações declaradas. NUNCA finge suportar novos sistemas. */
(function(root){
'use strict';
const norm=x=>intent?.normalize?intent.normalize(x):String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const specPattern=/\bconst GAME_SPEC = (\{[^\n]*\});/;
const intent=root.GameForgeIntent||(typeof require==='function'?require('./intent-compiler'):null);
const directIds=new Set(['stage-count','waves','enemies','laps','boss-only-last','boss-last','boss-all','boss-off','boss-stage','mission','theme-stage','objective-label','combat-store','combat-store-prices','combat-store-off']);
function directInterpretation(instruction,files){
 if(!intent||!files?.['game.js'])return {tasks:[],pending:[]};
 const match=files['game.js'].match(specPattern);
 if(!match)return {tasks:[],pending:[]};
 let old;try{old=JSON.parse(match[1]);}catch{return {tasks:[],pending:[]};}
 const updated=intent.compile(JSON.parse(JSON.stringify(old)),'',instruction);
 const changedStore=JSON.stringify(old.combatEconomy||null)!==JSON.stringify(updated.combatEconomy||null);
 const hasStoreRuntime=files['game.js'].includes('const gameForgeCombatEconomyFactory = ');
 const hasMissionRuntime=files['game.js'].includes('R.missionReady(');
 const differences=JSON.stringify(old.stages)!==JSON.stringify(updated.stages)||
   JSON.stringify(old.stageConfig||[])!==JSON.stringify(updated.stageConfig||[])||
   (changedStore&&hasStoreRuntime);
 const tasks=differences?updated.implementation.applied.filter(item=>directIds.has(item.id)&&
   (item.id!=='mission'||hasMissionRuntime)&&
   (!item.id.startsWith('combat-store')||changedStore&&hasStoreRuntime)).map(item=>({
   id:item.id,number:0,title:item.description,rationale:'Comando interpretado: '+item.where,checks:[
     'GAME_SPEC.stages / GAME_SPEC.stageConfig atualizados',
     'Motor reconhece esta configuração no jogo gerado',
     'Prévia e regressões devem ser verificadas'
   ],possible:true,direct:true})):[];
 const pending=updated.implementation.pending.map(item=>item.description);
 if(changedStore&&!hasStoreRuntime&&old.genre==='fps'&&old.dimension==='3d')
  pending.push('Este FPS foi criado antes do módulo de loja. Gere um projeto FPS atualizado para ativar compras; o código antigo foi preservado.');
 if(!hasMissionRuntime&&updated.implementation.applied.some(item=>item.id==='mission'))
  pending.push('Este jogo não contém o runtime de objetivos. Missões programadas não podem ser ativadas apenas editando GAME_SPEC.');
 return {tasks,pending};
}
const actions={
  difficulty:{title:'Ajustar dificuldade',checks:['Inimigos mais resistentes ou mais leves','Fases ainda completáveis']},
  enemies:{title:'Ajustar número de inimigos',checks:['Limite de inimigos respeitado','Ondas avançam corretamente']},
  boss:{title:'Ajustar vida dos chefes',checks:['Boss só é derrotado uma vez','Progressão entre fases preservada']},
  speed:{title:'Ajustar velocidade do jogador',checks:['Controles WASD e touch continuam funcionando']},
  fire:{title:'Ajustar cadência de tiro',checks:['Tecla Espaço e touch disparam','Limite de projéteis mantido']},
  particles:{title:'Reduzir custo de partículas',checks:['Explosões mantêm feedback visual','FPS não cai abaixo da referência']},
  theme:{title:'Atualizar tema visual',checks:['Contraste do HUD legível','Cenário renderiza sem falhas']},
  world:{title:'Ampliar o mundo 3D',checks:['Colisões e objetivos continuam acessíveis','FPS e câmera verificados']},
  quality:{title:'Ajustar qualidade 3D',checks:['Sombras e resolução adequadas ao dispositivo','Jogabilidade preservada']},
  stage:{title:'Adicionar uma fase',checks:['Fase aparece na progressão','Game over e vitória preservados']},
  mission:{title:'Programar objetivo da fase',checks:['Portal bloqueado antes do objetivo','Objetivo libera saída quando cumprido','A vitória exige chegar ao portal']}
};
function analyze(instruction, spec){
  const t=norm(instruction);
  const out=[];let m;
  const add=(id,value,why)=>{if(!out.some(a=>a.id===id))out.push({id,value,title:actions[id].title,why,checks:actions[id].checks});};
  const harder=/(mais dificil|aument(ar|e)\s+(a\s+)?dificuldade|dificuldade\s+(alta|dificil)|hardcore)/.test(t);
  const easier=/(mais facil|reduzir\s+(a\s+)?dificuldade|dificuldade\s+baixa)/.test(t);
  if(harder)add('difficulty','hard','Pediram aumento de dificuldade');
  else if(easier)add('difficulty','easy','Pediram redução de dificuldade');
  if(/(mais|aument(ar|e)|adicion(ar|e))\s+(\w+\s+){0,2}(inimig|onda)|inimig.*(quantidade|dobro)/.test(t))add('enemies',1.45,'Aumentar a quantidade por fase sem alterar limites de objetos simultâneos');
  else if(/(menos|reduzir|diminuir)\s+(\w+\s+){0,2}(inimig|onda)/.test(t))add('enemies',0.75,'Reduzir a quantidade por fase');
  if(/(chefe|boss)(s)?\s+mais\s+(forte|dificil|resistente)|(aumentar|dobrar).*vida.*(chefe|boss)/.test(t))add('boss',1.5,'Aumentar resistência do chefe');
  else if(/(chefe|boss)(s)?\s+mais\s+(fraco|facil)/.test(t))add('boss',0.75,'Reduzir resistência do chefe');
  if(/(jogador|personagem|nave|dragao)\s+mais\s+rapido|aumentar\s+(a\s+)?velocidade\s+(do\s+)?(jogador|personagem|nave)/.test(t))add('speed',1.2,'Movimentação do jogador mais rápida');
  else if(/(jogador|personagem|nave)\s+mais\s+lento/.test(t))add('speed',0.8,'Movimentação do jogador mais lenta');
  if(/(atir|tiro|dispar).*(mais rapido|cadencia|velocidade)|(aumentar|melhorar)\s+(a\s+)?cadencia/.test(t))add('fire',1.35,'Aumentar cadência sem aumentar o limite de projéteis');
  else if(/(atir|tiro|dispar).*(mais lento|menor cadencia)/.test(t))add('fire',0.8,'Reduzir cadência');
  if(/(otimiz|menos particulas|reduzir.*(particulas|efeitos)|mais leve)/.test(t))add('particles',0.65,'Diminuir partículas decorativas, mantendo colisões e inimigos');
  if(/(visual|grafico|cenario|cor|tema).*(neon|cyber)|(neon|cyber).*(visual|grafico|tema)/.test(t))add('theme','neon','Tema visual neon no gerador de naves');
  else if(/(visual|grafico|cenario|tema).*(espac|galax|sideral)|(espac|galax|sideral).*(visual|grafico|tema)/.test(t))add('theme','space','Tema espacial');
  else if(/(visual|grafico|cenario|tema).*(dragao|fantasia|medieval)|(dragao|fantasia).*(visual|grafico|tema)/.test(t))add('theme','dragon','Tema de fantasia');
  if(spec?.dimension==='3d'){
    if(/(tema|cenario|ambiente).*(floresta|forest)/.test(t))add('theme','forest','Vegetação e iluminação de floresta');
    if(/(tema|cenario|ambiente).*(deserto|desert)/.test(t))add('theme','desert','Paleta e cenário de deserto');
    if(/(tema|cenario|ambiente).*(ruina|templo)/.test(t))add('theme','ruins','Ruínas e iluminação atmosférica');
    if(/(mundo|mapa|area).*(maior|ampl|grande)|ampli.*(mundo|mapa|area)/.test(t))add('world',1.25,'Aumentar área sem criar objetos ilimitados');
    if(/(grafico|qualidade).*(leve|baix|low)/.test(t))add('quality','low','Reduzir resolução e sombras');
    else if(/(grafico|qualidade).*(alt|melhor|high)/.test(t))add('quality','high','Aumentar qualidade dentro dos limites do motor');
  }
  const phase=/(?:\b(?:na|no|para|da|do)\s+)?\bfase\s*(\d{1,2}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\b/.exec(t);
  const phaseWords={um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10};
  const phaseNumber=phase?(phaseWords[phase[1]]||Number(phase[1])):null;
  const missionMode=/\bsobreviv|\bresist\w*\s+por\b/.test(t)?'survive':/\b(eliminar?|elimine|derrotar?|derrote|matar?)\b.*\b(inimig\w*|todos\b|guardi\w*)/.test(t)?'eliminate':/\b(coletar?|coletem?|recolher|recolha|pegar?)\b.*\b(crista\w*|reliquia\w*)/.test(t)?'collect':null;
  if(missionMode){
    const duration=/(\d{1,3})\s*(?:segundos?|s\b)/.exec(t);
    const value={index:phaseNumber!==null?phaseNumber-1:-1,mode:missionMode,seconds:clamp(duration?Number(duration[1]):45,5,180)};
    add('mission',value,'Configuração executável para a fase '+(value.index>=0?value.index+1:'não especificada'));
  }
  if(/(adicion\w*|criar|incluir|nova|mais uma|proxima)\s+(\w+\s+){0,2}(fase|missao)|\b(fase|missao)\s+nova/.test(t) && !missionMode){
    m=String(instruction).match(/(?:fase|miss[aã]o)\s+(?:nova\s*)?(?:chamad[ao]\s+)?["“']([^"”']{3,55})["”']/i);
    const named=(m&&m[1]) || `Fase ${Math.min(spec?.campaign?.maxStages||10,(spec?.stages?.length||3)+1)} — Novo desafio`;
    add('stage',named,'Acrescentar uma fase preservando as anteriores');
  }
  return out;
}
function plan(instruction,spec,files){
  const text=String(instruction||'').trim();
  const changes=analyze(text,spec);
  const supported=Boolean(files?.['game.js']&&specPattern.test(files['game.js']));
  const supportedActions=spec?.dimension==='3d'?(spec.genre==='platform'?['speed','world','quality','theme','stage']:spec.genre==='racing'?['speed','enemies','world','quality','theme','stage']:['difficulty','enemies','boss','speed','fire','world','quality','theme','stage','mission']):['tower-defense','lane-defense','block-td'].includes(spec?.genre)?['difficulty','enemies','boss','fire','stage']:spec?.genre==='platform'?['speed','enemies','stage']:spec?.genre==='racing'?['speed','enemies','difficulty','stage']:Object.keys(actions);
  const direct=supported?directInterpretation(text,files):{tasks:[],pending:[]};
  const tasks=changes.map((a,i)=>({number:i+1,title:a.title,rationale:a.why,checks:a.checks,possible:supported&&supportedActions.includes(a.id)&&(a.id!=='theme'||spec?.genre==='shooter'||(spec?.dimension==='3d'&&['forest','desert','neon','ruins'].includes(a.value)))&&(a.id!=='mission'||(spec?.dimension==='3d'&&['arena','fps','rpg'].includes(spec.genre)&&a.value.index>=0&&a.value.index<spec.stages.length&&files['game.js'].includes('R.missionReady(')))}));
  for(const row of direct.tasks){if(row.id==='mission'&&tasks.some(t=>t.title===actions.mission.title&&t.possible))continue;row.number=tasks.length+1;tasks.push(row);}

  const unknown=text.length>0&&changes.length===0&&direct.tasks.length===0&&direct.pending.length===0;
  const unsupported=tasks.filter(t=>!t.possible).map(t=>t.title+(t.title==='Programar objetivo da fase'?' — informe "fase N" de um jogo ação/FPS 3D gerado no motor v0.14':' — regra não implementada neste motor'));
  return {title:'Plano incremental de desenvolvimento',instruction:text,reason:'Preservar arquivos atuais e editar apenas as configurações controladas do motor',
    tasks, pending:[...(unknown?['Pedido livre não coberto por regras: exige IA ou programação manual']:[]),...unsupported,...direct.pending],
    tests:['Verificar sintaxe JS','Iniciar prévia','Executar QA de movimentação e controles','Comparar com versão anterior'],
    supported:supported&&tasks.some(t=>t.possible)};
}
function modify(files,spec,planResult){
  if(!files?.['game.js'])throw Error('Gere um jogo antes de pedir melhorias.');
  if(!planResult?.supported)return {changed:false,files:{...files},applied:[],pending:planResult?.pending||[]};
  const match=files['game.js'].match(specPattern);if(!match)return {changed:false,files:{...files},applied:[],pending:['Código não contém GAME_SPEC editável; use modo IA.']};
  let old;try{old=JSON.parse(match[1]);}catch{throw Error('Configuração do jogo não é JSON válido. Não sobrescrevi o código.');}
  const next=JSON.parse(JSON.stringify(old));
  const tuning={difficulty:1,enemyMultiplier:1,bossMultiplier:1,playerSpeedMultiplier:1,fireRateMultiplier:1,particlesMultiplier:1,...next.tuning};
  const applied=[], pending=[];
  for(const task of planResult.tasks){
    if(!task.possible){pending.push(task.title);continue;}
    const action=analyze(planResult.instruction,old).find(x=>x.title===task.title);if(!action)continue;
    const before=JSON.stringify(next);
    if(action.id==='difficulty')tuning.difficulty=action.value==='hard'?clamp(tuning.difficulty*1.3,.5,2.5):clamp(tuning.difficulty*.8,.5,2.5);
    if(action.id==='enemies')tuning.enemyMultiplier=clamp(tuning.enemyMultiplier*action.value,.5,2.5);
    if(action.id==='boss')tuning.bossMultiplier=clamp(tuning.bossMultiplier*action.value,.5,3);
    if(action.id==='speed')tuning.playerSpeedMultiplier=clamp(tuning.playerSpeedMultiplier*action.value,.6,2);
    if(action.id==='fire')tuning.fireRateMultiplier=clamp(tuning.fireRateMultiplier*action.value,.7,2.5);
    if(action.id==='particles')tuning.particlesMultiplier=clamp(tuning.particlesMultiplier*action.value,.2,1);
    if(action.id==='theme'&&next.dimension==='3d')next.worldOptions={...next.worldOptions,theme:action.value};
    else if(action.id==='theme'&&next.shooterOptions)next.shooterOptions.theme=action.value;
    if(action.id==='world')next.worldOptions={...next.worldOptions,size:clamp(Math.round((next.worldOptions?.size||48)*action.value),32,88)};
    if(action.id==='quality')next.worldOptions={...next.worldOptions,quality:action.value};
    if(action.id==='mission'){
      if(!Array.isArray(next.stageConfig))next.stageConfig=[];
      const index=action.value.index;
      next.stageConfig[index]={...(next.stageConfig[index]||{}),mission:action.value.mode,seconds:action.value.seconds};
    }
    const stageLimit=next.campaign?.maxStages||10;
    if(action.id==='stage'&&next.stages.length<stageLimit)next.stages.push(action.value);
    if(action.id==='stage'&&next.stages.length>=stageLimit&&JSON.stringify(next)===before)pending.push('Limite de '+stageLimit+' fases para este motor');
    if(JSON.stringify(next)!==before||['difficulty','enemies','boss','speed','fire','particles'].includes(action.id))applied.push(action.title);
  }
  next.tuning=tuning;
  if(planResult.tasks.some(task=>task.direct&&task.possible)&&intent){
    const candidate=intent.compile(JSON.parse(JSON.stringify(next)),'',planResult.instruction);
    if(!files['game.js'].includes('R.missionReady(')){
      // Não insira uma missão que depende de R.missionReady em um runtime legado.
      candidate.stageConfig?.forEach((row,i)=>{
        const existing=next.stageConfig?.[i]||{};
        if(row.mission!==existing.mission){
          if(existing.mission===undefined)delete row.mission;else row.mission=existing.mission;
          if(existing.seconds===undefined)delete row.seconds;else row.seconds=existing.seconds;
        }
      });
    }
    const changedStages=JSON.stringify(candidate.stages)!==JSON.stringify(next.stages);
    const changedConfig=JSON.stringify(candidate.stageConfig)!==JSON.stringify(next.stageConfig);
    const changedStore=JSON.stringify(candidate.combatEconomy||null)!==JSON.stringify(next.combatEconomy||null);
    if(changedStages)next.stages=candidate.stages;
    if(changedConfig)next.stageConfig=candidate.stageConfig;
    if(changedStore&&files['game.js'].includes('const gameForgeCombatEconomyFactory = '))
      next.combatEconomy=candidate.combatEconomy;
    if(changedStages||changedConfig||(changedStore&&files['game.js'].includes('const gameForgeCombatEconomyFactory = '))){
      next.implementation=candidate.implementation;
      for(const row of planResult.tasks.filter(task=>task.direct&&task.possible)){
        if(!applied.includes(row.title))applied.push(row.title);
      }
    }
  }
  if(JSON.stringify(old)===JSON.stringify(next))return {changed:false,files:{...files},applied:[],pending};
  const updated=files['game.js'].replace(specPattern,`const GAME_SPEC = ${JSON.stringify(next).replace(/<\//g,'<\\/')};`);
  const out={...files,'game.js':updated};
  if(applied.includes(actions.mission.title)&&root.GameForgeCampaign?.report)out['CAMPANHA_EDITOR.md']=root.GameForgeCampaign.report(next);
  out['RELATORIO_EVOLUCAO.md']=report({...planResult,pending:[...planResult.pending,...pending]},applied);
  return {changed:true,files:out,applied,pending,spec:next};
}
function report(p,applied=[]){return '# Plano e evolução do jogo\n\n## Pedido\n'+p.instruction+'\n\n## Ações\n'+(p.tasks.map(t=>`- ${t.possible?'[x]':'[ ]'} ${t.title}: ${t.rationale}`).join('\n')||'- Nenhuma ação do motor local identificada')+'\n\n## Verificações recomendadas\n'+p.tests.map(x=>'- [ ] '+x).join('\n')+'\n\n## Alterações realizadas\n'+(applied.map(x=>'- '+x).join('\n')||'- Nenhuma')+'\n\n## Pendências\n'+(p.pending.map(x=>'- '+x).join('\n')||'- Nenhuma conhecida')+'\n\n**Nota:** plano não substitui execução e QA real.\n';}
root.GameForgeDevelopment={analyze,plan,modify,report};
if(typeof module!=='undefined')module.exports=root.GameForgeDevelopment;
})(typeof globalThis!=='undefined'?globalThis:this);
