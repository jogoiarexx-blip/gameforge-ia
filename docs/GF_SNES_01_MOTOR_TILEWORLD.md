# GF-SNES-01 — primeiro motor SNES 2D dentro do GameForge

**Origem técnica:** [SNES Engine Studio](https://github.com/jogoiarexx-blip/Snes-engine-Studio) do próprio projeto. O código de TileMap, câmera, camadas, colisão e renderização foi **adaptado em dois módulos GameForge** (\`js/snes2d-world.js\` e \`js/snes2d-runtime.js\`); não depende de baixar o repositório de origem durante o jogo.

## O que foi implementado

1. **Motor 2D selecionável**, sem mudar os motores existentes: em *Personalizar tipo e gráficos → Motor 2D*, escolha **SNES 2D · tiles e chunks**. Suporta **Plataforma 2D** e **RPG 2D / câmera superior** neste estágio. A escolha é preservada nos backups de projeto.
2. **Interpretação determinística PT-BR** de pedidos como "jogo de plataforma com motor SNES 2D" ou "jogo RPG 2D usando SNES Engine"; gera \`engineMode: "snes2d"\` e \`snes2d.version:1\` no GAME_SPEC. Pedidos que exigem 3D ou gêneros não implementados são recusados com mensagem específica, sem fingir que funcionam.
3. **World API** em \`js/snes2d-world.js\`:
   - Tiles de **16×16 pixels**, chunks lógicos de **32×18 tiles**.
   - Camadas canônicas \`background\`, \`ground\`, \`decoration\`, \`foreground\`, \`collision\`.
   - \`tileAt\`, \`setTile\`, \`fillRect\`, \`coords\`, \`autotileMask\`, \`visibleChunks\`.
   - **Colisão AABB sólida** em subpassos, eixos separados e limites do mapa.
   - Câmera com suavização, look-ahead, clamp, variação vertical para RPG superior.
   - Textura/atlas **pixel-art original criado em Canvas**, tiles e cache offscreen por chunk/camada usando dirty flags. Não baixa sprites nem a biblioteca SNES Engine.
4. **Runtime HTML jogável e offline** em \`js/snes2d-runtime.js\`:
   - Plataforma: deslocamento lateral, pulo com gravidade, plataformas superiores e obstáculos.
   - RPG superior: deslocamento 4 direções, colisão com paredes, ataque por proximidade.
   - Cristais coletáveis com pontuação; porta/saída abre depois da coleta e avança às próximas fases.
   - Inimigos simples patrulham curtas distâncias; vida, pausa/reinício, HUD.
   - Teclado, controles touch no HTML e suporte inicial a gamepad.
   - Tecla **T** alterna editor de tiles **dentro do jogo**; toque/clique alterna uma parede em local válido. Edição é **temporária** para a sessão; ainda não há exportação de mapa editado de volta ao Studio.
   - Telemetria de teste \`window.__gameforgeTelemetry\` e API de edição \`window.__gameforgeSNES2D\`.
5. **Gerador** inclui a fonte do motor e a configuração **dentro do \`game.js\` exportado**, sem CDNs, Node, API ou serviço externo. Exporta \`SNES2D_CONTRATO.json\` e \`SNES2D_LEIA.md\` com declarações dos limites.
6. **Testes automáticos** em \`tests/snes2d-engine.test.js\` cobrem parser, contratos, chunks, tiles, autotile, AABB, câmera, geração HTML e regressão dos antigos motores. Em \`tests/browser-export-matrix.py\` são executadas duas exportações reais (Plataforma, RPG) + seleção no Studio mobile.

## Limites conhecidos

- NÃO gera ROM real de SNES (.sfc) nem emula hardware.
- NÃO importa sprites externos, GLBs ou áudio do SNES Engine; as sprites atuais são desenhadas por código pixel-art original.
- NÃO interpreta layouts completos do GDD de modo livre: gera mapas padronizados por gênero/fase, e ainda não importa um mapa criado no editor do SNES Engine Studio.
- NÃO implementa chefes roteirizados, cutscenes, menus complexos, inventário, árvores de habilidades ou ataques sofisticados neste motor GF-SNES-01.
- Tilemap editor é uma ferramenta local de teste; a persistência e exportação de mapas editados ficam para uma próxima integração.
- Renderização em Canvas 2D de resolução lógica 512×288; CSS escala o jogo em telas móveis.

## Próximos marcos

**GF-SNES-02:** importar spritesheets e atlas JSON, ligar Animator Controller, animações com transições e hitboxes por quadro, criar uma verdadeira ferramenta visual de tiles dentro do Studio, salvar/exportar/importar mapas (formato próprio ou compatível).

**GF-SNES-03:** incorporar Game Flow, cutscenes, save slots e checkpoints, áudio por canais, qualidade automática orientada por FPS e modos 2D adicionais. Somente depois avaliar um fluxo **separado e experimental** de exportação ROM, sem prometer paridade com o runtime HTML.
