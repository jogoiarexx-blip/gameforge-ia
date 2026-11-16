'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const corpus=require('../js/game-corpus.js');
const parser=require('../js/parser.js');
const knowledge=require('../js/repository-knowledge.js');
const intent=require('../js/intent-compiler.js');

// Todos os exemplos abaixo são resumos autorais curtos dos arquivos inspecionados;
// os GDDs originais continuam nos repositórios indicados no manifesto.
const fixtures=[
 {id:'goldeneye-077',genre:'fps',dimension:'3d',gdd:'# GOLDENEYE 007 — REMASTERED\nFPS tático de espionagem 3D, câmera em primeira pessoa. Infiltrar instalação, guardas armados, alarmes, dispositivos e objetivos de missão.'},
 {id:'brinquedos-pesadelos',genre:'lane-defense',dimension:'2d',gdd:'# BRINQUEDOS VS. PESADELOS\nTower defense por linhas e grade 2D, selecione brinquedos, colete recursos, defenda a base. Fora de escopo: RPG, câmera 3D, multiplayer e mundo aberto.'},
 {id:'godfather',genre:'arena',dimension:'2d',gdd:'# GODFATHER WEB EDITION\nJogo de ação urbana em visão superior/oblíqua com combate, imóveis, polícia, negócios e upgrades. Canvas 2D, metas de 60 FPS e sprites.'},
 {id:'carga-pesada',genre:'racing',dimension:'3d',gdd:'# CARGA PESADA\nJogo 3D de carreira de caminhoneiro: fretes, corridas arcade, oficina, estradas e frota. Tráfego e direção arcade. Medir FPS para desempenho.'},
 {id:'folclorevania',genre:'platform',dimension:'2d',gdd:'# FOLCLOREVANIA\nMetroidvania Canvas 2D com correr, pular, dash, atacar, chefes e árvore de habilidades persistente.'},
 {id:'brumaria',genre:'arena',dimension:'3d',gdd:'# Brumária: Elo dos Dragões\nAventura 3D de voo, explorar ilhas com montarias e dragões. Animar GLB com idle, fly, glide e land. Jogador, missões e NPCs.'},
 {id:'dragon-fury',genre:'shooter',dimension:'2d',gdd:'# Dragon Fury\nJogo de nave com dragões 2D, ondas aéreas, tiros, inimigos em formações, chefes de fases, power-ups e progressão.'},
 {id:'neon-sky-force',genre:'shooter',dimension:'2d',gdd:'# Neon Sky Force\nShoot em up 2D com nave, ataques espaciais, chefes, ondas, tiros verticais e dez fases com manifestos.'},
 {id:'grim-grove',genre:'arena',dimension:'2d',gdd:'# Grim Grove Survivor\nJogo de arena 2D de sobrevivência com biomas, inimigos comuns, bosses e sprites por fase.'},
 {id:'madruga-survival',genre:'arena',dimension:'3d',gdd:'# Madruga Survival\nAventura 3D em terceira pessoa, personagem com controles WASD relativos à câmera e animação de ataque.'}
];
test('corpus versionado preserva fontes verificadas, caminhos e limites sem copiar GDDs integrais',()=>{
 assert.equal(corpus.entries.length,10);
 assert.equal(new Set(corpus.entries.map(x=>x.id)).size,corpus.entries.length);
 for(const item of corpus.entries){
  assert.match(item.sourceUrl,/^https:\/\/github\.com\/jogoiarexx-blip\//);
  assert.ok(item.path&&item.evidence&&item.lessons.length&&item.unsupported.length);
  assert.ok(item.genre&&item.dimension);
 }
 assert.ok(corpus.forGenre('fps').some(x=>x.id==='goldeneye-077'));
});
test('o parser identifica os 10 jogos reais por breves descrições com gênero e dimensão corretos',()=>{
 for(const x of fixtures){
  const parsed=parser.parseGdd(x.gdd,'',{genre:'auto',dimension:'auto'});
  assert.equal(parsed.genre,x.genre,x.id+': gênero');
  assert.equal(parsed.dimension,x.dimension,x.id+': dimensão');
  assert.equal(parsed.referenceGame?.id,x.id,x.id+': fonte reconhecida');
  assert.ok(['alta','media','baixa'].includes(parsed.genreInference.confidence));
  const report=intent.report(parsed);
  assert.match(report,/Fonte|Arquivo|referência|repositório/i);
  assert.ok(report.includes(parsed.referenceGame.url));
 }
});
test('GoldeneEye 007 não vira nave; FPS de desempenho não vira FPS de tiro',()=>{
 const fps=parser.parseGdd('# GoldenEye 077\nEspionagem FPS em primeira pessoa. O agente ataca guardas no laboratório; aeronave no hangar.');
 assert.equal(fps.genre,'fps');assert.equal(fps.dimension,'3d');
 const survival=parser.parseGdd('# Batalha da Cidade\nAção em visão superior e câmera oblíqua, lojas e inimigos. 60 FPS no computador.');
 assert.equal(survival.genre,'arena');assert.equal(survival.dimension,'2d');
 const freights=parser.parseGdd('# Fretes na Estrada\nCaminhões, direção arcade e corridas. Meta 30 FPS no celular.');
 assert.equal(freights.genre,'racing');
});
test('negações de câmera 3D e referências externas não forçam o motor incorreto',()=>{
 const td=parser.parseGdd('# Fortaleza de Brinquedos\nTower defense 2D por linhas: sem câmera 3D, sem mundo aberto.');
 assert.equal(td.genre,'lane-defense');assert.equal(td.dimension,'2d');
 assert.equal(corpus.match('# Jogo novo\nInspirado em GoldenEye 007, mas com nave espacial'),null);
 const newShip=parser.parseGdd('# Jogo Novo\nInspirado em GoldenEye 007, mas o jogo é navinha espacial 2D com ondas e power-ups.');
 assert.equal(newShip.genre,'shooter');assert.equal(newShip.dimension,'2d');
});
test('estilo solicitado manualmente permanece, com aviso quando diverge do GDD',()=>{
 const src=fixtures[0].gdd;
 const override=parser.parseGdd(src,'',{genre:'shooter',dimension:'3d'});
 assert.equal(override.genre,'shooter');
 assert.match(override.genreOverrideWarning,/O GDD indica/);
});
test('instruções para IA usam referência técnica sem prometer árvore de habilidades ou copiar assets',()=>{
 const spec=parser.parseGdd(fixtures[4].gdd);
 const prompt=parser.creationInstruction(spec,'Aprimorar o personagem');
 assert.ok(prompt.includes('Folclorevania'));
 assert.ok(prompt.includes('NÃO IMPLEMENTADOS')||prompt.includes('não gerados'));
 assert.ok(prompt.includes('Não copiar'));
 const report=intent.report(spec);
 assert.ok(report.includes('requisitos'));
});
test('repositórios com sistemas reutilizáveis entram na busca de referências do GameForge',()=>{
 const ids=['goldeneye-objectives-corpus','folclorevania-skilltree-corpus',
  'godfather-player-progression-corpus','brumaria-glb-animation-corpus',
  'neon-stage-manifest-corpus','grim-stage-assets-corpus'];
 const rows=knowledge.entries;const uniques=new Set(rows.map(x=>x.id));
 assert.equal(rows.length,uniques.size);
 for(const id of ids){
  const row=rows.find(x=>x.id===id);assert.ok(row,id);
  assert.ok(row.path&&row.verified&&row.verify&&row.guidance);
  assert.match(row.url,/^https:\/\/github\.com/);
 }
 const hits=knowledge.rank('Folclorevania habilidades rank pre requisitos salvar',20);
 assert.ok(hits.some(x=>x.id==='folclorevania-skilltree-corpus'));
});
test('browser carrega corpus antes do parser para preservar comportamento da CLI',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 assert.ok(html.indexOf('js/game-corpus.js')>0);
 assert.ok(html.indexOf('js/game-corpus.js')<html.indexOf('js/parser.js'));
});
