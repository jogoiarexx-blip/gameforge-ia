# GF-VOXEL-11 — Mundo 512 e atmosfera

## Mundo e cache
Novo tamanho 512 × 512 × 160: 1024 chunks possíveis. Terreno denso só é materializado quando a malha é solicitada, em cache LRU de até 96 chunks. Consultas de colisão e raycast fora do cache calculam o bloco por seed e consultam sobreposições esparsas de edições e árvores. Não perde alterações ao descartar chunk. Floresta continua gerada como registros leves no início; não é geração infinita. Geração de dados do chunk ainda ocorre na thread principal; a malha é processada no worker do GF-VOXEL-09. Saves separados por tamanho, com limite de 16384 edições e até 4096 árvores. Modos menores mantêm comportamento anterior.

## Atmosfera
Opção de céu, sol, lua, 24 nuvens instanciadas, chuva visual com até 160 segmentos desktop/64 mobile, neblina variável e modulação global de luminosidade. Clima determinístico por seed e tempo ativo, sem física de chuva. Água texturizada recebe animação de cor no shader; não simula correnteza. Em sobrevivência usa relógio do mundo salvo, nos demais modos usa tempo da sessão. Não inclui iluminação local por tochas, sombras dinâmicas ou propagação de luz.

## Verificação
Checagem isolada com seed 12345, floresta e paisagem detalhada: 1024 chunks possíveis, nenhum chunk denso residente ao criar mundo, 113 gerados após percurso de snapshots, 17 descartados e 96 residentes (3.932.160 bytes de voxels densos, aproximadamente 3,75 MiB; não é RAM total). Construção em (200,110,200) e árvore cortada preservadas após evicção e save/reload. Save de amostra com 1485 árvores restantes: 92.772 caracteres. Testes Node e Chromium do ZIP, cache, shader e atmosfera. CI completa pendente. Não há certificação de FPS ou consumo total de memória em celular físico.

## Próximos incrementos
Iluminação local e sombras leves, tochas, geração dos dados em worker, maior alcance e estratégia de saves para mundo infinito. Não confundir cache de dados com geração de chunks infinita.
