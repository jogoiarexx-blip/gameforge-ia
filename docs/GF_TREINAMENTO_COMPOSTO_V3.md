# GF-TRAIN-03 — interpretar comandos compostos, sem trocar regras de fase

## Escopo

**Esta rodada amplia a suíte para 364 pedidos rotulados no total**: 144 da primeira rodada, 100 da segunda e **120 novos pedidos combinados** nesta terceira rodada. O motor de interpretação funciona por regras locais e não possui processo de treinamento de pesos de modelo de IA. O objetivo é aumentar a fidelidade do compilador às instruções leigas, não aparentar que mecânicas ausentes foram criadas.

## Defeito corrigido

No compilador anterior, uma frase como:

> Crie arena 3D com 4 fases. Na fase dois, coloque 7 inimigos, e na fase três sobreviver por 45 segundos.

podia deixar sobrevivência vinculada à fase dois, porque `requirements()` extraía apenas a primeira menção a fase dentro de uma linha. O novo segmentador quebra por ponto, ponto e vírgula, interrogação, exclamação e por vírgula/conjunção **somente quando começa outra referência explícita de fase**. O reconhecimento preserva `fase três` e `missão` acentuadas; o pedido original não é modificado.

O compilador segue respeitando cabeçalhos Markdown e não permite que requisitos de uma fase contaminem outras.

## Testes

- `training/composed-ptbr-v3.json` — 120 frases sintéticas rotuladas com o gênero, a dimensão, o número de fases, os campos esperados **por índice de fase**, os campos que devem permanecer vazios e as pendências não implementadas.
- `tests/composed-training.test.js` — verifica os 120 comandos, mais 10 jogos gerados com `Generator.generate()`, o `GAME_SPEC` realmente embutido em `game.js` e a compilação JavaScript dos arquivos exportados.
- Entradas combinadas cobrem **inimigos + objetivos**, **ondas + chefes + tema**, **voltas + cenários**, **GDD antigo + instrução recente**, **nomes de fases escritos por extenso**, **requisitos pendentes combinados** e **chefes ativados ou desativados em fases específicas**.
- Cada mudança também precisa preservar os 244 casos anteriores e os testes do conjunto de motores 2D/3D no mesmo SHA.

## Limites e próximas metas

Este treinamento confirma **extração, serialização, isolamento de escopo e sintaxe dos jogos exportados**. O teste de sintaxe de `game.js` não equivale a simular a missão completa nem a observar os gráficos. Os testes Chromium do pipeline são exigidos, mas QA manual em PC e celular e métricas de FPS continuam passos separados.

A próxima etapa indicada é validar resultados com comandos reais de usuários (com consentimento e anonimização), separados dos exemplos que orientaram as correções, e testar jogabilidade efetiva de cada objetivo nos runtimes. Não usar o índice de acertos no corpus sintético como medida de generalização da IA.

## Execução

```bash
node --test tests/composed-training.test.js
npm test
npm run verify:exports
```

**Segurança:** nenhuma instrução recebida é executada como JavaScript; recursos sem implementação ficam como pendência. O código fica em PR de revisão, sem publicação automática antes de validação.
