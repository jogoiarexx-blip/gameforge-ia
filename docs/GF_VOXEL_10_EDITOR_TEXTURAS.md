# GF-VOXEL-10 — Editor de texturas e paisagem detalhada

## Editor no Studio
Abra Editor de texturas e selecione uma das 17 superfícies. Pincel com cor RGB, pintura por mouse/toque, preenchimento, histórico de até 20 operações, restauração de um material ou de todo o atlas gerado pela seed. PNG/WEBP importados localmente, até 4 MB e 2048 px por dimensão; uma imagem é redimensionada para 16×16, atlas 2:1 para 128×64. Transparência composta sobre a textura anterior. Exportação de tile e atlas em PNG. O atlas personalizado é validado (32.768 bytes de RGBA) e serializado no jogo offline, sem depender de rede. Alterações invalidam o ZIP antigo; criar nova prévia aplica a edição.

## Paisagem detalhada
Opção Vilarejos, pontes e vegetação ativa a paisagem do GF-VOXEL-09. Geração por seed de casas de pedra/tijolo com telhados, janelas e portas abertas, caminhos de pedra, pontes rasas sobre rios e vegetação decorativa de três tipos (gramíneas, flores e arbustos). A geometria decorativa usa uma malha instanciada por chunk, é descartada com a malha de terreno e respeita edificações e edições. Os saves desta paisagem são separados; texturas não alteram a chave.

## Desempenho
Métricas de FPS médio, 1% low e p95 em telemetria, HUD atualizado até 10 vezes por segundo no modo streaming, medição em tempo real de frames ativos. Não há certificação de FPS em dispositivo físico.

## Verificação
Na seed 12345 em mundo 128×128 sem floresta, checagem isolada confirmou 299 colunas de casas, 366 células de caminhos, 84 células de ponte e 1383 plantas decorativas (404 flores e 228 arbustos). Save da paisagem detalhada restaurado e rejeitado no modo anterior. Atlas personalizado validado e serializado com preservação de tiles vizinhos. Testes Node de atlas e paisagem, e Chromium com pintura, undo, importação PNG/WEBP, ZIP e vegetação. CI completa pendente.

## Limites
Mundo permanece finito até 256×256; geração de dados inicial ainda síncrona. Vegetação é decorativa, não coletável. Casas e estradas são estruturas básicas, sem NPCs ou interiores decorados. Iluminação dinâmica, tochas, sombras, 512×512 e geração infinita serão tratados separadamente para não introduzir regressões no streaming. PR depende da #66; GF-VOXEL-09 teve erro de sintaxe no teste Chromium corrigido, revalidação pendente.
