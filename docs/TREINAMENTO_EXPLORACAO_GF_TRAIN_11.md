# GF-TRAIN-11 — Simuladores exploráveis com interação por proximidade

Data: 19/11/2026. Base: GameForge Studio 0.28.0. Implementação incremental em branch de revisão.

## Entrega

A instrução explícita "personagem andando", "caminhar entre tanques" ou "interagir com o aquário" ativa `GAME_SPEC.simulation.exploration` (versão 1) em aquário, fazenda e loja **2D**. O jogador caminha horizontalmente entre as estações; teclas ←/→ (ou A/D) ou toque escolhem o destino, a caminhada leva tempo, e **E / INTERAGIR / segundo toque na estação** abre as ações quando o personagem está perto. Sem proximidade, não é possível iniciar, alimentar/cuidar, colher/vender ou limpar manualmente. As teclas 1–4 e botões da interface operam apenas dentro da interação.

Os jogos sem pedido explícito continuam com seleção de estações e botões, sem mudança de controles. O modo não altera dinheiro, crescimento, automação, vitórias ou custos. O salvamento existente preserva a estação selecionada; ao continuar, o personagem reaparece nela e a interação está fechada. O deslocamento intermediário não é salvo e o tempo fechado não avança.

## Testes

- `training/exploration-ptbr-v11.json`: 18 casos de comandos coloquiais, negativas, mudanças de intenção, aquário/fazenda/loja e preservação do modo manual original.
- `tests/simulation-exploration.test.js`: interpretação, contrato por motor, economia e exportação JS válida.
- `tests/export-boot-matrix.test.js`: integração real com o `game.js` exportado em ambiente DOM/Canvas simulado, bloqueio de ações fora de alcance, navegação, salvamento e vitória após recarga.
- Conferir no GitHub Actions testes Node, exportações e Chromium **no commit final**. Testes em celulares físicos continuam necessários.

## Limitações reais

O movimento é um corredor 2D de estações fixas, **não** exploração livre de uma loja com cômodos, colisão com paredes, clientes andando, obstáculos, diálogo ou pathfinding. A aparência do personagem é procedural simples. Não existe simulação 3D. Salvar a estação atual em vez da posição exata evita migração do formato de save anterior. Não há aprendizado de pesos de modelos externos; o treinamento atualiza regras e executa código já programado.

## Próximo avanço sugerido

GF-TRAIN-12: navegação livre 2D com colisores, atores NPC, objetos interativos e eventos por proximidade usando contratos de ação e condição; manter este modo de estações como fallback leve e verificável.
