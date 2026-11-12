/* Leitor determinístico de GDD. Sem APIs, sem modelos externos. */
(function (root) {
  'use strict';
  const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function detectGenre(text) {
    const t = normalize(text);
    const tests = {
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
  function parseGdd(md, instruction = '') {
    const source = String(md || '').slice(0, 100000);
    const extra = String(instruction || '').slice(0, 12000);
    const lines = source.split(/\r?\n/);
    const headings = lines.filter(x => /^#{1,6}\s+\S/.test(x)).map(x => x.replace(/^#{1,6}\s+/, '').trim());
    const title = (lines.find(x => /^#\s+\S/.test(x)) || '').replace(/^#\s+/, '').trim() || 'Meu jogo';
    const combined = source + '\n' + extra;
    const norm = normalize(combined);
    const genre = detectGenre(combined);
    const levelHeads = headings.filter(x => /\b(fase|missao|ato|capitulo|level|stage)\s*[0-9ivx]+\b/i.test(normalize(x)));
    const levels = unique(levelHeads).slice(0, 8);
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
      arena: { bg: '#11192b', accent: '#73f7ce', ground: '#1b2d43', enemy: '#ff7474' }
    };
    return {
      title: title.slice(0, 90), genre, stages,
      summary: headings.slice(0, 14), enemyNames, features, world,
      sourceLength: source.length, instructions: extra,
      colors: colorPalettes[genre],
      detected: [`Gênero: ${genre === 'racing' ? 'Corrida' : genre === 'platform' ? 'Plataforma' : 'Aventura / ação'}`,
        `${stages.length} fase(s)`, `${enemyNames.length} nome(s) de inimigos encontrados`,
        ...Object.keys(features).filter(k => features[k]).map(k => ({inventory:'Inventário',enemies:'Inimigos',bosses:'Chefes',quests:'Objetivos',checkpoints:'Checkpoints',upgrades:'Melhorias',mobile:'Controles mobile',timer:'Cronômetro',audio:'Áudio previsto'})[k])],
      limitations: [
        'O gerador sem IA usa mecânicas pré-programadas e não interpreta regras inéditas livremente.',
        'Modelos 3D, personagens detalhados, animações GLB e narrativa completa exigem uma etapa adicional.',
        'Imagens, áudios e fases específicas mencionadas no GDD não são criados automaticamente neste modo.'
      ]
    };
  }
  root.GameForgeParser = { parseGdd, detectGenre };
  if (typeof module !== 'undefined') module.exports = root.GameForgeParser;
})(typeof globalThis !== 'undefined' ? globalThis : this);
