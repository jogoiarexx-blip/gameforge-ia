'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const parser=require('../js/parser.js');
const urban=require('../js/urban-design.js');
require('../js/world-rules.js');
require('../js/software-renderer.js');
require('../js/urban-rules.js');
require('../js/urban-runtime.js');
require('../vendor/three-source.js');
const generator=require('../js/generator.js');
const fs=require('node:fs');
const path=require('node:path');

// Excertos representativos dos três documentos enviados pelo usuário.
// Os originais não são copiados no gerador; o ZIP conserva a fonte integral.
const gdd3d=[
 '# GODFATHER WEB 3D — GDD COMPLETO PARA THREE.JS',
 '**Gênero:** ação criminal urbana 3D, terceira pessoa, mundo aberto por cidades, gestão de império e progressão de personagem.',
 '**Tecnologia-alvo:** Three.js + TypeScript + Vite, WebGL 2.',
 'Exploração: câmera de perseguição por trás do protagonista movida por mouse, ruas e entradas de interiores.',
 'Combate: tiro em terceira pessoa com retículo, colisões e munição.',
 'Veículos: entrar e sair, dirigir nas ruas, escapar da polícia.',
 'Império: dominar 36 negócios nas 3 cidades, defender propriedades.',
 'Campanha: 18 distritos, 24 missões, 3 chefes com 3 fases.',
 'A versão atual é Canvas 2D; tudo isso é ALVO 3D, não implementado no Three.js.',
 '## Vertical slice — Porto Velho',
 'Um bairro pequeno, um inimigo, negócio interativo, uma missão, HUD, pausa e save/load.'
].join('\n');
const gdd2d=[
 '# GODFATHER WEB EDITION — GDD COMPLETO',
 '**Plataforma atual:** browser desktop, HTML/CSS/Canvas 2D/JavaScript',
 'Godfather Web Edition é um jogo single-player de ação urbana em visão superior/oblíqua,',
 'com gerenciamento de império, combate armado, perseguição policial e domínio de negócios.',
 'Três cidades e 24 missões com território e imóveis.'
].join('\n');

test('GDD 3D é ação urbana em terceira pessoa e nunca FPS/corrida/arena',()=>{
 const x=parser.parseGdd(gdd3d,'',{dimension:'auto',genre:'auto'});
 assert.equal(x.genre,'urban-action');
 assert.equal(x.dimension,'3d');
 assert.equal(x.urbanProfile.camera,'third-person');
 assert.equal(x.genreInference.genre,'urban-action');
 assert.equal(x.genreInference.confidence,'alta');
 assert.equal(x.engineAvailability.status,'prototype');
 assert.equal(x.implementation.applied.length,8);
 assert.ok(x.implementation.pending.length>=3);
 assert.equal(x.implementation.audit.counts.implementada,0);
 assert.equal(x.implementation.audit.counts.configurada,8);
 assert.equal(x.implementation.audit.counts.pendente,x.implementation.pending.length);
 assert.ok(x.limitations.some(v=>/motor urbano 3D/i.test(v)));
 assert.deepEqual(x.urbanProfile.contentCounts,{cities:3,districts:18,businesses:36,missions:24,bosses:3});
 const files=generator.generate(x,gdd3d);
 assert.ok(files['game.js'].includes('function gameForgeUrban3DBoot'));
 assert.ok(files['game.js'].includes('GameForgeUrbanRules'));
 assert.ok(files['engine-3d.js']);
 assert.ok(files['SLICE_URBAN_3D.md'].includes('protótipo'));
 assert.equal(files['GDD_original.md'],gdd3d);
 assert.equal(x.stages.length,1,'URB-01 entrega somente uma missão, não inventa a campanha');
});

test('GDD original de Godfather continua sendo 2D, sem conversão forçada',()=>{
 const x=parser.parseGdd(gdd2d,'',{dimension:'auto',genre:'auto'});
 assert.equal(x.dimension,'2d');
 assert.equal(x.genre,'arena');
 assert.equal(x.engineAvailability,undefined);
});

test('pedido de conversão do documento 2D para urbano Three.js preserva o gênero',()=>{
 const command='Transforme o Godfather em ação criminal urbana 3D em terceira pessoa, com cidade, veículos, polícia, negócio e missão.';
 const x=parser.parseGdd(gdd2d,command,{dimension:'auto',genre:'auto'});
 assert.equal(x.genre,'urban-action');
 assert.equal(x.dimension,'3d');
 assert.equal(x.urbanProfile.engineStatus,'prototype');
});

test('referências a veículos ou cidade não convertem FPS de espionagem em urbano',()=>{
 const fps=parser.parseGdd('# GoldenEye 077\nFPS 3D tático em primeira pessoa. Guardas, armas, veículos e espionagem com missões.');
 assert.equal(fps.genre,'fps');
 assert.equal(fps.dimension,'3d');
 const race=parser.parseGdd('# Turbo\nJogo de corrida 3D com carro, rua, pistas e polícia.');
 assert.equal(race.genre,'racing');
 const nave=parser.parseGdd('# Galactic\nJogo de naves espaciais 3D com cidades, bombas e inimigos.');
 assert.equal(nave.genre,'shooter');
});

test('terceira pessoa genérica sem império urbano não é confundida com crime urbano',()=>{
 const x=parser.parseGdd('# Exploração da Floresta\nAventura 3D em terceira pessoa com animais e combate.');
 assert.notEqual(x.genre,'urban-action');
});

test('plano expõe origem/linha, limites e não inventa sistemas implementados',()=>{
 const x=urban.inspect(gdd3d);
 assert.equal(x.identified,true);
 assert.ok(x.evidence.some(e=>e.document==='GDD'&&e.line===2));
 const combat=x.requirements.find(r=>r.id==='combat');
 assert.equal(combat.status,'partial');
 assert.equal(combat.origin.document,'GDD');
 assert.ok(combat.origin.line>0);
 const s=urban.report(x);
 assert.match(s,/VERTICAL SLICE URB-01 JOGÁVEL/);
 assert.match(s,/36/);
 assert.match(s,/vertical slice/i);
 assert.match(s,/não é a campanha completa/i);
 assert.doesNotMatch(s,/funcionalidade urbana implementada/i);
});

test('seleção manual permanece possível, com alerta de incompatibilidade do GDD',()=>{
 const x=parser.parseGdd(gdd3d,'',{dimension:'3d',genre:'fps'});
 assert.equal(x.genre,'fps');
 assert.equal(x.genreInference.genre,'urban-action');
 assert.match(x.genreOverrideWarning,/O GDD indica/);
});

test('interface e gerador exibem planejamento e impedem jogo urbano falso',()=>{
 const h=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const gen=fs.readFileSync(path.join(__dirname,'../js/generator.js'),'utf8');
 assert.match(h,/src="\.\/js\/urban-design\.js"/);
 assert.ok(h.indexOf('urban-design.js')<h.indexOf('parser.js'));
 assert.match(h,/id="download-urban-plan"/);
 assert.match(app,/download-urban-plan'\)\.addEventListener\('click'/);
 assert.match(app,/GAME_DESIGN_CONTRACT\.json/);
 assert.match(app,/PLANO_URBAN_ACTION\.md/);
 assert.match(app,/GDD_original\.md/);
 assert.match(gen,/spec\?\.genre==='urban-action'/);
});
