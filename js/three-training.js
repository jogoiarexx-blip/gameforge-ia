/* GF-TRAIN-19 — treino de regressão multigênero Three.js.
 * Reconhecimento determinístico, não treino dos pesos de IA.
 * Não altera engines nem garante que uma descrição seja implementada.
 */
(function(root){
'use strict';
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const EDITOR=new Set(['arena-3d','fps-3d','rpg-3d']);
const URBAN='urban-action-3d';
const rules=[
 {id:'scene-glb',title:'Posicionar GLB no cenário por fase',pattern:s=>
   /\b(glbs?|gltfs?|modelos? 3d)\b/.test(s)&&/\b(cenario|cena|fase|mapa|editor|posicionar|arrastar|colocar|inserir|adicionar)\b/.test(s),
   status:e=>EDITOR.has(e)?'manual':'pendente',
   contract:'SCENE3D_LAYOUT.json + GameForgeScene3DLayout + GameForgeGLB.decode',
   test:'tests/scene3d-glb.test.js',
   action:'Importar GLB como Cenário no Studio, posicionar pelo editor 3D, aplicar ao jogo e verificar o ZIP.'},
 {id:'glb-animation',title:'Personagem GLB com rig e animações',pattern:s=>
   /\b(glbs?|gltfs?|modelos? 3d)\b/.test(s)&&/\b(animad[oa]s?|animacoes?|andar|correr|atacar|ataque|rig|esqueleto|ossos?|retarget|t-pose|clips?)\b/.test(s),
   status:e=>e===URBAN?'parcial':'pendente',
   contract:'GameForgeActorAnimations no motor urbano; GLB importado não cria clips ausentes',
   test:'tests/actor-animations.test.js',
   action:'Inspecionar nomes, joints e clipes; testar idle/walk/run/attack/hit/death. Rigging ou retargeting não são automáticos.'},
 {id:'collision',title:'Colisão de objetos, paredes e modelos',pattern:s=>
   /\b(colisao|colisoes|colidir|colidindo|bloquear passagem|atravessar paredes?|atravessa paredes?)\b/.test(s)&&
   /\b(objetos?|glb|modelos?|paredes?|cenario|obstaculos?|construcoes?|mapas?)\b/.test(s),
   status:e=>EDITOR.has(e)?'manual':'pendente',
   contract:'GAME_SPEC.stageConfig[].sceneObjects + AABB; sem colisão por triângulos',
   test:'tests/scene3d-navigation.test.js',
   action:'Ativar colisão no editor, visualizar AABB e testar deslocamento real do jogador.'},
 {id:'route-check',title:'Verificação de caminho até a saída',pattern:s=>
   /\b(verificar|validar|checar|testar)\b.{0,45}\b(passagem|rotas?|caminhos?|saida|portal)\b/.test(s)||
   /\b(caminho bloqueado|caminhos bloqueados|rota bloqueada|saida bloqueada)\b/.test(s),
   status:e=>EDITOR.has(e)?'manual':'pendente',
   contract:'GameForgeScene3DNavigation.inspect (somente colisores do editor)',
   test:'tests/scene3d-navigation.test.js',
   action:'Usar Verificar passagem na fase; conferir obstáculos procedurais e objetivos dentro do jogo.'},
 {id:'alternate-paths',title:'Três caminhos ou rotas alternativas físicas',pattern:s=>
   /\b(caminhos? alternativos?|rotas? alternativas?|caminhos? secretos?|bifurcac(?:ao|oes)|tres caminhos|3 caminhos)\b/.test(s),
   status:()=> 'pendente',
   contract:'Seleções abstratas no shooter 3D não equivalem a corredores físicos navegáveis',
   test:'tests/stage-branches.test.js',
   action:'Criar três rotas geométricas jogáveis, pontos de encontro, recompensas, inimigos e checkpoints por percurso.'},
 {id:'mobile-controls',title:'Controles para celular e toque',pattern:s=>
   /\b(mobile|celular|android|ios|touch|toque|controles? na tela|controles? virtuais?)\b/.test(s),
   status:()=> 'parcial',
   contract:'Botões de toque/controles mobile básicos nos jogos exportados',
   test:'tests/browser-export-matrix.py',
   action:'Testar controles, orientação de tela, FPS e memória em aparelhos reais; não inferir qualidade por existência do HUD.'},
 {id:'checkpoints',title:'Checkpoints com progresso persistente',pattern:s=>
   /\b(checkpoints?|pontos? de salvamento|salvar progresso|salvamento por fase|continuar da ultima fase|respawn salvo)\b/.test(s),
   status:()=> 'pendente',
   contract:'Salvar economia/posição no protótipo urbano não implementa checkpoint genérico por fase',
   test:'tests/three-world.test.js',
   action:'Implementar checkpoints versionados por motor com restauração da fase, vida e inventário, e testar recarga.'},
 {id:'destruction',title:'Destruição física de cenário',pattern:s=>
   /\b(cenario destrutivel|paredes? destrutiveis|destruir paredes?|destruicao fisica|fisica de destruicao|quebrar paredes?|rigid.?body)\b/.test(s),
   status:()=> 'pendente',
   contract:'Sem motor de corpos rígidos/destruição dinâmica integrado a todos os motores 3D',
   test:'tests/three-world.test.js',
   action:'Projetar corpos rígidos, fragmentos, limites de física e fallback mobile; implementar testes de colisão.'},
 {id:'photo-to-glb',title:'Reconstruir modelo 3D a partir de fotografia',pattern:s=>
   /\b(foto|fotografia|imagem)\b.{0,38}\b(glb|modelo 3d|recriar|converter)\b/.test(s)||
   /\b(criar|recriar|converter)\b.{0,38}\b(glb|modelo 3d)\b.{0,30}\b(foto|fotografia|imagem)\b/.test(s),
   status:()=> 'pendente',
   contract:'O GameForge importa GLBs existentes, mas não faz fotogrametria nem reconstrução a partir de imagens',
   test:'tests/glb-readiness.test.js',
   action:'Necessita pipeline próprio de reconstrução; não confundir importação/inspeção GLB com geração 3D.'}
];
const skipped=/\b(sem|nao quero|nao usar|nao precisa|dispensar|evitar|remover|excluir|fora de escopo|nao implementar|desativar)\b/;
function passages(gdd,command){
 const result=[];
 for(const [source,content] of [['GDD',gdd],['Comando',command]]){
  const lines=String(content||'').split(/\r?\n/).slice(0,1200);
  lines.forEach((line,i)=>{
   if(line.length>3000)return;
   // Um comando posterior pode negar o que foi pedido no GDD.
   const fragments=line.split(/[.;!?]/).map(normalize).filter(Boolean);
   fragments.forEach(p=>result.push({source,line:i+1,excerpt:line.trim().slice(0,160),text:p}));
  });
 }
 return result;
}
function inspect(spec,gdd='',command=''){
 const engine=String(spec?.genre||'')+'-'+String(spec?.dimension||'');
 const result={version:19,engine,kind:'regression-coach',items:[],counts:{manual:0,parcial:0,pendente:0},
  note:'Classificação determinística de requisitos, não ajuste de pesos, geração automática de código ou prova de jogabilidade.'};
 if(spec?.dimension!=='3d')return result;
 const fragments=passages(gdd,command);
 for(const rule of rules){
  let matched=null;
  for(const fragment of fragments){
   if(!rule.pattern(fragment.text))continue;
   // Negação no mesmo fragmento se aplica ao requisito; não criar implementação imaginária.
   matched=skipped.test(fragment.text)?null:fragment;
  }
  if(!matched)continue;
  const status=rule.status(engine);result.counts[status]++;
  result.items.push({id:rule.id,title:rule.title,status,
   origin:{document:matched.source,line:matched.line,excerpt:matched.excerpt},
   contract:rule.contract,test:rule.test,action:rule.action});
 }
 return result;
}
function report(input){
 const plan=input||{version:19,engine:'desconhecido',items:[],counts:{manual:0,parcial:0,pendente:0}};
 const section=['# GF-TRAIN-19 — Diagnóstico de requisitos Three.js','',
  'Motor: '+plan.engine,'',
  '> O treinamento é um conjunto de regressões determinísticas. Não altera pesos de IA e não conclui mecânicas por reconhecer palavras.','',
  'Resumo: '+(plan.counts?.manual||0)+' exigem configuração manual; '+(plan.counts?.parcial||0)+' parciais; '+(plan.counts?.pendente||0)+' precisam de desenvolvimento.',''];
 for(const row of plan.items||[]){
  section.push('## '+row.title+' — '+row.status,'',
   'Origem: '+row.origin.document+' linha '+row.origin.line,
   'Contrato/limite: '+row.contract,
   'Teste de referência: '+row.test,
   'Próxima ação: '+row.action,'');
 }
 if(!plan.items?.length)section.push('Nenhum dos nove requisitos 3D específicos foi identificado neste pedido. Isso não significa que todos os outros estejam implementados.');
 return section.join('\n').slice(0,12000);
}
const API={inspect,report,rules:rules.map(({id,title,contract,test})=>({id,title,contract,test}))};
root.GameForgeThreeTraining=API;
if(typeof module!=='undefined')module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
