const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const Parser=require('../js/parser');
const intent=require('../js/intent-compiler');
require('../js/runtime-template');
require('../js/shooter-runtime');
require('../js/world-rules');
require('../js/three-runtime');
require('../js/shooter-3d-runtime');
require('../js/software-renderer');
require('../js/strategy-rules');
require('../js/expanded-2d-runtime');
require('../js/advanced-td-rules');
require('../js/advanced-td-runtime');
require('../vendor/three-source');
const Generator=require('../js/generator');
const Project=require('../js/project-backup');

function generatedSpec(files){
 const match=/const GAME_SPEC = (\{[^\n]*\});/.exec(files['game.js']);
 assert.ok(match,'GAME_SPEC must be embedded in executable JS');
 return JSON.parse(match[1]);
}
test('comando simples sem GDD cria nave 3D jogavel e compila quantidade, ondas, chefes, velocidade e ambiente',()=>{
 const text='Crie um jogo de navinha 3D com cinco fases, quatro ondas por fase, chefe somente na última, nave mais rápida e ambiente neon.';
 const spec=Parser.parseGdd('',text,{dimension:'auto',genre:'auto'});
 assert.equal(spec.title,'Jogo de Nave 3D');assert.equal(spec.genre,'shooter');assert.equal(spec.dimension,'3d');
 assert.equal(spec.stages.length,5);assert.equal(spec.tuning.playerSpeedMultiplier,1.25);
 assert.equal(spec.worldOptions.theme,'neon');
 assert.deepEqual(spec.stageConfig.map(x=>x.waves),[4,4,4,4,4]);
 assert.deepEqual(spec.stageConfig.map(x=>x.boss),['no','no','no','no','yes']);
 assert.equal(spec.implementation.source,'comando');
 const files=Generator.generate(spec,'');
 const exported=generatedSpec(files);
 assert.deepEqual(exported.stageConfig,spec.stageConfig);
 assert.match(files['game.js'],/gameForgeShooter3DBoot/);
 assert.doesNotThrow(()=>new vm.Script(files['game.js']));
 assert.match(files['RELATORIO_GERACAO.md'],/Traduzido para o c[oó]digo/i);
});
test('GDD de varias seções configura cada fase sem vazar para a seguinte',()=>{
 const gdd='# Operação Aurora\n## Fase 1 — Pátio\n10 inimigos\n## Fase 2 — Resistência\nSobreviver 60 segundos\n## Fase 3 — Boss\nchefe na fase 3';
 const spec=Parser.parseGdd(gdd,'',{dimension:'3d',genre:'arena'});
 assert.equal(spec.stageConfig[0].enemies,10);
 assert.equal(spec.stageConfig[1].mission,'survive');
 assert.equal(spec.stageConfig[1].seconds,60);
 assert.equal(spec.stageConfig[2].boss,'yes');
 assert.equal(spec.stageConfig[0].mission,undefined);
 assert.equal(spec.stageConfig[0].boss,undefined);
});
test('corrida 3D recebe voltas jogaveis; elementos de outros generos ficam pendentes',()=>{
 const spec=Parser.parseGdd('','Crie corrida 3D com três fases e quatro voltas por fase.',{dimension:'auto',genre:'auto'});
 assert.equal(spec.genre,'racing');assert.deepEqual(spec.stageConfig.map(s=>s.laps),[4,4,4]);
 assert.ok(spec.implementation.applied.some(x=>x.id==='laps'));
 const other=Parser.parseGdd('','Jogo de plataforma 3D com 4 ondas de inimigos.',{dimension:'3d',genre:'platform'});
 assert.ok(other.implementation.pending.some(x=>x.id==='waves'));
});
test('pedido com mais ondas que o limite nao causa estouro e registra a reducao',()=>{
 const spec=Parser.parseGdd('','Crie navinha 3D com 99 fases e 80 ondas por fase.',{dimension:'3d',genre:'shooter'});
 assert.equal(spec.stages.length,30);assert.equal(spec.stageConfig[0].waves,6);
 assert.ok(spec.implementation.warnings.some(x=>x.includes('99')));
 assert.ok(spec.implementation.warnings.some(x=>x.includes('80')));
});
test('regras nao implementadas ficam explicitamente pendentes, sem afirmar geracao de codigo',()=>{
 const spec=Parser.parseGdd('# RPG 3D\nQuero arvore de habilidades, crafting e multiplayer.','',{dimension:'3d',genre:'rpg'});
 const pending=spec.implementation.pending.map(x=>x.id);
 assert.ok(pending.includes('skill-tree'));assert.ok(pending.includes('craft'));assert.ok(pending.includes('network'));
 assert.ok(!spec.implementation.applied.some(x=>x.id==='skill-tree'));
});
test('comando recente prevalece sobre GDD antigo com aviso e titulo original preservado',()=>{
 const spec=Parser.parseGdd('# GOLDENEYE\n## FPS 3D\n## Fase 1 — Vila','Crie jogo de navinha 3D com 5 fases.',{dimension:'auto',genre:'auto'});
 assert.equal(spec.genre,'shooter');assert.equal(spec.dimension,'3d');
 assert.equal(spec.stages.length,5);assert.equal(spec.stages[0],'Fase 1');
 assert.match(spec.sourceConflict,/GDD carregado/);
});
test('instrucoes da IA incluem contrato de implementacao real e lista de pendencias',()=>{
 const spec=Parser.parseGdd('','Crie um RPG 2D com quatro fases e árvore de habilidades.',{dimension:'2d',genre:'rpg'});
 const prompt=Parser.creationInstruction(spec,'Respeite os controles e salve o progresso.');
 assert.match(prompt,/Escreva código funcional/);
 assert.match(prompt,/Pendências que exigem implementação real/);
 assert.ok(prompt.endsWith('Respeite os controles e salve o progresso.'));
});
test('report de interpretacao e arquivos documentais cabem no backup sem perder o comando',()=>{
 const request='Crie um jogo de navinha 3D com 4 ondas e chefão no final';
 const spec=Parser.parseGdd('',request,{dimension:'3d',genre:'shooter'});
 const code=Generator.generate(spec,'');
 const report=intent.report(spec);
 assert.match(report,/Configurações implementadas/);
 const files={...code,'PLANO_INTERPRETACAO.md':report,'COMANDO_ORIGINAL.md':'# Comando original\n'+request};
 const back=Project.decode(Project.encode({name:'Teste',gdd:'',instruction:request,files}));
 assert.equal(back.files['PLANO_INTERPRETACAO.md'],report);
 assert.ok(back.files['COMANDO_ORIGINAL.md'].includes(request));
});
test('a interface carrega o compilador antes do parser, e cria sem GDD',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 const app=fs.readFileSync(require.resolve('../js/app.js'),'utf8');
 assert.ok(html.indexOf('intent-compiler.js')<html.indexOf('parser.js'));
 assert.match(app,/if\(!md&&!command\)/);
 assert.match(app,/PLANO_INTERPRETACAO\.md/);
});
