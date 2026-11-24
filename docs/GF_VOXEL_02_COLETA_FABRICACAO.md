# GF-VOXEL-02 — Coleta, fabricação e inventário

Base: GF-VOXEL-01 (PR #52), com referência aos contratos de receitas por estação e conservação de itens do Prismal Voxel.

## Novo modo opcional

O Criador Voxel 3D oferece Criativo e Coleta e fabricação. O modo criativo conserva os blocos ilimitados. Coleta tem 12 slots de até 99 itens, começa com 12 pedras e 4 terras e utiliza transações: coletar só remove bloco se houver capacidade; construir só gasta material após edição válida.

- Mochila: bancada de pedra (4 pedras).
- Bancada colocada a até 3 blocos: forno (5 pedras) e picareta (2 pedras).
- Forno colocado a até 3 blocos: 2 terras viram 2 tijolos.
- Picareta equipável (F ou botão) necessária para minerar pedra.
- I abre inventário, abas mostram apenas as receitas da estação selecionada, teclas 1–6 selecionam bloco.
- Save v1 separado do modo criativo guarda inventário, equipamento, bloco selecionado e mundo; não migra nem sobrescreve saves antigos.

O forno usa receita imediata, sem combustível/tempo; picareta não tem desgaste. Bancada, forno e tijolo são blocos sólidos com cores próprias. Ainda não há árvores, mudas, baús, criaturas, fome, multiplayer ou mundo infinito. A ferramenta é equipável como estado de jogo, não um modelo 3D na mão.

## Testes
tests/voxel-economy.test.js: proximidade, estação correta, débito, capacidade, mineração, colocação, save isolado e rejeição de estado inválido. tests/browser-gf-voxel-02.py: geração de ZIP, colocação física de estações, fabricação, equipamento e recarga real em Chromium. A integração depende de PR #52 e de CI verde.

## Próximo passo
GF-VOXEL-03: árvores com troncos e folhas, corte, drops, mudas, plantio e crescimento persistente; depois expandir o mundo e introduzir sobrevivência.