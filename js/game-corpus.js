/* GameForge GF-003: corpus curado de exemplos dos jogos do proprietário.
 * São metadados e interpretações técnicas, NÃO código importado nem GDDs copiados.
 * Cada caminho aponta para um arquivo realmente consultado em 16/11/2026.
 */
(function(root){
'use strict';
const examples=[
 {id:'goldeneye-077',repository:'goldeneye-077',path:'GOLDENEYE_007_REMASTER_GDD_COMPLETO_v1_0.md',genre:'fps',dimension:'3d',aliases:['goldeneye 007','goldeneye 077'],
  evidence:'FPS de infiltração com primeira pessoa, guardas, mira e objetivos por dificuldade.',
  lessons:['Objetivos tipados por missão e dificuldade','IA de guardas e detecção','Separar roteiro de lógica de combate'],unsupported:['objetivos interativos de modem, alarme e terminal']},
 {id:'neon-sky-force',repository:'Neon-Sky-Force',path:'js/core/stage-manifest.js',genre:'shooter',dimension:'2d',aliases:['neon sky force'],
  evidence:'Manifesto de fases carregadas sob demanda com boss e paleta por fase.',
  lessons:['Índice de fases separado do conteúdo de cada fase','Pré-carregamento sob demanda'],unsupported:['todos os padrões de onda específicos']},
 {id:'dragon-fury',repository:'Dragon-Fury',path:'boss-system.js',genre:'shooter',dimension:'2d',aliases:['dragon fury'],
  evidence:'Boss com estados, fases de vida e marcador destroyed para impedir recompensa duplicada.',
  lessons:['Morte idempotente de boss','Transições em limiares de HP','Padrões de ataque por arquétipo'],unsupported:['todos os arquétipos e sprites originais']},
 {id:'folclorevania',repository:'Folclorevania',path:'js/systems/skillTree.js',genre:'platform',dimension:'2d',aliases:['folclorevania'],
  evidence:'Habilidades com níveis máximos, requisitos entre nós e serialização.',
  lessons:['Árvore de habilidades por dados com pré-requisitos','Validação e migração de save'],unsupported:['árvore de habilidades completa no GameForge']},
 {id:'brumaria',repository:'Asas-de-Brumaria',path:'src/entities/dragonClipMap.js',genre:'arena',dimension:'3d',aliases:['asas de brumaria','brumaria elo dos dragoes','brumaria'],
  evidence:'Aventura 3D de voo e montaria; mapeamento de clipes GLB por ações e fallback.',
  lessons:['Separar animações de estados de gameplay','Verificar clips antes de atribuir movimento','Limitar recursos 3D em aparelhos móveis'],unsupported:['montarias animadas e voo livre no GameForge']},
 {id:'godfather',repository:'Godfather',path:'GDD_GODFATHER_COMPLETO.md',genre:'arena',dimension:'2d',aliases:['godfather web edition','godfather'],
  evidence:'Ação urbana em câmera superior/oblíqua, combate, economia, territórios e progressão.',
  lessons:['Diferenciar top-down urbano de FPS','Economia integrada a personagem e propriedades'],unsupported:['império territorial e cidade aberta completa']},
 {id:'carga-pesada',repository:'Carga-pesada',path:'source/docs/CARGA_PESADA_GDD_AUDITORIA_v1.0.md',genre:'racing',dimension:'3d',aliases:['carga pesada'],
  evidence:'Direção de caminhões em 3D com fretes, oficina, rivais e personalização.',
  lessons:['Distinguir direção arcade de FPS e corrida a pé','Fretes exigem sistema de objetivos distinto de voltas'],unsupported:['entregas, garagem e frota com economia completa']},
 {id:'brinquedos-pesadelos',repository:'Brinquedo-x-pesadelos-',path:'GDD.md',genre:'lane-defense',dimension:'2d',aliases:['brinquedos vs pesadelos','brinquedo x pesadelos'],
  evidence:'Defesa por linhas e grade 2D; GDD rejeita explicitamente câmera 3D.',
  lessons:['Respeitar itens fora de escopo','Não confundir negação de 3D com exigência de 3D'],unsupported:['todas as unidades e fases roteirizadas']},
 {id:'grim-grove',repository:'Grim-Grove-Survivor',path:'js/stages/stage-01.js',genre:'arena',dimension:'2d',aliases:['grim grove survivor'],
  evidence:'Dados de fases com biome, boss, inimigos e caminhos para sprites/atlases.',
  lessons:['Dados de fase desacoplados do renderer','Referências de assets rastreáveis por fase'],unsupported:['loader de sprites dinâmicos deste projeto']},
 {id:'madruga-survival',repository:'Madruga-Survival',path:'src/characters/player-facing.js',genre:'arena',dimension:'3d',aliases:['madruga survival'],
  evidence:'Rotação visual do personagem calculada independentemente da câmera WASD.',
  lessons:['Não inverter movimentação ao orientar a malha','Priorizar olhar da arma ao atacar'],unsupported:['animação dos rigs e inventário completo']}
];
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const freeze=Object.freeze(examples.map(item=>Object.freeze({...item,
 sourceUrl:'https://github.com/jogoiarexx-blip/'+item.repository+'/blob/main/'+item.path,
 aliases:Object.freeze(item.aliases.slice()),lessons:Object.freeze(item.lessons.slice()),
 unsupported:Object.freeze(item.unsupported.slice())
})));
function match(text){
 const raw=String(text||'').slice(0,1500);
 const first=clean(raw.split(/\r?\n/).slice(0,4).join(' '));
 if(!first)return null;
 for(const row of freeze){
  if(row.aliases.some(alias=>{
   const needle=clean(alias);
   if(needle.length<7)return false;
   // Não classificar como o jogo original quando aparece apenas como referência.
   const offset=first.indexOf(needle);
   if(offset<0)return false;
   const prior=first.slice(Math.max(0,offset-30),offset);
   return !/(inspirad[oa]s?|referencia|parecid[oa]s?|semelhant[ea]s?|tipo|igual|estilo|baseado em)\s+(?:n[oa]s?|em|de)?\s*$/.test(prior);
  }))return row;
 }
 return null;
}
function forGenre(genre,limit=3){
 return freeze.filter(e=>e.genre===genre).slice(0,Math.max(0,Math.min(8,limit)));
}
function report(rows=freeze){
 return '# Referências reais: catálogo de interpretação\n\n'+rows.map(e=>
  '## '+e.repository+'\n- Fonte verificada: '+e.sourceUrl+'\n- Classificação-base: '+e.genre+' '+e.dimension+
  '\n- Evidência: '+e.evidence+'\n- Técnicas úteis: '+e.lessons.join('; ')+
  '\n- Não implementado automaticamente: '+e.unsupported.join('; ')+'\n').join('\n');
}
const api={entries:freeze,match,forGenre,report};
root.GameForgeGameCorpus=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
