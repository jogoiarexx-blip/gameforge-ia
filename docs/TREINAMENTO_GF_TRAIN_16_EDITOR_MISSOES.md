# GF-TRAIN-16 — Missões com objetivos simultâneos + editor visual

**Escopo real:** simuladores 2D de aquário, fazenda e loja. Versão de eventos `story.version=4`, ativada quando o jogador pede **três ou quatro missões** (número ou por extenso). Preserva versões de missão 1, 2 e 3 dos treinamentos anteriores.

## O que roda no jogo

Cada uma das 3–4 missões possui **um ou dois objetivos econômicos tipados** (comprar/plantar/repor; alimentar/regar/atender; vender/colher; vender estoque na fazenda), cada qual com contagem de 1–5 ações válidas. Quando há dois, eles **progridem independentemente e em qualquer ordem**. A missão só termina quando **todos os objetivos** forem cumpridos. O mesmo evento não é contado duas vezes no mesmo passo. Ações econômicas inválidas não avançam o contador. Ações feitas antes do diálogo com NPC responsável não contam para a missão seguinte.

A campanha alterna entre **dois NPCs físicos** já implementados — guia e pesquisador/feirante/gerente — em vez de fingir introduzir um novo NPC para cada missão. Antes de cada missão é preciso conversar com o NPC da vez, sempre por proximidade/E/toque. Ao concluir, recebe recompensa única progressiva de 3, 5, 7 ou 9 moedas; o total de quatro missões é 24 moedas. Isso aumenta **saldo** mas não a receita de vendas. A vitória continua dependendo da meta de vendas e de completar todas as missões obrigatórias.

**Condições opcionalmente por missão:** estoque mínimo (quantidade de tanques/prateleiras ocupados; na fazenda, inventário de colheita) e espera de 1–60 segundos de jogo ativo a partir do diálogo. Ambas são verificadas **antes da ação efetiva**, não no término da missão. Pausar, sair ou fechar a aba não faz o relógio avançar. Como já ocorria em v3, uma ação econômica aceita sem satisfazer condições não conta como progresso da missão.

## Editor visual para leigos

No Studio, passo **Criar**, abra **“Editor visual de missões (aquário, fazenda ou loja 2D)”**. Escolha 3 ou 4 missões. Para cada uma, escolha duas ações diferentes, quantidade de 1–5, mínimo de estoque (0 desliga) e espera em segundos (0 desliga). O botão **Conferir objetivos** monta um pedido em português validado pela ferramenta; **Adicionar ao meu pedido** o coloca no campo de instrução, sem apagar o documento GDD. O modo de criação passa a **Simulação 2D sem precisar de código**; então clique em **Criar jogo** para gerar o `game.js` offline e testar na prévia.

Um segundo clique em adicionar **substitui somente o bloco anterior do próprio editor**, mantendo outras instruções do usuário e o GDD. No caso de comandos antigos incompatíveis ou GDD de outro gênero, a análise poderá apontar conflito; não há alteração silenciosa dos demais gêneros.

## Contratos e segurança

- `js/simulation-events.js`: esquema estático v4, máquina de eventos tipados, validações de contagem e bônus, estado serializável.
- `js/simulation-design.js`: tradução determinística de 3/4 missões com objetivos e condições pontuais (não gera código JavaScript do pedido).
- `js/simulation-rules.js`: integração com ações econômicas reais, tempo de jogo, verificação de estoque antes da ação e persistência da matriz de objetivos.
- `js/simulation-runtime.js`: HUD de missão e NPCs alternados na sala; integração da máquina de estados e do segundo NPC do GF-TRAIN-15.
- `js/simulation-quest-editor.js`, `index.html`, `js/app.js`: editor visual real, valores permitidos e instrução compilável.
- `training/simulation-parallel-ptbr-v16.json`: 30 casos PT-BR com resultados esperados (não treinam pesos).
- `tests/simulation-parallel.test.js`, `tests/browser-export-matrix.py`: máquina de estados, regresso de versões e QA real mobile.

A validação do save rejeita estruturas e recompensas inconsistentes, mas **não é prova criptográfica contra o dono do navegador**, pois tudo roda localmente. O código do GDD não é executado.

## Limitações honestas e GF-TRAIN-17

- Apenas **até 4 missões sequenciais**, com **até 2 objetivos simultâneos cada**. Não há vários arcos de missão paralelos ou mais de 2 objetivos por missão.
- Apenas **2 NPCs estáticos/reutilizados em uma sala**, salvo patrulha simples solicitada separadamente. Não existe NPC3, sistema de IA social, diálogo gerativo, cutscenes, 3D, quests em várias salas nem condição de derrota por prazo.
- O editor cria **pedidos para novos jogos**, não altera em tempo real missões dentro de um `game.js` já exportado.
- GF-TRAIN-17 pode acrescentar um grafo de dependências, recompensas por itens, templates reutilizáveis e edição controlada de missões após exportar, com migração de save.
