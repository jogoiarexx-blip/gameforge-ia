# GF-TRAIN-15 — Duas missões encadeadas, estoque/tempo e dois NPCs

**Escopo entregue:** simulação de aquário, fazenda e loja em 2D. **Base:** GF-TRAIN-14.

O compilador PT-BR reconhece pedidos explícitos de **duas missões seguidas**, **duas missões encadeadas**, **missões em sequência**, ou **primeira missão / segunda missão**. Gera `GAME_SPEC.simulation.story.version=3` com duas tarefas econômicas, um NPC inicial e um segundo NPC físico e interativo, cada qual com conversas específicas.

Na missão 1, o jogador fala com o guia e executa a ação requerida (até cinco vezes); recebe **3 moedas uma única vez**. Em seguida procura o **Pesquisador** (aquário), **Feirante** (fazenda) ou **Gerente** (loja), conversa e completa a missão 2. Esta pode exigir quantidade de objetos em estoque *no instante anterior à ação* e/ou pelo menos N segundos de jogo ativo desde o segundo diálogo, além da ação econômica em si. A tarefa 2 concede **7 moedas uma única vez**, totalizando até 10 de recompensa sem alterar a receita acumulada. A vitória exige tanto a meta econômica quanto as duas missões, quando solicitadas.

Regras de estoque: na **fazenda**, o estoque é a colheita no inventário; em **loja e aquário**, a condição contabiliza posições de produto/peixe ocupadas. A condição de tempo é de **espera mínima**, não um prazo de derrota. O relógio só avança com a simulação ativa e não avança com o jogo fechado ou pausado. Contagens de ações são limitadas a cinco, estoque à quantidade de espaços, e a espera a 60 segundos.

O segundo NPC ocupa seu próprio ponto explorável e tem colisão e toque; a navegação continua via WASD/setas/E ou controle móvel. A escolha de missões do GF-TRAIN-14 (versão 2) e missões lineares do GF-TRAIN-13 (versão 1) permanecem sem mudança de formato. O save da versão 3 preserva missão ativa, progresso, dois contadores de diálogo, tempo decorrido, bônus, estoque, posições e direção de patrulha quando ativa, sujeito a validações de integridade de estrutura e limites. Salvar localmente não é defesa criptográfica contra adulteração pelo próprio usuário.

## Exemplos aceitos

- "Crie um aquário com **duas missões encadeadas**. Primeira missão: **comprar um peixe**. Segunda missão: **vender um peixe**, ter **um peixe no estoque** e **esperar cinco segundos**."
- "Quero uma fazenda. **Duas missões seguidas**. Primeira missão: **plantar dois canteiros**. Segunda missão: **vender uma colheita**. Precisa de **um item no estoque**."
- "Quero administrar uma loja. **Missões em sequência**. Primeira missão: **repor três produtos**. Segunda missão: **vender dois produtos**."

## Arquivos verificáveis

- `js/simulation-events.js`: contrato v3, duas missões, condições, eventos e diálogo correto por NPC.
- `js/simulation-design.js`: interpretação limitada de frases, últimas negativas, quantidades e condições.
- `js/simulation-rules.js`: eventos econômicos reais, tempo ativo, avaliação pré-ação e salvamento.
- `js/exploration-2d.js`, `js/simulation-runtime.js`: segundo NPC com colisão, toque, desenho, HUD e progresso.
- `js/game-capabilities.js`, `js/parser.js`: auditoria por capacidades, limites e pendências.
- `training/simulation-chains-ptbr-v15.json`: 30 pedidos PT-BR com rótulos esperados.
- `tests/simulation-chains.test.js`, `tests/export-boot-matrix.test.js`, `tests/browser-export-matrix.py`: regressões unitárias, jogo exportado VM e Chromium.

## Fora do escopo

Ainda não há três ou mais missões encadeadas, árvore de missões livre, inteligência de diálogo, missões temporizadas com derrota, NPCs com IA autônoma, múltiplas salas ou campanha 3D genérica. O motor não interpreta roteiros arbitrários; o repertório de ações continua limitado aos eventos implementados e contratos declarados.
