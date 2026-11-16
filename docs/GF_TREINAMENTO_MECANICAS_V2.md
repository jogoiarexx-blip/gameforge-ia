# GF-TRAIN-02 — comandos de mecânicas em português (segunda rodada)

## Resultado implementado
Esta rodada complementa os **144 comandos de gênero/dimensão** de GF-TRAIN-01 com **100 comandos de mecânicas** testados contra o `GAME_SPEC` real. Total: **244 exemplos rotulados**. São casos de regressão e normalização do compilador **offline e determinístico**, não ajuste de pesos de uma IA, aprendizado automático autônomo ou geração irrestrita de código.

Arquivos:
- `training/mechanics-ptbr-v2.json` — 100 entradas, com expectativas individuais: gênero/dimensão, quantidades, fases, inimigos, chefes, sobrevivência, voltas, dificuldade, loja e pendências
- `tests/mechanics-training.test.js` — compara as 100 interpretações com valores reais do `GAME_SPEC`, e testes contra comandos conflitantes, negações e mudanças incrementais
- `js/intent-compiler.js` — regras com escopo de fase por extenso e quantidades mais próximas do substantivo, preços plurais e precedência da última instrução
- `js/development-engine.js` — editor incremental reconhece `fase dois`, `fase três` etc. ao planejar objetivos
- `js/parser.js` — classificação e normalização limitadas do GF-TRAIN-01

## Exemplos verificados
- `Quero navinha 3D com 5 fases, 4 ondas por fase e chefão só no final.` → 5 fases, 4 ondas, boss só na quinta
- `Na fase três, sobreviver por 90 segundos.` → `stageConfig[2].mission=survive` e `seconds=90` **apenas** em arena/FPS/RPG 3D compatíveis
- `Jogo de arena 3D com 5 fases. Na fase dois coloque 7 inimigos.` → 7 inimigos **somente** na fase 2
- `FPS 3D com loja, balas custam 30 créditos.` → preço da munição 30 e módulo de loja habilitado somente no FPS 3D
- `Sem chefe, com 7 inimigos na fase 2.` → proibição de chefe não apaga a instrução dos inimigos
- `RPG 3D com crafting, árvore de habilidades e multiplayer.` → pendências explícitas em vez de promessas de sistemas inexistentes

## Contrato de qualidade
Execute `node --test tests/brief-training.test.js tests/mechanics-training.test.js`, `npm test` e `npm run verify:exports`. No GitHub a revisão ainda exige os dois jobs (Node e Chromium) **verdes no mesmo SHA**, além de teste de jogabilidade visual antes de publicar.

Os resultados medem **extração de configuração** e regressões. Não demonstram que modelos GLB ganharam animação ou que todos os sistemas pedidos foram construídos; recursos sem motor continuam pendentes. Os exemplos são **sintéticos, rotulados manualmente**, e uma avaliação independente com pedidos reais será necessária para medir generalização.
