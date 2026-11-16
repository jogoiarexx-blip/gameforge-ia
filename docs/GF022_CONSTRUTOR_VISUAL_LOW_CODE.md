# GF-022 — Construtor Visual de Pedidos (low-code)
Data: 16/11/2026. Base: GameForge Studio 0.21.0.

## Entrega
- Nova seção de escolhas visuais no PASSO 2: gênero/motor, número de fases (1–30), dificuldade e sistemas desejados.
- Conversão determinística das escolhas em instrução em português, sem executar scripts do usuário.
- "Conferir compatibilidade" executa o parser e a auditoria reais e apresenta configurações, pendências, incompatibilidades, bloqueios e limitações.
- "Adicionar ao pedido" preserva GDD e instrução existentes, seleciona motor e aciona a análise já existente. A geração continua no botão original, sem modificar os runtimes.
- Avisos explícitos para árvore de habilidades, interiores, GLB, checkpoints e controles mobile.

## Critérios de aceite
1. O usuário leigo monta um pedido com cliques, sem digitar um prompt.
2. Um sistema ainda não criado nunca é descrito como funcional apenas porque foi selecionado.
3. Não há mudança nos motores 2D/3D, no salvamento, no ZIP, nas APIs de IA ou no GitHub Pages.
4. A interface permanece fechada por padrão e utilizável em tela pequena.
5. Testes Node validam composição, limites e integração com parser.

## Limites
Esta primeira etapa não é um editor drag-and-drop de fases/cenas nem uma integração com Microsoft Power Apps. Ela facilita pedidos e mostra sua viabilidade. A construção visual de mapas, entidades e eventos será uma etapa separada, com serialização em GAME_SPEC e testes de gameplay.
