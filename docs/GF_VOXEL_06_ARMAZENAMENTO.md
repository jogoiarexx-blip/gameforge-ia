# GF-VOXEL-06 — Baús e itens no chão

Incremento opcional sobre GF-VOXEL-05; ativa no Criador Voxel quando modo Coleta e fabricação e opção Baús e itens no chão são selecionados. Sem alteração dos saves anteriores: chave de armazenamento separada.

## Jogabilidade
- Faça um baú na mochila com 3 pedras. Selecione com 9 e coloque usando Q. Baú sólido, 12 slots de até 99 por pilha, até 64 baús.
- Mire no baú a até 3 blocos, B ou botão Baú para abrir. Guardar/retirar uma unidade por operação. Não destrói baús contendo itens. Picareta equipada não pode ser depositada se for a última.
- G ou botão Soltar item remove uma unidade do bloco selecionado da mochila e cria um item persistente no chão. Após 1,5 s de simulação ativa, coleta automática até 1,4 bloco, somente com espaço. Máximo de 96 drops. Representação 3D compartilhada com rotação/flutuação, sem gravidade, sem despawn e sem drops automáticos de mineração.
- Operações preparam cópias do inventário antes de alterar mundo ou armazenamento. Não gasta item quando colocação falha, não destrói baú cheio, não recolhe drop quando inventário cheio. Save valida IDs, limites, chests órfãos, registros duplicados, modo e inventário. O save inclui conteúdo de baús, posição e atraso dos itens.

## Validação
`tests/voxel-storage.test.js` verifica conservação, distância, capacidade, proteção, drop e save. `tests/browser-gf-voxel-06.py` verifica exportação e uso no Chromium (criar/colocar baú, guardar/retirar item, tentativa de quebrar cheio e recolher item após recarga). A checagem isolada confirmou proteção do baú, conservação, restauração e coleta. CI completa pendente.

## Dependências e limites
Depende de GF-VOXEL-04 PR #57 e GF-VOXEL-05 PR #59. Corrigidos nestas branches os erros de contexto Playwright e comparação de zero com sinal. O teste antigo chain-aquarium-mobile permanece obrigatório. Não há multiplayer ou sincronização de baús. Durabilidade e níveis de ferramenta ficam para a próxima etapa, GF-VOXEL-07, incluindo metadados individuais por item. Não publicar antes da validação das dependências e da CI completa.
