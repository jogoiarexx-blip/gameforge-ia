# GF-TRAIN-19 — Treinamento de interpretação de projetos Three.js em sete gêneros

**Data:** 23/11/2026  
**Objetivo:** aprimorar a qualidade do GameForge **por regressões reais e feedback auditável**, não por alegar retreinamento de pesos de um modelo de IA.

## Escopo

- `training/threejs-multigenero-ptbr-v19.json`: **50 exemplos distintos** de pedidos de jogos 3D em português, com respostas esperadas para **arena, FPS, RPG, shooter, corrida, plataforma e ação urbana**.
- `js/three-training.js`: reconhece nove categorias e classifica cada ocorrência em **manual** (recurso exige intervenção do criador), **parcial** (suporte existente, mas insuficiente para garantir o pedido) e **pendente** (exige nova programação). Um pedido negado no GDD/comando não vira funcionalidade presumida. A ordem é GDD antigo, depois comando recente.
- Classes: posicionamento de GLBs por fase, personagens GLB animados, colisão, análise de passagem, rotas alternativas físicas, controles móveis, checkpoints persistentes, destruição de cenário e reconstrução de GLB a partir de foto.
- `js/parser.js` anexa `threeTraining` a `GAME_SPEC` 3D; a seção GF-TRAIN-19 do Studio exibe o diagnóstico ao analisar o GDD.
- `js/generator.js` exporta `TREINAMENTO_3D_GF19.json` e `DIAGNOSTICO_3D_GF19.md` junto ao ZIP (para gêneros 3D).
- `js/project-backup.js` permite ambos os arquivos em backups e restaurações.
- `tests/three-training.test.js` mede rótulos e testa precedência do comando, origem de linhas, integrações e compatibilidade de backups.
- `npm run train:threejs` executa o medidor local. A CI passa a exigir esse comando sem rede, além das suites já existentes.

## Definição dos resultados

- **Manual:** para os motores Arena/FPS/RPG 3D há editor de cenas e importação de GLBs estáticos, AABB e verificador de rotas. Isso **não coloca objetos no jogo só por escrever um pedido**: é necessário importar o GLB, posicionar por fase e aplicar o layout.
- **Parcial:** controles touch têm implementação básica, mas desempenho, ergonomia e compatibilidade com celulares reais não foram certificados. O motor urbano tem controlador de clipes GLB, sem garantia de rig ou retargeting universal.
- **Pendente:** caminhos físicos alternativos, checkpoints persistentes universais, destruição física, geração de GLB a partir de foto e animações de personagens em motores não suportados não devem ser marcados como entregues.

## Reproduzir o treinamento

```bash
npm test
npm run train:threejs
npm run train:threejs -- --json
npm run verify:exports
```

Na primeira checagem do conjunto rotulado, o classificador reconheceu **59/59 rótulos dos 50 exemplos preparados**. Isso é somente acurácia no corpus curado, não medida de generalização, taxa de acerto de IA nem teste de execução de todos esses sistemas.

## Segurança e compromissos

- Nenhum script é executado a partir do GDD. A rotina é baseada em regras e não busca conteúdo online.
- O código dos motores não foi substituído; o diagnóstico orienta o trabalho futuro sem ativar funcionalidades inexistentes.
- A fonte original e a linha do requisito ficam registradas e o texto é limitado para evitar relatórios excessivos.
- A interpretação não substitui testes jogáveis reais com WebGL, GLB, gamepad, salvamentos e dispositivos móveis.

## Próximo GF-TRAIN-20 proposto

Treinamento de regressão do **jogo exportado** com cenários mensuráveis: transição de fases, controle touch e gamepad, GLBs com/sem rig, checkpoints e fallback WebGL, com resultados por gênero. Primeiro implementar as mecânicas pendentes no motor, depois promover seus contratos de “pendente” para “manual”/“parcial” com evidências.
