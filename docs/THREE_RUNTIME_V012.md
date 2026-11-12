# Motor 3D local · v0.12

`js/three-runtime.js` contém `gameForgeThreeBoot`; `js/world-rules.js` contém a fábrica pura `gameForgeWorldRules`. O gerador serializa as duas funções e `GAME_SPEC`, junto com o bundle Three.js local em `engine-3d.js`. O jogo exportado não busca scripts, imagens, modelos, fontes ou serviços na rede.

## Contrato

Seleção: `dimension: '3d'` e `genre: 'arena' | 'fps' | 'racing' | 'platform'`.

`worldOptions` aceita `theme` (`forest`, `desert`, `neon`, `ruins`), `size` (32–88 metros, padrão 48), `quality` (`auto`, `low`, `high`) e `seed` (padrão 12345). A campanha aceita até 30 nomes de fases. Os multiplicadores existentes de dificuldade, inimigos, chefes, velocidade e cadência são limitados a 0,25–4 para evitar valores inválidos. Chefes são habilitados com `features.bosses`.

A fábrica pura fornece `rng`, `clamp`, `moveCircle`, `platformRoute`, `trackRibbon`, `raceProgress` e `goalReady`. Não captura estado externo e pode ser executada no Node ou serializada para o navegador. Os testes exercitam colisão com deslizamento e limites, plataformas alcançáveis, ordem de checkpoints, objetivos e orientação das faces da pista.

## Jogos e controles

| Gênero | Câmera e objetivo | Teclado | Toque / mouse |
| --- | --- | --- | --- |
| Arena | Terceira pessoa; eliminar guardiões, coletar três cristais e alcançar o portal | WASD/setas movem; espaço/Enter ataca com mira automática no guardião próximo | Direcional e AÇÃO; clique ataca |
| FPS | Primeira pessoa; eliminar guardiões, coletar três cristais e alcançar o portal | WASD/setas movem; Q/E giram; espaço/Enter atira | Direcional e AÇÃO; arrastar no cenário gira e atira; clique atira. Não usa pointer lock |
| Corrida | Câmera segue o carro; atravessar oito portais em ordem por volta e completar duas voltas (três após a fase 9) | W/↑ acelera; S/↓ freia e dá ré; A/D ou ←/→ viram; espaço é turbo | Direcional e AÇÃO; clique também ativa turbo |
| Plataforma | Câmera lateral em perspectiva; saltar entre ilhas, coletar pelo menos 70% dos cristais e alcançar o portal | A/D ou ←/→ movem; W/↑/espaço salta; Q/S ou ↓ ajustam profundidade | Direcional; AÇÃO/clique salta |

P/Escape ou o botão Pausar abrem a pausa; Continuar retoma a mesma posição. Reiniciar recomeça a campanha. Mudança de foco ou aba solta as teclas e pausa. Personagens recebem dano com intervalo de invulnerabilidade. A munição vazia recarrega automaticamente para permitir que o objetivo de combate sempre continue acessível. Cair em plataforma devolve o jogador à última ilha alcançada e custa vida. Colisão de carro reduz velocidade e vida.

## Renderização e recursos

Cenários são construídos apenas para a fase atual, com geometria de baixo número de polígonos, personagens articulados, árvores/cactos/colunas em grupos, rochas, neblina, iluminação hemisférica e direcional, sombras e caminhos legíveis. Temas alteram cores e vegetação. As plataformas têm rota determinística sem sorteio de lacunas impossíveis. A pista é uma faixa elíptica 3D, com barreiras, tráfego e portais ordenados.

Ao trocar ou reiniciar uma fase, geometrias, materiais e mapas de sombras da fase anterior são descartados e as listas internas de renderização são limpas. Disparos usam uma geometria compartilhada. A qualidade baixa desliga sombras e reduz decoração e proporção de pixels. A qualidade automática reduz a proporção de pixels quando o custo médio de renderização aumenta; alta permite sombras de 2048 pixels. Se WebGL não estiver disponível, `gameForgeSoftwareRenderer` mantém as mesmas cenas e regras 3D, projetando triângulos no Canvas 2D com recorte no plano próximo, descarte de faces traseiras, iluminação e neblina. Esse modo compatível identifica-se no rodapé e na telemetria, desenha no máximo 30 vezes por segundo e limita cada imagem a 4.500 triângulos, sem sombras. `preserveDrawingBuffer` permanece ativo para captura de QA.

`window.__gameforgeTelemetry()` informa estado, pausa, quadros, fase, vida, objetivos, inimigos, tiros, voltas/checkpoints, posição do jogador em centímetros (`x`, `y` no plano do chão; `z` vertical), coordenadas projetadas no canvas e métricas do renderizador. No FPS a posição de tela é o centro da visão.

## Validação e limites

`node --test tests/three-world.test.js` cobre as regras puras e a execução serializada dos quatro gêneros com a biblioteca Three real, substituindo somente a criação do contexto WebGL. Também verifica o renderizador compatível com triângulos reais, o início do jogo após falha de WebGL e a oclusão correta do chão por personagens. Verifica movimento, disparo, salto, direção, pausa, retomada e descarte ao reiniciar. A avaliação visual WebGL deve ser executada no navegador para complementar esses testes.

O motor usa geração procedural local e colisão geométrica simples, sem editor de malhas, física de suspensão, modelos importados, navegação avançada de inimigos, streaming de regiões, inventário RPG ou rede multiplayer. Mundo aberto aqui significa arena explorável da fase atual. WebGL oferece a melhor qualidade; navegadores sem WebGL usam renderização 3D por CPU, com qualidade visual simplificada e orçamento menor. Se ambos os contextos estiverem indisponíveis, o menu informa o problema e desabilita o início.
