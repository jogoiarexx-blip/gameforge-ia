/* GameForge v0.9 — plano auditável e edição incremental determinística.
   Reconhece somente alterações declaradas. NUNCA finge suportar novos sistemas. */
(function(root){
'use strict';
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const specPattern=/\bconst GAME_SPEC = (\{[^\n]*\});/;
const actions={
  difficulty:{title:'Ajustar dificuldade',checks:['Inimigos mais resistentes ou mais leves','Fases ainda completáveis']},
  enemies:{title:'Ajustar número de inimigos',checks:['Limite de inimigos respeitado','Ondas avançam corretamente']},
  boss:{title:'Ajustar vida dos chefes',checks:['Boss só é derrotado uma vez','Progressão entre fases preservada']},
  speed:{title:'Ajustar velocidade do jogador',checks:['Controles WASD e touch continuam funcionando']},
  fire:{title:'Ajustar cadência de tiro',checks:['Tecla Espaço e touch disparam','Limite de projéteis mantido']},
  particles:{title:'Reduzir custo de partículas',checks:['Explosões mantêm feedback visual','FPS não cai abaixo da referência']},
  theme:{title:'Atualizar tema visual',checks:['Contraste do HUD legível','Cenário renderiza sem falhas']},
  stage:{title:'Adicionar uma fase',checks:['Fase aparece na progressão','Game over e vitória preservados']}
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
  if(/(adicion\w*|criar|incluir|nova|mais uma|proxima)\s+(\w+\s+){0,2}(fase|missao)|\b(fase|missao)\s+nova/.test(t)){
    m=String(instruction).match(/(?:fase|miss[aã]o)\s+(?:nova\s*)?(?:chamad[ao]\s+)?["“']([^"”']{3,55})["”']/i);
    const named=(m&&m[1]) || `Fase ${Math.min(10,(spec?.stages?.length||3)+1)} — Novo desafio`;
    add('stage',named,'Acrescentar uma fase preservando as anteriores');
  }
  return out;
}
function plan(instruction,spec,files){
  const text=String(instruction||'').trim();
  const changes=analyze(text,spec);
  const supported=Boolean(files?.['game.js']&&specPattern.test(files['game.js']));
  const tasks=changes.map((a,i)=>({number:i+1,title:a.title,rationale:a.why,checks:a.checks,possible:supported&&(a.id!=='theme'||spec?.genre==='shooter')}));
  const unknown=text.length>0&&changes.length===0;
  const unsupported=tasks.filter(t=>!t.possible).map(t=>t.title);
  return {title:'Plano incremental de desenvolvimento',instruction:text,reason:'Preservar arquivos atuais e editar apenas as configurações controladas do motor',
    tasks, pending:[...(unknown?['Pedido livre não coberto por regras: exige IA ou programação manual']:[]),...unsupported],
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
    if(action.id==='theme'&&next.shooterOptions)next.shooterOptions.theme=action.value;
    if(action.id==='stage'&&next.stages.length<10)next.stages.push(action.value);
    if(action.id==='stage'&&next.stages.length>=10&&JSON.stringify(next)===before)pending.push('Limite de 10 fases para este motor');
    if(JSON.stringify(next)!==before||['difficulty','enemies','boss','speed','fire','particles'].includes(action.id))applied.push(action.title);
  }
  next.tuning=tuning;
  if(JSON.stringify(old)===JSON.stringify(next))return {changed:false,files:{...files},applied:[],pending};
  const updated=files['game.js'].replace(specPattern,`const GAME_SPEC = ${JSON.stringify(next).replace(/<\//g,'<\\/')};`);
  const out={...files,'game.js':updated};
  out['RELATORIO_EVOLUCAO.md']=report({...planResult,pending:[...planResult.pending,...pending]},applied);
  return {changed:true,files:out,applied,pending,spec:next};
}
function report(p,applied=[]){return '# Plano e evolução do jogo\n\n## Pedido\n'+p.instruction+'\n\n## Ações\n'+(p.tasks.map(t=>`- ${t.possible?'[x]':'[ ]'} ${t.title}: ${t.rationale}`).join('\n')||'- Nenhuma ação do motor local identificada')+'\n\n## Verificações recomendadas\n'+p.tests.map(x=>'- [ ] '+x).join('\n')+'\n\n## Alterações realizadas\n'+(applied.map(x=>'- '+x).join('\n')||'- Nenhuma')+'\n\n## Pendências\n'+(p.pending.map(x=>'- '+x).join('\n')||'- Nenhuma conhecida')+'\n\n**Nota:** plano não substitui execução e QA real.\n';}
root.GameForgeDevelopment={analyze,plan,modify,report};
if(typeof module!=='undefined')module.exports=root.GameForgeDevelopment;
})(typeof globalThis!=='undefined'?globalThis:this);
