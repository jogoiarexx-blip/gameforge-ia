# GF-TRAIN-14 — Escolhas reais de missão, condições por eventos e patrulhas 2D

**Escopo:** simuladores 2D (aquário, fazenda e loja). **Base:** GF-TRAIN-13. **Data:** 19/11/2026.

## Resultado executável

Pedidas expressamente, **duas alternativas de missão** geram um contrato `GAME_SPEC.simulation.story.version=2` com dois ramos A/B e condições por evento. Exemplos: "Missão com escolhas de diálogo", "missão com duas opções", "missão: escolher entre alimentar dois peixes ou vender três peixes". O jogador se aproxima do guia, conversa com E, seleciona por **5 ou 6** (também botões acessíveis) e realiza as ações reais da escolha. Só **uma escolha é possível**, sem revisão após selecionar. A contagem por ramo é limitada a cinco eventos, somente de ações válidas; valores superiores geram aviso. Se o pedido não define alternativas reconhecidas, as duas opções são predefinidas por domínio (cuidar ou finalizar), em vez de fingir criar um roteiro arbitrário.

Ramo A oferece **5 moedas**, ramo B oferece **8 moedas**. Apenas o ramo escolhido acumula progresso, recebe bônus único e desbloqueia a condição de vitória. Uma ação econômica realizada antes de escolher não conta para a missão; uma falha ao interagir não soma progresso. O ciclo do simulador (crescimento, estoque, preços, automação) mantém seu código, separado da máquina de estados.

**NPC com patrulha:** comandos positivos como "NPC patrulhando", "NPC com patrulha" e "guia patrulhando" ativam opcionalmente um percurso horizontal de ida e volta, com limite x=810–885, velocidade constante e sem pathfinding. A patrulha pausa com o jogo. O save recupera `guideX` e `guideDir` validados contra os limites; além do jogador e do estado da missão. Não há perseguição, inimigos, múltiplas salas ou IA conversacional.

**Compatibilidade:** missões lineares de GF-TRAIN-13 continuam como versão 1, com estado e formato originais. Jogos sem missão/patrulha não geram novas dependências. Os scripts continuam inteiramente offline, sem `eval`, CDN ou execução de texto não confiável.

## Arquivos

- `js/simulation-events.js`: validação e máquina de eventos v1/v2, escolha, contadores e recompensas.
- `js/simulation-design.js`: compilação dos comandos PT-BR com negativas, quantidades e limites.
- `js/simulation-runtime.js`: interação por proximidade, teclas/botões, HUD e progresso.
- `js/exploration-2d.js`: patrulha com ida e volta e colisão já existente.
- `js/simulation-rules.js`: regras econômicas, save e verificação de estado.
- `js/game-capabilities.js`, `js/parser.js`: contratos verdadeiros e relatório de limitações.
- `training/branches-patrol-ptbr-v14.json`: 30 frases com resultado esperado (regressão, não treinamento de pesos).
- `tests/simulation-branches.test.js`, `tests/export-boot-matrix.test.js`, `tests/browser-export-matrix.py`: testes puros, VM e Chromium móvel.

## Limites e futuro

Uma missão escolhida entre **duas tarefas com consequências econômicas diferentes** não é árvore narrativa ampla, múltiplos finais, sistema de reputação, NPC inteligente, roteiro livre, voz ou cenas cinematográficas. Essas solicitações continuam pendentes ou explicitamente limitadas nos relatórios. O próximo marco poderá trazer catálogo de eventos e condições v2 (tempo, inventário, recompensa condicional), mais de um NPC e mais missões com save versionado e verificação cruzada.
