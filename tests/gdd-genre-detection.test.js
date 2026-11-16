'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Parser=require('../js/parser');

const goldeneyeGdd=[
 '# GOLDENEYE 077 — Missões de espionagem',
 '## Visão geral',
 'FPS tático de espionagem em 3D. O agente infiltra bases e enfrenta guardas.',
 '## Câmera e controles',
 'Jogabilidade 100% em primeira pessoa: WASD, mouse, mira, pistolas e munição.',
 '## Fases',
 'Entrar no complexo, alcançar a aeronave, escapar pelo corredor e plataforma de lançamento.',
 '## Cinemáticas',
 'Pular a abertura é permitido. Há uma corrida até o elevador.',
 '## Desempenho',
 'Meta 60 FPS em PC, 30 FPS em celulares.'
].join('\n');
test('GoldenEye 077 é reconhecido automaticamente como FPS 3D, apesar de termos de outros gêneros',()=>{
 const spec=Parser.parseGdd(goldeneyeGdd,'',{dimension:'auto',genre:'auto'});
 assert.equal(spec.genre,'fps');
 assert.equal(spec.dimension,'3d');
 assert.equal(spec.genreInference.genre,'fps');
 assert.equal(spec.genreInference.confidence,'alta');
 assert.ok(spec.genreInference.signals.some(x=>/primeira pessoa|FPS/.test(x)));
});

test('apenas referência e gameplay de GoldenEye sem palavra 3D infere FPS e sua dimensão',()=>{
 const spec=Parser.parseGdd('# GoldenEye 077\nAgente secreto usa pistola para infiltrar instalação e mirar guardas.', '', {dimension:'auto',genre:'auto'});
 assert.equal(spec.genre,'fps');
 assert.equal(spec.dimension,'3d');
});
test('jogo de naves não vira FPS por meta de 60 FPS',()=>{
 const doc='# Armada Celeste\n## Gênero\nNavinha espacial shoot em up 2D com inimigos e chefão.\n## Performance\nAlvo: 60 FPS, no celular 30 FPS.';
 const spec=Parser.parseGdd(doc);
 assert.equal(spec.genre,'shooter');
 assert.equal(spec.dimension,'2d');
});
test('navinha 3D com desempenho em FPS mantém o motor de naves',()=>{
 const spec=Parser.parseGdd('# Esquadrão\nJogo de nave 3D com ondas e combate espacial. Meta 60 FPS.');
 assert.equal(spec.genre,'shooter');
 assert.equal(spec.dimension,'3d');
});
test('aeronave não se confunde com nave espacial e corrida a pé não vira corrida de carros',()=>{
 const doc='# Operação Sombra\nFPS de espionagem: infiltrar base, recuperar aeronave, corrida a pé e caminhada silenciosa.';
 const spec=Parser.parseGdd(doc);
 assert.equal(spec.genre,'fps');
 assert.equal(spec.dimension,'3d');
 const wordOnly=Parser.detectGenreInfo('# Aventura de espionagem\nOperação em aeronave; correr pelo caminho até o hangar.');
 assert.notEqual(wordOnly.genre,'shooter');
 assert.notEqual(wordOnly.genre,'racing');
});
test('plataforma para pousar não vira platformer e jogo de corrida real continua sendo corrida',()=>{
 assert.equal(Parser.detectGenre('# Operação\nFPS tático 3D. Saltar da plataforma e pular as cutscenes.'),'fps');
 assert.equal(Parser.detectGenre('# Voltas\nJogo de corrida de carros em circuito. Acelerar e frear.'),'racing');
 assert.equal(Parser.detectGenre('# Ilhas\nJogo de plataforma 3D: salto duplo entre plataformas.'),'platform');
});
test('seleção manual divergente é preservada, mas o Studio explica a diferença',()=>{
 const spec=Parser.parseGdd(goldeneyeGdd,'',{dimension:'3d',genre:'shooter'});
 assert.equal(spec.genre,'shooter');
 assert.equal(spec.genreInference.genre,'fps');
 assert.match(spec.genreOverrideWarning,/O GDD indica.*FPS/);
 assert.match(spec.genreOverrideWarning,/selecionado manualmente/);
 assert.ok(spec.limitations.some(v=>v.includes('Detectar pelo GDD')));
});
test('motor 3D incompatível não substitui o gênero detectado por arena',()=>{
 assert.throws(
  ()=>Parser.parseGdd('# Fortaleza\nTower defense 3D. Construir torres e defender base.'),
  /ainda não possui motor 3D/
 );
});
test('importação e substituição integral de GDD ativam classificação automática',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(app,/function enableAutoDetection\(\)/);
 assert.match(app,/const value=await file\.text\(\);[\s\S]*?enableAutoDetection\(\);[\s\S]*?const parsed=analyze\(\)/);
 assert.match(app,/addEventListener\('paste',[\s\S]*?replacingWhole[\s\S]*?enableAutoDetection\(\)/);
 assert.match(app,/spec\.genreOverrideWarning/);
 assert.match(app,/generatedGdd===md\?GameForgeProject\.activeSpec/);
});
