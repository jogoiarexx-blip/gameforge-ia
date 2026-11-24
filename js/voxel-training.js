/* GF-TRAIN-22 — diagnostico honesto de GDD voxel a partir do Prismal Voxel.
 * NÃO é retreinamento de pesos nem exportação de um jogo voxel jogável.
 */
(function(root){
'use strict';
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const patterns=Object.freeze([
 {id:'voxel-terrain',title:'Terreno voxel e chunks por seed',regex:/\b(voxel|minecraft|chunks?|terreno procedural|mundo de blocos|blocos 3d|mundo infinito)\b/,
  status:'prototipo',contract:'GameForgeVoxelKit.generateChunk, chunkOf, streamRequests (puro; sem render 3D integrado)',
  test:'tests/voxel-kit.test.js',next:'Implementar mesher de faces visíveis/greedy, workers, interação do jogador e memória de chunks antes de declarar mundo explorável'},
 {id:'craft-stations',title:'Bancada, forno e receitas por estação',regex:/\b(bancadas?|fornos?|crafting|craftar|fabricar|receitas?|fundir|fundicao|fabricacao|mesas? de trabalho)\b/,
  status:'prototipo',contract:'GameForgeVoxelKit.recipesAtStation e craft atômico',
  test:'tests/voxel-kit.test.js',next:'Conectar inventário/estações do jogo exportado; filtrar UI e impedir gasto fora da estação'},
 {id:'tree-replant',title:'Árvores, destruição completa e replantio',regex:/\b(arvores?|troncos?|mudas?|replantar|reflorestar|quebrar madeira|madeira de arvore)\b/,
  status:'pendente',contract:'Prismal Voxel: finishTree + saplings; GameForgeVoxelKit não inclui árvores jogáveis',
  test:'tests/voxel-training.test.js',next:'Criar entidades de árvore por ID com remoção transacional de tronco/folhas e drop único de muda'},
 {id:'waypoint',title:'Bússola e navegação até casa ou objetivo',regex:/\b(bussola|compass|waypoint|navegacao|localizacao|ir para casa|voltar pra casa|achar minha casa|objetivos? no mapa|marcadores? no mapa|mapa de objetivos?)\b/,
  status:'prototipo',contract:'GameForgeVoxelKit.guide e compassMarks: direção em linha reta, NÃO pathfinding',
  test:'tests/voxel-kit.test.js',next:'Integrar HUD com alvos persistentes, modos casa/objetivo e aviso de terreno inacessível'},
 {id:'chunk-stream',title:'Streaming leve e proteção de jobs de chunk',regex:/\b(chunks?|streaming|carregamento de terreno|fronteiras? de blocos|fronteiras? de chunks?|workers?|mundo infinito|travar ao andar|mundo carregar)\b/,
  status:'prototipo',contract:'GameForgeVoxelKit.streamRequests, batchEdits, meshJobValid',
  test:'tests/voxel-kit.test.js',next:'Ligar workers de meshing, descarte de geometria GPU e revisão das bordas no runtime'},
 {id:'world-save',title:'Persistência durável e recuperação do mundo',regex:/\b(salvamento|salvar mundo|salvar progresso|persistencia|persistir|reconexao|restaurar mundo|recuperar mundo|perda de progresso|backup|autosave|save)\b/,
  status:'pendente',contract:'GameForge tem save de campanhas; não há persistência voxel completa por blocos/chunks',
  test:'tests/voxel-training.test.js',next:'Versionar schema de mundo, atomicidade de saves e recuperação apenas de snapshot íntegro mais recente'},
 {id:'coop-p2p',title:'Cooperação P2P, convidados e baús compartilhados',regex:/\b(p2p|webrtc|multiplayer|cooperativo|coop|amigos?|convidados?|baus? compartilhados?|chat de jogo|codigo de convite)\b/,
  status:'pendente',contract:'Prismal Voxel trata P2P como experimental; não há sala WebRTC certificada no GameForge',
  test:'tests/voxel-training.test.js',next:'Separar simulação anfitrião/cliente; sequências/revisões de inventário; sinalização necessária e testes longos'},
 {id:'mobile',title:'Controle mobile e distância de renderização',regex:/\b(celulares?|mobile|android|touch|toque|fps baixo|fps no celular|desempenho mobile|fraco|leve|otimizacao|otimizar)\b/,
  status:'parcial',contract:'GameForge tem controles de toque; GameForgeVoxelKit prevê raio de chunks menor no mobile',
  test:'tests/voxel-kit.test.js',next:'Benchmark em aparelho real, ajuste adaptativo de pixelRatio, visibilidade de chunks e orçamento GPU'},
 {id:'fps-metrics',title:'Medição de FPS, 1% low e p95',regex:/\b(fps|benchmark|desempenho|performance|p95|1% low|frame time|draw calls|f3)\b/,
  status:'prototipo',contract:'GameForgeVoxelKit.frameMetrics gera FPS médio, 1% low e p95 sem telemetria remota',
  test:'tests/voxel-kit.test.js',next:'Expor painel de diagnóstico e armazenar amostras reais do loop de renderização'},
 {id:'mining-building',title:'Mineração e construção livre de blocos',regex:/\b(mineracao|minerar|quebrar blocos?|colocar blocos?|construir|construcao|casas? de blocos?|blocos destrutiveis|destruir blocos?)\b/,
  status:'pendente',contract:'Geração/edição de dados voxel existe no kit, mas falta gameplay de mineração/colocação',
  test:'tests/voxel-kit.test.js',next:'Implementar DDA raycast, colisão de blocos, controle de alcance, inventário e atualização da malha'}
]);
const isVoxel=(gdd='',command='')=>/\b(voxel|minecraft|mundo de blocos|blocos 3d|prismal voxel|mundo prisma)\b/.test(normalize(gdd+' '+command));
const denied=(line,id)=>{
 const topic=id==='coop-p2p'?'(?:p2p|multiplayer|coop|cooperativo|webrtc|amigo)':
  id==='craft-stations'?'(?:craft|bancada|forno|receitas?|fabricar)':
  id==='world-save'?'(?:salvar|salvamento|save|backup)':
  id==='mobile'?'(?:celular|mobile|touch|toque|android)':
  id==='tree-replant'?'(?:arvores?|mudas?|replantar)':
  id==='mining-building'?'(?:mineracao|minerar|construir|blocos destrutiveis)':
  id==='chunk-stream'?'(?:chunks?|workers?|streaming|carregamento)':
  id==='fps-metrics'?'(?:fps|benchmark|performance|p95)':
  id==='waypoint'?'(?:bussola|navegacao|waypoint|ir para casa)':'(?:voxel|minecraft|mundo de blocos)';
 return new RegExp('\\b(?:sem|nao quero|nao usar|dispensar|evitar|excluir|desativar)\\s+(?:(?:o|a|os|as|um|uma)\\s+)?'+topic+'\\b').test(line);
};
function inspect(spec={},gdd='',command=''){
 const result={version:22,kind:'PRISMAL_VOXEL_KNOWLEDGE',applicable:isVoxel(gdd,command),
  targetGenre:spec?.genre||'indefinido',items:[],counts:{prototipo:0,parcial:0,pendente:0},
  source:'https://github.com/jogoiarexx-blip/Prismal-voxel',
  warning:'Sem motor voxel exportável no GameForge. Protótipos de regras não são prova de jogabilidade; P2P e metas de FPS exigem testes reais.'};
 if(!result.applicable)return result;
 const fragments=[];
 for(const [kind,source] of [['GDD',gdd],['Comando',command]]){
  String(source||'').split(/\r?\n/).slice(0,1000).forEach((line,i)=>{
   for(const fragment of line.split(/[.;!?]/)){
    const value=normalize(fragment);
    if(value&&value.length<=3000)fragments.push({kind,line:i+1,excerpt:line.trim().slice(0,150),value});
   }
  });
 }
 for(const rule of patterns){
  let seen=null;
  for(const fragment of fragments)if(rule.regex.test(fragment.value)){
   seen=denied(fragment.value,rule.id)?null:fragment;
  }
  if(!seen)continue;
  result.counts[rule.status]++;
  result.items.push({id:rule.id,title:rule.title,status:rule.status,
   origin:{document:seen.kind,line:seen.line,excerpt:seen.excerpt},
   contract:rule.contract,test:rule.test,next:rule.next});
 }
 return result;
}
function report(plan){
 if(!plan?.applicable)return '# GF-TRAIN-22 — Pedido sem escopo voxel\n';
 const lines=['# GF-TRAIN-22 — Diagnóstico voxel inspirado no Prismal Voxel','',
  'Fonte: '+plan.source,
  'Motor escolhido: '+plan.targetGenre,'',
  '> **Atenção:** não foi criado um motor voxel completo. Os recursos marcados como protótipo são bibliotecas independentes, sem gameplay integrado.',
  '> O modo P2P de Prismal Voxel ainda é experimental e não pode ser tratado como cooperação pronta.','',
  'Resumo: '+plan.counts.prototipo+' protótipos, '+plan.counts.parcial+' parciais e '+plan.counts.pendente+' pendentes.',''];
 for(const item of plan.items){
  lines.push('## '+item.title+' — '+item.status,'','Origem: '+item.origin.document+' linha '+item.origin.line,
   'Contrato: '+item.contract,'Teste de referência: '+item.test,'Próxima implementação: '+item.next,'');
 }
 if(!plan.items.length)lines.push('Nenhum requisito específico foi identificado além de um pedido voxel genérico.');
 return lines.join('\n').slice(0,16000);
}
const api={isVoxel,inspect,report,rules:patterns.map(({id,title,status,contract,test})=>({id,title,status,contract,test}))};
root.GameForgeVoxelTraining=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
