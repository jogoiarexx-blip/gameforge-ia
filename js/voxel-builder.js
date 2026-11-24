/* GF-VOXEL-01: isolated builder, uses the same ZIP + HTML shell as GameForge. */
(function(root){
'use strict';
function generate(input){
 const title=String(input?.title||'Mundo Voxel').trim().slice(0,80)||'Mundo Voxel';
 const seed=Number(input?.seed);
 if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647)throw Error('A seed deve ser um inteiro entre 0 e 2147483647.');
 const kit=root.gameForgeVoxelKitFactory,world=root.gameForgeVoxelWorldFactory,boot=root.gameForgeVoxelBoot;
 if(!kit||!world||!boot||!root.GameForgeGenerator||!root.GameForgeThreeSource)throw Error('Módulos voxel indisponíveis.');
 const spec={title,genre:'voxel',dimension:'3d',engineMode:'voxel-v1',voxel:{version:1,title,seed},stages:['Mundo criativo']};
 const source='/* GF-VOXEL-01 */\nconst GAME_SPEC = '+JSON.stringify(spec).replace(/<\//g,'<\\/')+';\n'+
  kit.toString()+'\n'+world.toString()+'\n('+boot.toString()+')();\n';
 const css=root.GameForgeGenerator.BASE_CSS+'\n@media(max-width:700px){.touch{gap:4px;flex-wrap:wrap}.touch button{min-height:40px}.head .stats{gap:6px}}';
 const files={'game.js':source,'style.css':css,'engine-3d.js':root.GameForgeThreeSource,
  'THREE-LICENSE.txt':root.GameForgeThreeLicense,
  'LEIA-VOXEL.md':'# GF-VOXEL-01\n\nSandbox criativo Three.js de 64 × 64 blocos horizontais, altura 160, com terreno de grama/terra/pedra por seed. Abra index.html com todos os arquivos juntos. WASD move, setas/arraste olham, Espaço pula, E minera, Q constrói; 1–3 selecionam material. Controles touch disponíveis. Salva posição e até 4096 edições localmente neste navegador, quando armazenamento disponível. Exportação sem CDN. Não inclui crafting, inimigos, fome, biomas complexos, mundo infinito, workers, P2P ou importação de saves Prismal. Requer WebGL. O modo criativo não consome materiais.\n'};
 files['index.html']=root.GameForgeGenerator.shell(title,css,source,false,files);
 return files;
}
root.GameForgeVoxelBuilder={generate};
if(typeof module!=='undefined')module.exports=root.GameForgeVoxelBuilder;
})(typeof globalThis!=='undefined'?globalThis:this);
