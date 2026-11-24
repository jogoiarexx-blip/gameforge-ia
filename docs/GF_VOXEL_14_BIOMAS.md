# GF-VOXEL-14 — Biomas expandidos

## Implementação
Opção de biomas expandidos no Studio. Ativa a paisagem e, no modo coleta, a floresta. Clima e umidade por ruído coerente em coordenadas globais determinam neve, deserto e pântano; regiões muito úmidas geram lagos rasos. Mantém regiões originais, rios e montanhas. Vilarejos têm prioridade nas suas áreas. Neve, lama e cacto são blocos coletáveis e selecionáveis, com tiles de 16×16 editáveis no atlas existente (11, 13 e 14). Cactos são colunas sólidas de 2–3 blocos; não causam dano. Pinheiros de seis blocos de tronco e palmeiras de cinco, com copas distintas, somados às duas formas anteriores. Árvores seguem corte/replantio, cache e persistência. Sem árvores renováveis no modo criativo. O save de biomas possui chave própria.

## Checagem isolada
Seed 12345, mapa 512, paisagem sem vilarejos, modo coleta: 67.824 colunas de neve, 23.741 de deserto, 32.027 de pântano, 16.125 de lago, 421 colunas de cactos, 612 pinheiros e 70 palmeiras. Comparação de três snapshots com o worker foi idêntica. Save restaurado. Testes Node e Chromium adicionados; CI pendente.

## Limites
Lagos são estáticos e não há cachoeiras, propagação da água, oclusão de tochas por paredes ou mundo infinito. Esses itens ficam para incrementos posteriores. Não há certificação de desempenho em celular físico. Depende da PR #70.
