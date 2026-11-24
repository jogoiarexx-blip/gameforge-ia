# GF-VOXEL-01 — Primeiro sandbox voxel jogável

Referência: [Prismal Voxel](https://github.com/jogoiarexx-blip/Prismal-voxel) e GF-TRAIN-22. Este incremento é um protótipo independente, não um novo motor geral do parser.

## Abrir
No Studio, abra **Treinamento Prismal Voxel → Abrir Criador Voxel 3D**. Escolha o nome e a seed, crie a prévia e exporte o ZIP. Extraia todos os arquivos juntos e abra index.html em navegador com WebGL (para persistência previsível, sirva o diretório por HTTP local ou GitHub Pages). A prévia é isolada e não persiste dados.

## Implementação
- Mundo finito 64 × 64 horizontal, 160 níveis verticais; 16 chunks de 16 × 160 × 16, usando o gerador determinístico GF22 e índice y-z-x. Três tipos de bloco e ar.
- Uma geometria por chunk com faces expostas e cores por face. Edições atualizam apenas o chunk alterado e vizinhos na borda; descarte da geometria anterior da GPU. Sem greedy mesh, workers ou streaming infinito nesta versão.
- Primeira pessoa, WASD, setas/arrastar para olhar, espaço para pular, colisão AABB, física em passo fixo; E para minerar, Q para construir, 1–3 materiais, botões touch e bússola. Modo criativo sem consumo de itens, sem vida de sobrevivência.
- Seleção de blocos por DDA com alcance de seis unidades. Protege a base, impede construção sobre o corpo, limita a 4096 edições persistentes.
- Save v1 local com seed e título, posição, direção, edições e contadores de mineração/construção. Validação de versão, identidade, limites, duplicatas e colisão do jogador. Grava após edição, a cada cinco segundos de simulação, ao pausar e ao sair; armazenamento indisponível é informado. Reinício exige confirmação.
- Exportação com biblioteca Three.js local e licença, CSS, game.js e instruções; não depende de CDN. Criador separado preserva os motores clássicos e a exportação anterior.

## Testes
`tests/voxel-world.test.js`: seed, faces, bordas, DDA, colisão, save e exportação. `tests/browser-gf-voxel-01.py`: prévia, ZIP, WebGL, mineração, construção e reload no Chromium, bloqueando solicitações externas. O gate exige aprovação de Node, GLB e Chromium no mesmo SHA.

## Limites / próximo passo
Não importa saves do Prismal, não tem criaturas, biomas complexos, água, crafting, baús, árvores, mundo infinito ou P2P. Touch e desempenho em aparelhos físicos ainda exigem validação. Próxima etapa GF-VOXEL-02: inventário, bancada, forno e fabricação por estação, conectados ao jogo real, com testes de conservação de itens.
