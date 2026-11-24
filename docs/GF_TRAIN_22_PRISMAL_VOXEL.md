# GF-TRAIN-22 — Treinamento do GameForge usando o Prismal Voxel

**Data:** 23/11/2026
**Repositório de referência:** https://github.com/jogoiarexx-blip/Prismal-voxel
**SHA analisado:** \`c0563c1664d6681aeff51aa7dbd7c716e12ed7f2\`
**GameForge:** nova rodada após GF-TRAIN-21.
**Natureza:** transferência de conhecimento de regras reais e regressões; **não houve ajuste de pesos de uma IA** nem port de um motor voxel completo.

## Lições técnicas com fonte rastreável

| Lição | Evidência no Prismal Voxel | Adaptação nesta PR |
|---|---|---|
| Chunks de \`16×160×16\` por seed | \`js/world.js\` (\`S=16\`, \`H=160\`, \`generate\`); \`js/game.js\` (\`stream\`, \`pump\`) | \`GameForgeVoxelKit.chunkOf\`, \`generateChunk\`, \`streamRequests\` — terreno mínimo reproduzível |
| Fronteiras de chunk e jobs antigos | \`js/game.js\` (\`applyBlockBatch\`, revisão por chunk e \`received\`); \`tests/chunk-streaming.test.cjs\` | \`batchEdits\` valida todo o lote, aplica edições imutáveis em chunks inclusive descarregados e invalida \`meshJobValid\` antigo |
| Banco, forno e mochila têm receitas próprias | \`js/world.js\` (\`recipeStation\`, \`recipesAtStation\`, IDs \`0\`, \`12\`, \`14\`); \`tests/crafting-stations.test.cjs\` | \`recipesAtStation\`, \`craft\` com validação de máquina/proximidade, recursos e capacidade; falhas não consomem inventário |
| Navegação e bússola inspirada no Medal of Honor | \`js/navigation.js\`; \`tests/navigation.test.cjs\`, \`tests/compass.test.cjs\` | \`guide\` e \`compassMarks\` com norte \`-Z\`, leste \`+X\`, indicação vertical e ângulos normalizados |
| Orçamento mobile | \`js/game.js\` (stream reduz de \`3/4/5\` desktop para \`2/3/4\` mobile por qualidade) | \`streamRequests\` adota orçamentos 2–4 mobile e 3–5 desktop; não há garantia de 30/60 FPS |
| Instrumentação local de desempenho | \`js/performance.js\`, \`tests/gdd-metrics.test.cjs\` | \`frameMetrics\` com FPS médio, 1% low e p95; ignora amostras inválidas e até 600 quadros |
| Árvores, mudas e replantio | \`js/game.js\` (\`finishTree\`, \`growSaplings\`) | Registrado como **pendência**; necessário ciclo completo com drop único e sem duplicação |
| Save durável e recuperação de falha | \`js/store.js\`; \`tests/recovery-mobile.test.cjs\`, \`tests/reliability.test.cjs\` | Checklist para save transacional, versões e recuperação; **não** reivindica mundo voxel salvo no GameForge |
| Coop P2P e baús compartilhados | \`js/coop.js\`, \`js/multiplayer.js\`; \`tests/coop.test.cjs\`, \`tests/p2p-transport.test.cjs\` | **Pendente** no GameForge: anfitrião autoritativo, numeração/revisão de operações, reconciliação e sinalização externa |

O próprio \`README.md\` de Prismal Voxel classifica o P2P como **experimental**; WebRTC sem sinalização não permite um convite confiável apenas por um código curto isolado. Benchmarks de hardware real e sessões cooperativas longas continuam necessários.

## O que foi efetivamente incorporado

### 1. Regras puras reutilizáveis (\`js/voxel-kit.js\`)

Inclui um gerador mínimo de blocos por seed (apenas pedra, terra, grama e ar), localização e índice de chunks inclusive negativos, planejamento determinístico de carregamento, edições atômicas e versionadas, verificação de jobs, crafting por máquina, navegação e estatísticas.

É base para um *futuro motor voxel*, **não** um sistema de mundo aberto exportável, não possui mesh GPU, física voxel jogável, raycast de mineração ou P2P.

### 2. Treinamento de requisitos (\`js/voxel-training.js\`)

O parser detecta explicitamente \`voxel\`, \`Minecraft\` ou \`mundo de blocos\` e anexa \`spec.voxelTraining\`, com contratos, testes de referência, origem do requisito, explicação e pendências:
- **Protótipo:** regras portáteis disponíveis, ainda não integradas em um jogo voxel;
- **Parcial:** funções já existentes no GameForge (ex.: toque) mais políticas voxel não certificadas;
- **Pendente:** mecânica inexistente como sistema voxel jogável (árvores, persistência completa, mineração/construção física, coop P2P).

Comandos posteriores podem negar requisitos sem retirar outros relacionados.

O Studio mostra o painel **Treinamento Prismal Voxel · Diagnóstico GF-TRAIN-22**. Os projetos com pedidos voxel ganham \`TREINAMENTO_VOXEL_GF22.json\` e \`DIAGNOSTICO_VOXEL_GF22.md\` no ZIP e no backup \`.gameforge.json\`. Outros projetos não ganham arquivos extras.

### 3. Corpus e medição

\`training/prismal-voxel-ptbr-v22.json\` contém **47 briefs rotulados**, incluindo solicitações compostas, negações, mobilidade e diferentes gêneros. \`npm run train:voxel\` exige **110 comparações de rótulo**, com relatório por gênero. A medição se limita ao corpus curado.

\`tests/voxel-kit.test.js\` verifica geração determinística, limites negativos, bordas entre chunks, invalidação de jobs, crafting sem consumo em caso de erro, bússola e métricas. \`tests/voxel-training.test.js\` verifica GDD, medição, negações, exportação, backups e presença do painel.

\`tests/browser-gf-train-22-voxel.py\` analisa o GDD real no Studio Chromium, gera arquivo exportado e confere as pendências declaradas no ZIP. Isso não equivale a rodar um motor voxel.

## Execução

\`\`\`bash
npm test
npm run train:voxel
npm run train:threejs
npm run verify:exports
node tools/build-browser-fixtures.cjs
python tests/browser-gf-train-22-voxel.py
\`\`\`

A integração na \`main\` exige aprovação da CI Node, do GLB e do Chromium no SHA atual. **Não copiar os grandes arquivos de Prismal Voxel diretamente para \`three-runtime.js\`**: os contratos de mundo, geometria, inventários e saves são diferentes.

## Próximas etapas propostas

**GF-VOXEL-01:** um motor 3D voxel opt-in com meshing de faces visíveis, worker versionado, terreno por seed, física e mineração/construção, exportação offline; preservar motores atuais. **GF-VOXEL-02:** inventário/forno/bancada conectados ao gameplay e árvores com replantio. **GF-VOXEL-03:** persistência completa dos blocos, slots/baús, recuperação robusta e testes de 60 minutos. **GF-VOXEL-04:** controles mobile/otimização medidos em hardware; P2P só após sinalização e testes consistentes.
