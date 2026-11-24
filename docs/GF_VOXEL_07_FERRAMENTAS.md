# GF-VOXEL-07 — Progressão de ferramentas e minério

Modo opcional no Criador Voxel: Coleta e fabricação + Ferramentas duráveis e minério. A opção habilita floresta para garantir acesso à madeira. Chave de save independente dos modos anteriores.

| Ferramenta | Receita | Usos | Intervalo entre minerações | Dano |
|---|---|---:|---:|---:|
| Madeira | 2 madeiras, mochila | 24 | 0,70 s | 1 |
| Pedra | 2 pedras, bancada | 64 | 0,38 s | 2 |
| Ferro | 2 lingotes, bancada | 160 | 0,18 s | 3 |

- Minério de ferro determinístico na faixa de 4 a 14 blocos abaixo do terreno, substituindo parte da pedra. Apenas picaretas de pedra/ferro extraem minério. Picareta de madeira extrai pedra.
- Forno próximo transforma minério + madeira em lingote (receita imediata).
- F alterna ferramentas possuídas e mão vazia; R repara ferramenta equipada na bancada próxima, usando uma unidade de madeira/pedra/lingote conforme nível.
- Mineração de pedra/minério e ataque bem-sucedido gastam um uso. Ferramenta esgotada é removida da mochila. Visual em primeira pessoa varia a cor da cabeça da ferramenta.
- Uma ferramenta de cada nível por jogador; desgaste persistente por nível. Ferramentas duráveis não podem ser armazenadas em baús ou largadas, evitando perder seus metadados. Minério e lingotes podem ser armazenados. Não há transferência multiplayer.
- Saves validam correspondência entre equipamento, inventário, durabilidade e modo. Não migra nem sobrescreve saves anteriores.

## Validação
Teste de regras `tests/voxel-tools.test.js`: geração determinística, extração, progressão, reparo, quebra, persistência e rejeição de duplicatas. Teste Chromium `tests/browser-gf-voxel-07.py`: cortar árvore, fabricar e equipar picareta, minerar pedra e restaurar desgaste no ZIP. Verificação isolada confirmou 80 blocos de minério em amostra de seed 12345, bloqueio para madeira, extração de pedra, processamento e reparo, além de leitura do save. CI completa pendente.

## Limites e dependências
A velocidade é intervalo entre ações, não mineração contínua com barra de progresso. Não inclui machados, pás, espadas ou forno temporizado; ficam para incremento posterior. Depende das PRs #57, #59 e #61; não integrar antes de aprovar dependências e CI completa.
