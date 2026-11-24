/* GF-VOXEL-01: isolated builder, uses the same ZIP + HTML shell as GameForge. */
(function(root){
'use strict';
function generate(input){
 const title=String(input?.title||'Mundo Voxel').trim().slice(0,80)||'Mundo Voxel';
 const seed=Number(input?.seed);
 if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647)throw Error('A seed deve ser um inteiro entre 0 e 2147483647.');
 const kit=root.gameForgeVoxelKitFactory,world=root.gameForgeVoxelWorldFactory,boot=root.gameForgeVoxelBoot;
 if(!kit||!world||!boot||!root.GameForgeGenerator||!root.GameForgeThreeSource)throw Error('Módulos voxel indisponíveis.');
 const economy=root.gameForgeVoxelEconomyFactory||(typeof require==='function'?require('./voxel-economy.js'):null);
 if(typeof economy!=='function')throw Error('Módulo de fabricação ausente.');
 const mode=input?.mode==='resources'?'resources':'creative';
 const forest=mode==='resources'&&input?.forest===true;
 const spec={title,genre:'voxel',dimension:'3d',engineMode:'voxel-v1',voxel:{version:1,title,seed,mode,forest},stages:[mode==='resources'?'Coleta e fabricação':'Mundo criativo']};
 const source='/* GF-VOXEL-01 */\nconst GAME_SPEC = '+JSON.stringify(spec).replace(/<\//g,'<\\/')+';\n'+
  kit.toString()+'\n'+world.toString()+'\n'+economy.toString()+'\n('+boot.toString()+')();\n';
 const css=root.GameForgeGenerator.BASE_CSS+'\n@media(max-width:700px){.touch{gap:4px;flex-wrap:wrap}.touch button{min-height:40px}.head .stats{gap:6px}}';
 const files={'game.js':source,'style.css':css,'engine-3d.js':root.GameForgeThreeSource,
  'THREE-LICENSE.txt':root.GameForgeThreeLicense,
  'LEIA-VOXEL.md':'# GF-VOXEL-01\n\nSandbox criativo Three.js de 64 × 64 blocos horizontais, altura 160, com terreno de grama/terra/pedra por seed. Abra index.html com todos os arquivos juntos. WASD move, setas/arraste olham, Espaço pula, E minera, Q constrói; 1–3 selecionam material. Controles touch disponíveis. Salva posição e até 4096 edições localmente neste navegador, quando armazenamento disponível. Exportação sem CDN. Não inclui crafting, inimigos, fome, biomas complexos, mundo infinito, workers, P2P ou importação de saves Prismal. Requer WebGL. O modo criativo não consome materiais.\n'};
 if(mode==='resources')files['LEIA-VOXEL.md']='# GF-VOXEL-02 — Coleta e fabricação\n\nInventário de 12 slots com pilhas de até 99. Começa com terra e pedra. Minerar coleta um bloco; construir gasta um. I abre mochila, F equipa picareta, teclas 1–6 selecionam blocos, E minera e Q constrói. Faça bancada de pedra na mochila, coloque-a e fique a até 3 blocos para fabricar forno e picareta. Forno colocado transforma terra em tijolo. Pedra exige picareta equipada. O forno é uma estação de receita imediata (sem combustível ou tempo de cozimento). Save local independente do modo criativo; guarda inventário, ferramenta e edições. Sem fome, criaturas, árvores, P2P ou mundo infinito.\n';
 if(forest)files['LEIA-VOXEL.md']+='\nGF-VOXEL-03: árvores por seed. Mire em tronco ou folhas e mine para obter três madeiras e uma muda (inventário deve ter espaço). Tecla 8 seleciona madeira; 0 seleciona muda. Plante em grama ou terra com espaço livre. A muda cresce após 20 segundos de simulação ativa; se houver obstáculo ou jogador, aguarda. O save inclui árvores, mudas e tempo restante e é separado do modo sem floresta. Folhas desaparecem no corte; sem animação física de queda.\n';
 files['index.html']=root.GameForgeGenerator.shell(title,css,source,false,files);
 return files;
}
root.GameForgeVoxelBuilder={generate};
if(typeof module!=='undefined')module.exports=root.GameForgeVoxelBuilder;
})(typeof globalThis!=='undefined'?globalThis:this);
