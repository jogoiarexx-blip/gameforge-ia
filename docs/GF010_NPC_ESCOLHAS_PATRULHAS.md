# GF-010 NPC — Escolhas de diálogo, patrulha e resultados diferentes

Este GF-010 NPC é a **continuação de GF-009**; não substitui o módulo urbano GF-010 existente no repositório.

## Comandos de GDD implementados

```md
## Fase 1 — Vila
NPC: Exploradora Lia no sul
Fala do NPC: "Quer defender a vila ou explorar as ruínas?"
NPC caminha: sim
Opção 1: Defender a vila | ir ao sul -> sobreviver 5 segundos | 120 pontos e 20 de vida
Opção 2: Explorar ruínas | ir ao norte -> coletar cristais | 300 pontos e 40 balas
```

O NPC aparece perto da zona declarada e **se move numa patrulha curta**, com caminhada animada procedimental. A patrulha é opt-in (`NPC caminha: sim`), fica dentro do limite do mundo e pausa enquanto a escolha é apresentada. A proximidade usa a **posição atual** do NPC.

Interação: aproximar, pressionar E ou tocar no botão Conversar; depois selecionar **1 ou 2** pelo teclado ou nos dois botões de toque. As duas opções conduzem a **sequências de etapas distintas** do GF-008, incluindo tempos de sobrevivência diferentes, e **recompensas distintas** (pontuação, vida e munição). A HUD e marcadores são atualizados conforme a decisão. A opção escolhida não pode ser trocada no meio da missão; a recompensa é entregue somente uma vez após concluir os objetivos.

## Contratos e segurança

- Somente **duas escolhas**, cada uma com 2 a 5 etapas compatíveis: alcançar norte/sul/leste/oeste/centro, eliminar inimigos, coletar os três cristais existentes ou sobreviver entre 5 e 180 segundos.
- Recompensa por escolha: 0–500 pontos, 0–45 de vida e 0–80 balas. A validação descarta opções malformadas, IDs externos, etiquetas com HTML e comandos que exigem mecânicas inexistentes.
- O GDD continua tratado como **dados**, sem executar JavaScript fornecido pelo usuário. O diálogo é texto, sem avaliação arbitrária, dublagem ou conversa com IA.
- Escolhas ficam dentro de `stageConfig[n].npcQuest.choices` em `GAME_SPEC`, preservando opções separadas na exportação do jogo. Relatório `FASES_EXECUTAVEIS.json` informa presença das escolhas e patrulha.
- Os NPCs GF-009 sem escolhas ou sem patrulha preservam **o comportamento legado**, com segunda interação E para aceitar.
- A conclusão da fase persiste o resultado numérico (pontuação/vida/etc.) através do checkpoint GF-007. A decisão dentro de uma fase não é persistida separadamente se o jogador fechar o jogo antes de chegar ao portal.

## Limitações claras

Ainda não existe conversa livre, caminhos de diálogo arbitrários, NPC que navegue edifícios/escadas com pathfinding, personalidade LLM, dublagem, múltiplos NPCs por fase, quests com inventário nem persistência de decisão dentro da fase. O patrulhamento usa uma trajetória curta e determinística, não IA de navegação. Só é coberto **arena/FPS/RPG 3D**.

## Verificações

`tests/stage-events-checkpoints.test.js`: GDD em PT-BR por fase, duas opções válidas versus inválidas, contrato de recompensa, clamping da patrulha, gameplay por teclado e botão de toque, congelamento durante a escolha, cena com NPC, dois desfechos, pagamento único e regressões GF-006/007/008/009. CI verifica scripts Node, exportações reais no Chromium e continuidade/GLB antes de integração.
