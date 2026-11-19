# GF-TRAIN-17 — Dependências, kits de suprimentos e edição de missões existentes

Implementação autoral, offline e determinística nos jogos de **simulação 2D de aquário, fazenda e loja**, mantendo os contratos v1–v4. A versão 5 de `GAME_SPEC.simulation.story` é produzida quando um pedido de **três ou quatro missões** inclui uma dependência entre objetivos ou recompensa de suprimentos.

## Mecânicas reais

- **Dependência entre objetivos:** em cada missão com dois objetivos, `objectives[1].requiresFirst=true` impede que ações do objetivo 2 contem antes do objetivo 1 chegar a 100%. O evento econômico pode continuar válido, mas a tarefa bloqueada não avança. Nenhum código livre é interpretado. Essa é uma dependência linear de um objetivo sobre outro, **não** um grafo arbitrário.
- **Kits como recompensa em itens:** `missions[i].itemReward` vale 0–3. Ao concluir a missão, o jogador recebe kits uma única vez, contabilizados em `story.itemsEarned` e `s.kits`. O kit **substitui o custo de uma ação `start`** (comprar peixe, plantar ou repor uma prateleira). Ele é usado **automaticamente**, mesmo com saldo disponível. `s.kitsUsed` registra o consumo. Kits não são peixes, sementes colecionáveis, equipamentos nem receitas em moeda.
- **HUD:** mostra os kits disponíveis junto ao indicador de itens, informa a dependência e os prêmios no objetivo.
- **Persistência:** salva progresso por objetivo, kits recebidos, kits utilizados, dinheiro, NPCs e timer ativo. Valida `kits + kitsUsed === itemsEarned`, e `itemsEarned` deve corresponder à soma das recompensas das missões concluídas. É validação estrutural, não proteção criptográfica contra edições locais.

## Exemplos de comando

- "Quero um aquário com **três missões encadeadas com objetivos simultâneos**. **Missão 1: comprar 2 e alimentar 1. Objetivo 2 depois do objetivo 1. Recompensa de 2 kits.** Missão 2: comprar 1 e alimentar 1. Missão 3: comprar 1 e alimentar 1."
- "Quero administrar uma loja. **Quatro missões encadeadas**. **Missão 1: repor 2 e atender 2. Segundo objetivo depende do primeiro. Recompensa de 3 kits.**"

## Editor visual e edição de projetos já criados

Na seção **Passo 2 → Editor visual de missões**, o usuário pode configurar em cada etapa **“Objetivo 2 só depois do objetivo 1”** e **“Recompensa em kits”** de 0 a 3, além de ações, quantidades, estoque e tempo.

**Projeto novo:** conferir → adicionar ao pedido → criar jogo.

**Projeto existente v4/v5:** abrir o projeto no Studio; clicar **Carregar missões do jogo criado**, modificar campos e **Salvar no game.js existente**. O editor altera somente a declaração JSON literal `const GAME_SPEC = ...;` em `game.js` **do gerador offline**, não reescreve o restante do motor, não toca em `GDD_original.md` nem substitui outros arquivos. O `index.html` existente referencia `game.js`, de modo que a exportação ZIP utiliza a alteração. A aplicação exige confirmação explícita do usuário e atualiza prévia e arquivos do Studio.

O editor **recusa automaticamente** projetos de outro gênero, código com `GAME_SPEC` não literal, alteração de domínio, estoque acima do número de espaços, configuração inválida e tentativa de habilitar funcionalidades v5 em jogo exportado com motor v4. A versão v4 pode continuar sendo editada **sem** kits/dependências. O editor **não** substitui o motor JavaScript da exportação antiga.

**Atenção ao save:** o salvamento local atual utiliza uma assinatura da configuração. Alterar missões muda a assinatura, portanto **o save anterior não pode ser continuado**. A interface avisa disso antes de salvar; faça backup do projeto primeiro. Não é uma migração de save. Os outros arquivos, gráficos e ajustes de jogo permanecem intocados, mas os relatórios de geração feitos antes da edição podem ficar desatualizados.

## Testes e limites

- `training/simulation-dependencies-ptbr-v17.json`: 30 instruções/expectativas de regressão, não treinamento de pesos.
- `tests/simulation-dependencies.test.js`: máquina de eventos v5, bloqueios, prêmio idempotente, gasto gratuito, save adulterado, visual editor, edição byte a byte do corpo do motor, contratos v4/v3/v2.
- `tests/browser-export-matrix.py`: cenário mobile gerado com missão v5 e kit resgatável, além de edição pelo Studio real; matrizes antigas mantidas.
- Até **4 missões sequenciais**, dois objetivos por missão, apenas **2 NPCs** num cenário 2D. Sem grafo arbitrário, inventário de equipamentos, recompensas aleatórias, migração de save, edição de motor 3D nem jogos do modo com IA.

**Próxima evolução possível:** migração de save sob versão controlada e múltiplas dependências com ciclo detectado, exigindo testes próprios.
