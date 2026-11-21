# GF-SNES-02 — Animação, spritesheets e edição de mapas SNES 2D

**Referência técnica:** SNES Engine Studio do mesmo autor: https://github.com/jogoiarexx-blip/Snes-engine-Studio

## O que foi implementado

- Adaptado um Animator Controller independente para o GameForge: estados idle, walk, jump, attack e hurt, transições por condições, FPS por estado e hitboxes por quadro. O jogador acerta inimigos somente quando uma área de ataque colide com eles.
- Spritesheet PNG ou WEBP local até 480 KB por personagem, até 512×512 pixels. Jogador e inimigo usam imagens independentes, incorporadas ao game.js gerado para funcionar sem conexão.
- Atlas JSON opcional no formato frames + animations. Inclui modelo pronto em examples/SNES2D_ATLAS_MODELO.json. Sem JSON, grade 4×4: linhas idle/walk/attack/hurt.
- Novo editor de TileMap dentro do próprio Studio: fase, chunk horizontal/vertical, cinco camadas, pincel/apagar, mapa de colisão destacado, desfazer/refazer e JSON portátil.
- Persistência dos mapas no GAME_SPEC do game.js como lista de alterações (deltas), até 1024 por fase, sem reescrever o código original do motor. Arquivos de metadados SNES2D_MAPAS.json e SNES2D_ATLAS.json entram no ZIP e no backup.
- Mantido o editor temporário de obstáculos com tecla T dentro da partida. O editor permanente e exportável fica no Studio.

## Como usar

1. Selecione Motor 2D > SNES 2D e o gênero Plataforma ou RPG 2D, depois clique em Criar jogo.
2. Abra SNES 2D · Editor de mapas e animações e clique em Carregar jogo gerado.
3. Escolha fase, chunk, camada, pincel e tile. Pinte com mouse ou toque; use Desfazer/Refazer para recuperar alterações.
4. Clique em Aplicar ao jogo para que o mapa apareça nas prévias e nos arquivos exportados.
5. Para trocar sprites, selecione a PNG/WEBP do jogador ou inimigo, acrescente atlas JSON se desejar, clique Importar spritesheets e atlas e depois Aplicar ao jogo.
6. O botão Baixar JSON do mapa gera SNES2D_MAPAS.json; Importar JSON do mapa lê edições anteriores, sem executar código.

## Formato do atlas

- frames é um objeto de nomes para retângulos de textura, cada retângulo contendo x, y, w, h inteiros em pixels.
- animations é um objeto com estados idle, walk, attack, hurt e jump opcional. Cada estado contém fps, frames (nomes) e loop opcional. Attack e hurt não repetem por padrão.
- hitboxes é um array opcional por animação com frame (índice, começando em zero), x, y, w, h. Se a animação de ataque não define uma hitbox, recebe uma área padrão.
- O editor valida dimensões (16–512 px), tamanho de imagem, nomes e limites dos retângulos. Imagem e JSON não executam scripts nem usam URL remota.

## Formato do mapa

SNES2D_MAPAS.json possui version igual a 1 e stages, um array por fase. Cada edição usa layer, x, y, id. Exemplo: layer=collision, x=96, y=96, id=1.
- Layer deve ser background, ground, decoration, foreground ou collision.
- Coordenadas são múltiplas de 16 dentro do mapa. Plataforma: 2048×288. RPG: 1536×576. IDs de 0 até 15 (0 apaga).
- Para criar parede com colisão e aparência visível, pinte em foreground e collision. O editor destaca colisão em vermelho.
- Um mapa importado não substitui os motores clássicos nem cria ROM de Super Nintendo.

## Controles e limites

- Plataforma: A/D ou setas para caminhar, espaço para pular, X para atacar; no celular um botão adicional ATACAR.
- RPG superior: WASD/setas para mover e espaço/botão de ação para atacar.
- Não há exportação ROM .sfc, cutscenes completas, inteligência de inimigos sofisticada, atlas animado 3D, física avançada ou validação automática de alcançabilidade após editar paredes.
- Os sprites de fallback são desenhados em um spritesheet 4×4 em Canvas, caso nenhuma imagem seja importada.

## Testes

- tests/snes2d-animator.test.js cobre estados, hitboxes, atlas, segurança, edição por fase, backups e preservação de game.js.
- tests/browser-export-matrix.py testa os jogos HTML no Chromium e o editor mobile com PNG+atlas e pintura de mapa.
- A matriz anterior de exportação continua sendo executada para impedir regressões.
