# GF-TRAIN-13 — NPC com diálogo contextual, eventos e missões lineares

**Data:** 19/11/2026. **Base:** GameForge IA 0.28.x com GF-TRAIN-12.

## O que está realmente implementado

O compilador PT-BR reconhece pedidos explícitos de `missão`, `tarefa`, `diálogo com NPC`, `falar com guia` ou `conversar com cuidador` em simulações 2D de aquário, fazenda e loja. Se não houver ordem contrária de movimento, uma missão ativa o modo livre e o NPC guia. Se o jogador pedir somente o modo por estações ou proibir movimento livre, uma pendência de incompatibilidade é emitida, em vez de fingir que a missão foi implementada.

O modelo `GAME_SPEC.simulation.story` possui contrato v1, um NPC por cenário com três falas curtas, uma missão linear e até três etapas com **eventos enumerados**: `talk`, `start`, `care`, `finish`, `sell` e `clean`. A etapa "falar com o guia" antecede a tarefa econômica descrita. O pedido pode incluir contagem de até cinco ações (e.g. vender dois peixes, regar três canteiros). Pedidos não contemplados não geram JavaScript executável; escolhas ramificadas são marcadas pendentes.

O módulo puro `js/simulation-events.js` gerencia sequência, contadores, diálogos de acordo com o estado, progressão idempotente, validação de estados e a recompensa fixa de **5 moedas**, concedida uma só vez ao finalizar uma missão. Um diálogo isolado não paga moedas nem bloqueia a vitória econômica. A missão só aceita eventos de ações realmente bem-sucedidas, incluindo automação quando já programada; não contabiliza compras falhas, vendas duplicadas nem aproximação sem E.

`js/simulation-rules.js` mantém as regras econômicas e incorpora o estado `story` no save local já versionado; verifica progresso, bônus e limites do saldo, sem alterar o formato dos saves de jogos sem missões. Missões obrigatórias adiam o encerramento do jogo até o objetivo e a meta econômica serem cumpridos. O exportador inclui o módulo só quando houver missão/diálogo no GDD, e funciona offline.

`js/simulation-runtime.js` usa **E** junto ao NPC para progredir; o HUD exibe a etapa atual, progresso e conclusão. Recarregar o jogo preserva missão, posição e recompensa.

## Treinamento e aceitação

- `training/simulation-story-ptbr-v13.json`: 30 casos rotulados de gênero, ação, contagem, negativas e diálogo.
- `tests/simulation-events.test.js`: parser, contratos, sequência, bloqueio por condição, economia, recompensa única e adulteração de save.
- `tests/export-boot-matrix.test.js`: simula jogo exportado com deslocamento, conversa com guia, venda real, vitória e continuação.
- GitHub Actions do SHA exato: regressões Node + Chromium do Studio e jogos exportados.
- QA manual em Android, iOS e GPU fraca continua necessário.

## Limitações e próximo passo

Este marco **não** implementa IA conversacional, falas geradas livremente, roteiro arbitrário, múltiplas missões simultâneas, escolhas de diálogo, patrulha autônoma, árvores de objetivos, NPCs móveis, mundo aberto ou missões em 3D. Pedidos explicitamente ramificados aparecem em `implementation.pending`.

**GF-TRAIN-14 sugerido:** catálogo versionado de eventos/condições e consequências, mais de uma missão com caminhos diferentes, NPCs com rotas de patrulha e save de checkpoints de missões; medir adequação em corpus independente.
