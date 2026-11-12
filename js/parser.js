/* Leitor determinístico de GDD. Sem APIs, sem modelos externos. */
(function (root) {
  'use strict';
  const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function detectGenre(text) {
    const t = normalize(text);
    if(/\b(block tower td|block tower defense|blocos? td|blocos? tower|torres? (em|de) blocos|defesa de blocos)\b/.test(t))return 'block-td';
    if(/(plants?\s*(vs\.?|versus)\s*zomb|plantas?\s*(contra|vs)\s*zumbis?|defesa por linhas|garden defense|defesa do jardim|jardim contra zumbis)/.test(t))return 'lane-defense';
    if(/\b(tower.?defen[cs]e|defesa de torres)\b/.test(t))return 'tower-defense';
    if(/\b(fps|first.person|primeira pessoa)\b/.test(t))return 'fps';
    if(/\b(rpg|role.playing|roguelike|roguelite)\b/.test(t))return 'rpg';
    const tests = {
      shooter: [/(navinha|nave(?:s)?\b|shoot.?em.?up|shmup|jogo de nave|space shooter|star fighter|tiro vertical|ataque espacial|combate aereo|scroll vertical|drag[aã]o.*atira|dragon fury|neon sky force)/g, 5],
      racing: [/(caminh|corrida|racing|road rash|veicul|carro|moto|truck|piloto|velocidade|oficina)/g, 2],
      platform: [/(plataforma|platformer|pular|salto|side.scroll|sidescroll|super mario|crash bandicoot)/g, 2],
      arena: [/(terror|horror|zumbi|rpg|shooter|tiro|monstro|sobreviven|combate|inventario|exploracao)/g, 1]
    };
    let best = 'arena', score = 0;
    for (const [type, [regex, factor]] of Object.entries(tests)) {
      const count = [...t.matchAll(regex)].length * factor;
      if (count > score) { score = count; best = type; }
    }
    return best;
  }
  function unique(items) { return [...new Set(items.map(x => x.trim()).filter(Boolean))]; }
  const labels={arena:'Aventura / ação',shooter:'Nave / shoot’em up vertical',racing:'Corrida',platform:'Plataforma',rpg:'RPG de ação',fps:'FPS / primeira pessoa','tower-defense':'Defesa de torres (caminhos)','lane-defense':'Defesa por linhas / Jardim','block-td':'Defesa de torres em blocos'};
  const styles={'2d':['arena','shooter','racing','platform','rpg','tower-defense','lane-defense','block-td'],'3d':['arena','fps','racing','platform']};
  function parseGdd(md, instruction = '', options = {}) {
    const source = String(md || ''); // GDD integral: nenhum corte silencioso
    const extra = String(instruction || '').slice(0, 12000);
    const lines = source.split(/\r?\n/);
    const headings = lines.filter(x => /^#{1,6}\s+\S/.test(x)).map(x => x.replace(/^#{1,6}\s+/, '').trim());
    const title = (lines.find(x => /^#\s+\S/.test(x)) || '').replace(/^#\s+/, '').trim() || 'Meu jogo';
    const combined = source + '\n' + extra;
    const norm = normalize(combined);
    const dimension=options.dimension&&options.dimension!=='auto'?options.dimension:/\b(3d|three\.?js|tres dimensoes|fps|primeira pessoa|first.person)\b/.test(norm)||options.genre==='fps'?'3d':'2d';
    let genre=options.genre&&options.genre!=='auto'?options.genre:detectGenre(combined);
    if(!styles[dimension])throw Error('Dimensão não compatível.');
    if(!styles[dimension].includes(genre)){
      if(options.genre&&options.genre!=='auto')throw Error('Estilo não compatível com '+dimension+'.');
      genre='arena';
    }
    const levelHeads = headings.filter(x => /\b(fase|missao|ato|capitulo|level|stage)\s*[0-9ivx]+\b/i.test(normalize(x)));
    const allLevels=unique(levelHeads);
    const stageLimit=genre==='lane-defense'?40:30;
    const levels = allLevels.slice(0, stageLimit);
    const features = {
      inventory: /inventario|item|colet[aá]v|mochila|loot/i.test(norm),
      enemies: /inimig|monstro|zumbi|chefe|boss|combate|ataque|tiro/i.test(norm),
      bosses: /chefe|boss/i.test(norm),
      quests: /missao|objetivo|fase|ato|capitulo|level/i.test(norm),
      checkpoints: /checkpoint|salvamento|save point|safe room/i.test(norm),
      upgrades: /upgrade|melhoria|loja|oficina|evolu|habilidade|level up|upar/i.test(norm),
      mobile: /mobile|celular|touch|android|toque/i.test(norm),
      timer: /tempo|cronometro|timer|contra o relogio/i.test(norm),
      audio: /som|audio|musica|trilha|sfx/i.test(norm),
    };
    const stages = levels.length ? levels : ['Fase 1 — Início', 'Fase 2 — Desafio', 'Fase 3 — Confronto'];
    let enemyNames = [];
    let inEnemies = false;
    for (const line of lines) {
      const h = line.match(/^#{1,6}\s+(.*)/);
      if (h) { inEnemies = /inimig|monstro|criatur|zumbi|chefe|boss/i.test(normalize(h[1])); continue; }
      if (inEnemies && /^\s*[-*+]\s+/.test(line)) {
        let item = line.replace(/^\s*[-*+]\s+/, '').replace(/\*\*/g, '').split(/[:–—]/)[0].trim();
        if (item && item.length <= 40) enemyNames.push(item);
      }
    }
    enemyNames = unique(enemyNames).slice(0, 12);
    const world = headings.find(x => /mundo|cenario|ambient|local|mapa/i.test(normalize(x))) || 'Mundo do jogo';
    const colorPalettes = {
      racing: { bg: '#132335', accent: '#f9bd4b', ground: '#243647', enemy: '#ff6b69' },
      platform: { bg: '#143e54', accent: '#65e0b7', ground: '#263b59', enemy: '#ff8a76' },
      shooter: { bg: '#050c25', accent: '#68f5ef', ground: '#1c2855', enemy: '#ff719d' },
      arena: { bg: '#11192b', accent: '#73f7ce', ground: '#1b2d43', enemy: '#ff7474' }
    };
    colorPalettes.rpg={bg:'#0c2524',accent:'#b7ef99',ground:'#204b39',enemy:'#e27d78'};
    colorPalettes['tower-defense']={bg:'#102631',accent:'#78dfdd',ground:'#294e50',enemy:'#e5a373'};
    colorPalettes['lane-defense']={bg:'#274f4e',accent:'#f2d985',ground:'#4d8266',enemy:'#c58f80'};
    colorPalettes['block-td']={bg:'#152f42',accent:'#9fdfc8',ground:'#376251',enemy:'#daa27a'};
    colorPalettes.fps=colorPalettes.arena;
    const shooterTheme = /dragon|dragao|drag[oõ]es|fogo|asas|harpia|reino|magia|medieval/.test(norm) ? 'dragon' : /neon|cyber|cidade futurista|sintetico|synthwave/.test(norm) ? 'neon' : 'space';
    const shooterOptions = { theme: shooterTheme, autofire: /tiro automatico|auto.?fire|disparo automatico/.test(norm), waves: /onda|wave|formac|esquadrao|enxame|ataque em v|zigzag|escolta/.test(norm), boss: genre === 'shooter' || features.bosses, powerups: genre === 'shooter', parallax: true };
    return {
      title: title.slice(0, 90), genre, dimension, stages, shooterOptions,
      defenseOptions:{mode:genre==='lane-defense'?'lane':genre==='block-td'?'blocks':'path',heightLevels:genre==='block-td'?3:0,upgradeChoices:genre==='block-td',
       resourceLabel:genre==='lane-defense'&&/\bbrilhos?\b/.test(norm)?'Brilhos':'Energia',
       startingGlow:genre==='lane-defense'?150:280,collectibleDrops:genre==='lane-defense',cardSystem:genre==='lane-defense'},
      campaign:{maxStages:stageLimit,detectedStages:allLevels.length,omittedStages:Math.max(0,allLevels.length-stageLimit)},
      worldOptions:{theme:['forest','desert','neon','ruins'].includes(options.theme)?options.theme:/neon|cyber|futur/.test(norm)?'neon':/deserto|desert|areia/.test(norm)?'desert':/ruina|horror|terror|templo/.test(norm)?'ruins':'forest',size:Number(options.size)===72?72:48,quality:['low','high'].includes(options.quality)?options.quality:'auto',seed:12345},
      summary: headings.slice(0, 14), enemyNames, features, world,
      sourceLength: source.length, sectionCount: headings.length, sectionsIndexed: headings.length, instructions: extra,
      colors: colorPalettes[genre],
      detected: [`Gênero: ${labels[genre]}`,`Dimensão: ${dimension.toUpperCase()}`,
        `${stages.length} fase(s) no protótipo`, `${headings.length} capítulos lidos`, `${enemyNames.length} nome(s) de inimigos encontrados`,
        ...Object.keys(features).filter(k => features[k]).map(k => ({inventory:'Inventário',enemies:'Inimigos',bosses:'Chefes',quests:'Objetivos',checkpoints:'Checkpoints',upgrades:'Melhorias',mobile:'Controles mobile',timer:'Cronômetro',audio:'Áudio previsto'})[k])],
      limitations: [
        ...(allLevels.length>stageLimit?[`O GDD contém ${allLevels.length} fases; este motor utiliza as primeiras ${stageLimit}. O documento original permanece completo.`]:[]),
        ...(dimension==='3d'?['O motor 3D usa cenários e personagens low poly procedurais com Three.js local; requer WebGL2. GLBs detalhados, animações importadas e campanha escrita livremente ainda exigem trabalho adicional.']:[]),
        ...(['lane-defense','block-td'].includes(genre)?['Dois motores originais de Tower Defense com regras predefinidas. Não copia personagens, nomes, arte, níveis nem unidades de jogos comerciais.']:[]),
        ...(genre === 'shooter' ? ['O shoot’em up usa desenhos e formações procedurais; não copia sprites nem reproduz campanhas específicas dos projetos usados como referência.', 'As fases possuem chefes, ondas e melhorias configuráveis, mas objetivos especiais descritos livremente no GDD exigem IA ou código manual.'] : []),
        'O gerador sem IA usa mecânicas pré-programadas e não interpreta regras inéditas livremente.',
        'Personagens detalhados, animações GLB e narrativa completa exigem uma etapa adicional.',
        'Imagens, áudios e fases específicas mencionadas no GDD não são criados automaticamente neste modo.'
      ]
    };
  }
  function creationInstruction(spec,instruction=''){
    const value=`Configuração escolhida no Studio: ${spec.dimension||'2d'}; estilo ${labels[spec.genre]||spec.genre}; ${spec.stages.length} fases. A implementação deve seguir este estilo e preservar os requisitos compatíveis do GDD.\n\n`+String(instruction);
    if(value.length>10000)throw Error('Configuração e instrução de IA ultrapassam 10.000 caracteres. Reduza a instrução adicional.');
    return value;
  }
  root.GameForgeParser = { parseGdd, detectGenre, labels, styles, creationInstruction };
  if (typeof module !== 'undefined') module.exports = root.GameForgeParser;
})(typeof globalThis !== 'undefined' ? globalThis : this);
