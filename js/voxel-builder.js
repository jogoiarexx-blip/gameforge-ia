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
 const advanced=mode==='resources'&&input?.advanced===true;
 const tools=mode==='resources'&&(input?.tools===true||advanced);
 const forest=mode==='resources'&&(input?.forest===true||tools);
 const survival=mode==='resources'&&input?.survival===true;
 const survivalFactory=root.gameForgeVoxelSurvivalFactory||(typeof require==='function'?require('./voxel-survival.js'):null);
 if(typeof survivalFactory!=='function')throw Error('Módulo de sobrevivência ausente.');
 const actorFactory=root.gameForgeVoxelActorsFactory||(typeof require==='function'?require('./voxel-actors.js'):null);
 if(typeof actorFactory!=='function')throw Error('Módulo visual ausente.');
 const storage=mode==='resources'&&input?.storage===true;
 const storageFactory=root.gameForgeVoxelStorageFactory||(typeof require==='function'?require('./voxel-storage.js'):null);
 if(typeof storageFactory!=='function')throw Error('Módulo de armazenamento ausente.');
 const toolsFactory=root.gameForgeVoxelToolsFactory||(typeof require==='function'?require('./voxel-tools.js'):null);
 if(typeof toolsFactory!=='function')throw Error('Módulo de ferramentas ausente.');
 const advancedFactory=root.gameForgeVoxelAdvancedFactory||(typeof require==='function'?require('./voxel-advanced.js'):null);
 if(typeof advancedFactory!=='function')throw Error('Módulo avançado ausente.');
 const size=[64,128,256].includes(Number(input?.size))?Number(input.size):64,landscape=input?.landscape===true,textures=input?.textures===true,quality=['low','medium','high'].includes(input?.quality)?input.quality:'medium';
 const landscapeFactory=root.gameForgeVoxelLandscapeFactory||(typeof require==='function'?require('./voxel-landscape.js'):null),textureFactory=root.gameForgeVoxelTextureFactory||(typeof require==='function'?require('./voxel-textures.js'):null),mesherFactory=root.gameForgeVoxelMesherFactory||(typeof require==='function'?require('./voxel-mesher.js'):null);
 if(!landscapeFactory||!textureFactory||!mesherFactory)throw Error('Módulos de paisagem indisponíveis.');
 const atlasFactory=root.gameForgeVoxelAtlasFactory||(typeof require==='function'?require('./voxel-atlas.js'):null);
 if(!atlasFactory)throw Error('Editor de atlas indisponível.');
 const atlas=typeof input?.atlas==='string'&&input.atlas?atlasFactory().encode(atlasFactory().decode(input.atlas)):null;
 const spec={title,genre:'voxel',dimension:'3d',engineMode:'voxel-v1',voxel:{version:1,title,seed,mode,forest,survival,storage,tools,advanced,size,landscape,textures:textures||!!atlas,quality,...(atlas?{atlas}:{})},stages:[mode==='resources'?'Coleta e fabricação':'Mundo criativo']};
 const source='/* GF-VOXEL-01 */\nconst GAME_SPEC = '+JSON.stringify(spec).replace(/<\//g,'<\\/')+';\n'+
  kit.toString()+'\n'+world.toString()+'\n'+economy.toString()+'\n'+survivalFactory.toString()+'\n'+actorFactory.toString()+'\n'+storageFactory.toString()+'\n'+toolsFactory.toString()+'\n'+advancedFactory.toString()+'\n'+landscapeFactory.toString()+'\n'+atlasFactory.toString()+'\n'+textureFactory.toString()+'\n'+mesherFactory.toString()+'\n('+boot.toString()+')();\n';
 const css=root.GameForgeGenerator.BASE_CSS+'\n@media(max-width:700px){.touch{gap:4px;flex-wrap:wrap}.touch button{min-height:40px}.head .stats{gap:6px}}';
 const files={'game.js':source,'style.css':css,'engine-3d.js':root.GameForgeThreeSource,
  'THREE-LICENSE.txt':root.GameForgeThreeLicense,
  'LEIA-VOXEL.md':'# GF-VOXEL-01\n\nSandbox criativo Three.js de 64 × 64 blocos horizontais, altura 160, com terreno de grama/terra/pedra por seed. Abra index.html com todos os arquivos juntos. WASD move, setas/arraste olham, Espaço pula, E minera, Q constrói; 1–3 selecionam material. Controles touch disponíveis. Salva posição e até 4096 edições localmente neste navegador, quando armazenamento disponível. Exportação sem CDN. Não inclui crafting, inimigos, fome, biomas complexos, mundo infinito, workers, P2P ou importação de saves Prismal. Requer WebGL. O modo criativo não consome materiais.\n'};
 if(mode==='resources')files['LEIA-VOXEL.md']='# GF-VOXEL-02 — Coleta e fabricação\n\nInventário de 12 slots com pilhas de até 99. Começa com terra e pedra. Minerar coleta um bloco; construir gasta um. I abre mochila, F equipa picareta, teclas 1–6 selecionam blocos, E minera e Q constrói. Faça bancada de pedra na mochila, coloque-a e fique a até 3 blocos para fabricar forno e picareta. Forno colocado transforma terra em tijolo. Pedra exige picareta equipada. O forno é uma estação de receita imediata (sem combustível ou tempo de cozimento). Save local independente do modo criativo; guarda inventário, ferramenta e edições. Sem fome, criaturas, árvores, P2P ou mundo infinito.\n';
 if(forest)files['LEIA-VOXEL.md']+='\nGF-VOXEL-03: árvores por seed. Mire em tronco ou folhas e mine para obter três madeiras e uma muda (inventário deve ter espaço). Tecla 8 seleciona madeira; 0 seleciona muda. Plante em grama ou terra com espaço livre. A muda cresce após 20 segundos de simulação ativa; se houver obstáculo ou jogador, aguarda. O save inclui árvores, mudas e tempo restante e é separado do modo sem floresta. Folhas desaparecem no corte; sem animação física de queda.\n';
 if(survival)files['LEIA-VOXEL.md']+='\nGF-VOXEL-04: sobrevivência opcional. Ciclo ativo de 120 segundos (80 dia, 40 noite), fome, vida, três alimentos iniciais, criaturas passivas e inimigos noturnos simples. C come, E ataca criatura ao alcance e na mira; picareta aumenta dano. Renasce preservando mundo e inventário. Save separado inclui tempo, fome, vida e criaturas. Sem dano de queda, animações complexas ou P2P.\n';
 files['LEIA-VOXEL.md']+='\nGF-VOXEL-05: criaturas articuladas procedurais, mãos, blocos e picareta visíveis, animação de caminhada e ação. Malhas reutilizam uma geometria de cubo, sem assets externos. Sem mudanças no formato do save.\n';
 if(storage)files['LEIA-VOXEL.md']+='\nGF-VOXEL-06: armazenamento opcional. Faça um baú na mochila com 3 pedras, selecione com 9 e coloque com Q. Mire no baú a até 3 blocos e pressione B para abrir; guarde ou retire itens unitários. Esvazie antes de minerar. G solta um bloco selecionado; coleta automática a até 1,4 bloco após 1,5 s de jogo ativo. Save local separado preserva baús e drops. Drops estáticos com animação visual; sem gravidade ou despawn.\n';
 if(tools)files['LEIA-VOXEL.md']+='\nGF-VOXEL-07: ferramentas duráveis (ativa também floresta). Fabrique picareta de madeira na mochila (2 madeiras), pedra na bancada (2 pedras), ferro na bancada (2 lingotes). Minério gerado abaixo da terra exige pedra ou ferro; forno transforma 1 minério + 1 madeira em 1 lingote. F alterna ferramentas, R repara ferramenta equipada perto da bancada com 1 material correspondente. Madeira/pedra/ferro têm 24/64/160 usos, intervalo de mineração 0,70/0,38/0,18 s. Desgaste ao minerar pedra/minério ou atacar criatura. Uma ferramenta por nível; ferramentas duráveis não entram em baús. Save próprio, preserva desgaste.\n';
 if(advanced)files['LEIA-VOXEL.md']+='\nGF-VOXEL-08: equipamentos avançados. E inicia mineração progressiva ou mantenha E pressionado; barra indica progresso, mudança de alvo reinicia. Cobre e carvão no subsolo. Fornos usam madeira ou carvão, processam tijolo/ferro/cobre em 4/6/5 segundos ativos e exigem J perto do forno para retirar. F alterna também machado, pá e espada. H equipa armadura de ferro: reduz dano de criaturas em 40% no modo sobrevivência. R repara ferramentas. Save separado preserva fornos e armadura.\n';
 if(size>64||landscape||textures)files['LEIA-VOXEL.md']+='\nGF-VOXEL-09: mundo '+size+' × '+size+' × 160, '+(landscape?'paisagem com biomas, rios rasos, túneis subterrâneos e ruínas. ':'')+(textures?'Atlas de texturas procedurais pixeladas. ':'')+'Malhas greedy carregadas por proximidade; Web Worker no jogo exportado com fallback para a thread principal. Botão Visão ajusta distância. A geração de dados do mundo ainda é feita na inicialização; somente malhas são processadas em segundo plano. Saves independentes por tamanho e paisagem; texturas e distância não alteram save.\n';
 if(atlas)files['LEIA-VOXEL.md']+='\nGF-VOXEL-10: atlas personalizado integrado ao código offline. A aparência não altera o save.\n';
 files['index.html']=root.GameForgeGenerator.shell(title,css,source,false,files);
 return files;
}
root.GameForgeVoxelBuilder={generate};
if(typeof module!=='undefined')module.exports=root.GameForgeVoxelBuilder;
})(typeof globalThis!=='undefined'?globalThis:this);
