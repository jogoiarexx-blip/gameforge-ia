# GF-VOXEL-09 — Paisagens, texturas e streaming de malhas

## Studio
Selecione 64/128/256 blocos por lado (altura 160), paisagem procedural, texturas pixeladas e distância baixa/média/alta. O atlas de 128×64 pixels é gerado pela seed, contém tiles de 16×16, e pode ser visualizado e exportado em PNG. Grama e tronco têm tiles diferentes por face. Há padrões para pedra, terra, tijolo, bancada, forno, baú, folhas, muda, carvão, minério de ferro/cobre, água e areia. O atlas é gerado no jogo sem download adicional. A floresta renovável é uma opção do modo coleta; paisagens com floresta têm dois formatos de copa/tronco, com até 1024 árvores em mapas grandes.

## Mundo
- 64/128/256 blocos por lado: 16/64/256 chunks de 16×160×16. Mapas grandes limitados, não infinitos.
- Paisagem determinística: regiões de floresta, montanha, seca e rio; rios rasos com água sólida visualmente mas não bloqueante ao movimento, bancos de areia, túneis subterrâneos coerentes e ruínas simples de tijolo.
- Água não é minerável, não possui física, natação ou correnteza. Cavernas podem precisar de escavação para acesso. Ruínas não são cidades nem estruturas complexas. Não há biomas de neve/deserto avançado.
- Dados do mundo são gerados na inicialização; os chunks de renderização são carregados por proximidade e descartados fora do raio. Não confundir com geração infinita ou streaming de dados do disco.
- Saves separados por tamanho e paisagem; mudanças de textura e distância não criam outro save. Até 16384 edições em mapas maiores; os anteriores preservam 4096. Baús, drops e criaturas respeitam novos limites.

## Renderização
- Greedy meshing agrupa faces coplanares adjacentes de mesmo material. UVs repetem o tile por bloco no shader, sem esticar a textura sobre a face agrupada. Snapshot com uma célula de borda garante oclusão entre chunks.
- Worker recebe snapshot transferível e devolve buffers de posição/cor/UV/tile. Revisão por chunk e epoch por mundo descartam trabalhos antigos. Fallback em thread principal (um chunk por frame) quando Worker indisponível; preview isolado pode bloquear blob Worker.
- Distância desktop baixa/média/alta: 2/3/4 chunks; mobile: 1/2/3. Botão Visão permite alternar durante o jogo. Fog acompanha raio; geometria antiga é descartada.
- O modo legado sem paisagem/texturas e de 64 blocos mantém renderer e saves anteriores.

## Verificações
Seed 12345, mapa 128, floresta: 64 chunks de dados, 131 árvores de dois tipos, 1977 células de água, 2580 células de areia, 64 tijolos de ruínas, 12582 células de cavernas abaixo da superfície; altura de 47 a 70. Chunk (0,0): 991 faces expostas agrupadas em 421 quads greedy. Atlas determinístico 32768 bytes RGBA. Save de edição distante em (45,100,-45) restaurado em checagem isolada.

Node: atlas, mesher e bordas, paisagem, restauração e mapa 256. Chromium: exportação offline, shader, resultados reais de Worker, cruzamento de limite de chunk, descarregamento e distância móvel. CI completa pendente; nenhum FPS em celular físico foi certificado.

## Limites
Sem geração de chunks de dados em worker, sem mundo infinito, sem água simulada, sem sistema completo de edição de texturas por pixel, sem vegetação fora de blocos e sem estruturas internas avançadas. Depende de GF-VOXEL-08 (#65), retarget para main somente após aprovação da dependência.
