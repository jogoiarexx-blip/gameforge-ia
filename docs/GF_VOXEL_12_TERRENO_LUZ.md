# GF-VOXEL-12 — Terreno em worker, 1024 e tochas

Novo tamanho finito de 1024×1024×160 (4096 chunks de 16×16×160). Mantém cache LRU de no máximo 96 arrays densos. Para mundos 512/1024, o worker recebe seed, coordenadas e alterações esparsas (inclusive árvores e bordas); gera snapshot e malha, devolvendo buffers transferíveis. Colisão consulta terreno por seed fora do cache. Chunk inicial e fallback ainda gerados na thread principal. Jobs conservam revisões e epoch. Não é mundo infinito.

Opção de iluminação: em coleta, ativa floresta. Receita de 2 tochas por 1 madeira + 1 pedra. T seleciona, Q coloca, E minera. Tocha não bloqueia movimento, geometria de dois cuboides, 256 por mundo, luz quente de até 8 blocos de raio; 4 fontes mais próximas no mobile e 8 no desktop. Oclusão vertical no mesher escurece faces cobertas; shader aplica atenuação por distância. Luz aproximada, não há sombras projetadas ou bloqueio da luz por paredes. A tocha não requer sustentação física. Saves separados por tamanho e iluminação; fontes reconstruídas pelas edições.

Verificação isolada: 4096 chunks possíveis, 1756 árvores com seed 12345 e paisagem detalhada; 1 chunk denso materializado durante teste, snapshot local e do gerador de worker idênticos, tocha com 72 vértices e persistência confirmada. Testes Node de fronteiras, receita, restauração e atenuação. Teste Chromium exportado verifica worker de terreno, shader e tocha por comando real. CI pendente.

Próximos incrementos: física simplificada da água, novos biomas, sombras por oclusão e propagação de luz, mundo infinito com estratégia de persistência por região. Não há medição de RAM total/FPS em celular físico.
