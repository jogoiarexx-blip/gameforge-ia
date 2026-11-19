# GF-TRAIN-12 — Exploração livre 2D e interação contextual

Data: 19/11/2026. Base: GameForge Studio 0.28 + GF-TRAIN-11.

## Implementação

Um pedido explícito por "movimentação livre", "andar livremente", "andar com WASD" ou "mapa explorável" ativa o modo `simulation.exploration.mode=free` (versão 2) no motor 2D de aquário, fazenda e loja. Pedidos de apenas "personagem andando" continuam no modo anterior de estações (GF-TRAIN-11). Uma ordem negativa posterior desativa o modo correspondente. O compilador não transforma automaticamente qualquer GDD complexo em mundo aberto.

Novo `js/exploration-2d.js`: sala 960×540, até 12 estações em grade, caixa de colisão para móveis, movimento em dois eixos, deslize nas paredes, limites do cenário, NPC guia opcional, seleção de objeto por proximidade e destino de toque. É um núcleo puro, serializável no `game.js` exportado offline. A movimentação por WASD/setas é contínua; toque em objetos ou no chão pode definir um destino em linha reta. **Não há pathfinding**: obstáculos podem bloquear destinos por toque, que requerem contorno manual.

**Interações:** perto de uma estação, E ou o botão INTERAGIR abre as mesmas ações econômicas existentes. Fora de alcance, comprar, cuidar, colher ou vender é bloqueado. E perto do guia exibe uma orientação contextual sem dinheiro nem recompensa fictícios; esse NPC não possui IA autônoma, diálogos ramificados ou locomoção.

**Salvamento:** o save local preserva dinheiro, peixes, produção e a posição 2D quando o modo livre está ativo. A restauração valida limites numéricos e verifica colisão; uma posição inválida para o mapa retorna ao início seguro. Pausa congela movimento, crescimento e automação. A mudança de configuração mantém a política anterior de save por assinatura.

**Compatibilidade:** jogos sem exploração continuam iguais; modo de estações v1 permanece disponível; simulações 3D, construção livre, clientes inteligentes, colisão com outros jogadores e múltiplas salas continuam pendentes.

## Testes e aceitação

- `training/free-exploration-ptbr-v12.json`: 28 casos rotulados de pedidos livres, estações, negativas, reativação e NPC.
- `tests/simulation-free-movement.test.js`: colisões, proximidade, grades de 1–12 estações, limites, save, classificação e exportação.
- `tests/export-boot-matrix.test.js`: jogo `game.js` executado em DOM/Canvas simulado, WASD, colisão, NPC, economia, pausa e salvamento.
- GitHub Actions: Node + Chromium no SHA exato, sem publicação após CI vermelha.
- QA manual em Android e dispositivos fracos ainda não realizado.

Próxima etapa proposta: GF-TRAIN-13 — sistema de eventos reutilizáveis (gatilhos, condições, efeitos), NPCs com rotinas controladas, diálogos estruturados e missões derivadas do GDD, preservando a distinção entre recurso implementado e texto.
