# GF-OPEN-02c — Colisores visuais e análise aproximada de rotas

Data: 23/11/2026. Depende da GF-OPEN-02b (GLBs por fase).

## Entrega
- Modo visual **Exibir caixas de colisão**: desenha AABB dos obstáculos da cena sobre o chão (caixas, paredes, pilares, árvores e modelos GLB com geometria lida). Volume do jogador aproximado por raio de 0,4 m na verificação.
- Botão **Verificar passagem na fase**: busca caminho na grade XZ por BFS de quatro vizinhos entre o spawn padrão (0, tamanho × 0,28) e a saída padrão (0, −tamanho × 0,37).
- Status **PASSAGEM ENCONTRADA**, **BLOQUEADA** ou **INCOMPLETA** (modelo GLB com bounds ainda não carregados). Quando encontra caminho, desenha linha no viewport.
- Botões **Mover/Girar/Escala** já existentes mantidos, com seleção do encaixe de posição 0,25/0,5/1 m ou livre e rotação 5/15/45 graus ou livre.
- Seleção de tamanho do mapa 48/72; o editor lê o valor do jogo do Studio ao abrir a ferramenta pela seção de cenas 3D.
- Geometria GLB medida com Box3 em pose estática após carregar pelo IndexedDB; colisores aproximados são recalculados nas mudanças de posição, rotação e escala.
- `js/scene3d-navigation.js` puro, sem Three.js: funções `boundsFor`, `collect` e `inspect`. Testes Node e Chromium.
- Nenhuma mudança em formato de backup, estrutura dos jogos ou redes/CDNs.

## Uso
1. Abra o GameForge → projeto Arena/FPS/RPG 3D → Cenários 3D → Abrir editor.
2. Posicione os modelos e obstáculos. Ative **Exibir caixas de colisão**.
3. Use as opções de encaixe para posicionamento ou rotação precisos e os controles numéricos.
4. Clique em **Verificar passagem na fase**. Se estiver bloqueada, ajuste os obstáculos e observe o resultado.
5. Envie ao Studio, aplique ao jogo e valide na prévia/jogo real.

## Limites de exatidão
- **Não é uma certificação de jogabilidade**. A análise inclui apenas obstáculos cadastrados no editor. Não modela rochas, estruturas procedurais preexistentes, inimigos, portais, puzzles, NPCs, navmesh ou plataformas em alturas diferentes.
- Colisores são volumes AABB simplificados, inclusive para objetos rotacionados e modelos GLB; não usam triângulos exatos. O editor não muda a física do jogo exportado.
- Se o GLB não tiver geometria disponível, a análise informa resultado INCOMPLETO, em vez de declarar rota livre.
- O ponto de entrada e o de saída usados pelo verificador são os padrões dos motores Arena/FPS/RPG. O tamanho pode ser 48 ou 72 m e o tamanho real do projeto é transferido do Studio.
- Não altera o editor de SNES 2D, o motor urbano, controles móveis ou checkpoints.

## Testes obrigatórios
- `npm test` para colisor base, modelos GLB, rotação, escalas, bloqueios, rotas e world-size.
- `npm run verify:exports` e `npm run verify:glb-optimizer`.
- GitHub Actions Chromium: teste de edição visual, colisões, rota livre e bloqueada, encaixe, transformação e undo/redo, além da matriz atual.
- Revisão manual de caminhos e benchmarks em celular continuam pendentes.

## Próximo incremento sugerido
GF-OPEN-02d: alinhar colisões do editor e do motor 3D (OBB/swept collision), testar objetivos e plataformas procedurais na malha de navegação, gerar avisos de pontos de spawn inacessíveis, adicionar preview de personagens GLB animados.
