# GF-VOXEL-05 — Atores articulados e ferramentas em primeira pessoa

Incremento visual reutilizável do sandbox voxel, sobre GF-VOXEL-04 (PR #57). Não altera as regras de inventário, dano ou o formato dos saves.

- Ovelha procedural: corpo, lã, cabeça, focinho, orelhas, olhos e quatro pernas articuladas.
- Inimigo noturno: torso, cabeça, olhos, braços e pernas articulados; marcha, orientação pelo movimento e gesto de ataque próximo.
- Viewmodel independente do mundo: mão, bloco selecionado ou picareta equipada; movimento de caminhada e arco de 0,30 s em mineração, construção ou ataque bem-sucedidos.
- Renderização do viewmodel após a cena do mundo, com limpeza de profundidade e restauração de autoClear; ajuste horizontal por proporção de tela.
- Uma geometria de cubo compartilhada entre atores e mãos, cache de materiais por cor, remoção de instâncias antigas. Sem GLB adicional, sem CDN.
- Mantém telemetria de triângulos do mundo separada do viewmodel; expõe contagem de partes, ferramenta visível e ações animadas.
- Exportação autônoma e todos os modos antigos preservados.

## Testes

tests/voxel-actors.test.js: Three.js real carregado do bundle local, geometria compartilhada, quatro pernas, remoção de atores, seleção de ferramenta, arco de ação e restauração de estado do renderer. As regressões Chromium GF-VOXEL-01/02/04 verificam visual de bloco, mineração, picareta e criaturas reais no ZIP exportado.

A verificação isolada confirmou 23 partes de dois atores com uma única geometria e arco de mineração de -0,95 rad. Isso não mede desempenho em hardware móvel.

## Limites

Modelos low-poly procedurais, não rigs esqueléticos GLB. Não há itens físicos no chão, baús, durabilidade, ferramentas adicionais nem animações de queda. Próximo incremento GF-VOXEL-06: armazenamento, drops e durabilidade com conservação de itens e testes de save. PR dependente da #57; após sua aprovação, retarget para main e validar antes do merge.
