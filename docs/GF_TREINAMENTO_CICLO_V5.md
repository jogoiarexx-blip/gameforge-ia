# GF-TRAIN-05 — gameplay de ponta a ponta: chefes, loja e salvamento

Este pacote complementa os 364 exemplos rotulados e os nove cenários de navegador do GF-TRAIN-04 com novos **critérios de comportamento real**. Não treina pesos de modelo de IA; é uma melhoria do motor e sua suíte de regressões.

## Defeito real corrigido no shooter 3D

Antes, quando o chefão ultrapassava o fim do mapa (ou colidia com a nave) e desaparecia, a lógica `enemies.length===0` podia tratar a fase como concluída. Isso permitia uma vitória sem derrotar o chefe.

**Agora:**
- `bossDefeated` começa falso em cada fase e só se torna verdadeiro ao causar dano letal por disparo real.
- Fuga do chefe ou colisão contra o jogador encerra a tentativa com **derrota**, não com vitória.
- A fase só concede bônus e avança se o chefe exigido foi realmente derrotado.
- O prêmio do chefe (900 pontos) só é concedido uma vez; bônus de fase (+500) continua separado.
- A telemetria do shooter expõe `bossDefeated` e `bossHp` para inspecionar resultados de QA.

Os três testes adicionados a `tests/shooter-3d.test.js` cobrem fuga, colisão e vitória por tiros com pontuação exata. Os testes usam o runtime real num VM; somente o ambiente de teste possui uma sonda privada de preparação de encontro para não esperar ondas inteiras. A sonda **não aparece no jogo publicado** e não substitui as funções de tiro, colisão, prêmio ou conclusão.

## Compras e salvamento nos jogos realmente exportados

`tests/browser-gameplay-lifecycle-v5.py` abre os arquivos reimportados dos ZIPs criados pelo GameForge e simula sessões reais no Chromium:

1. **Loja do FPS 3D**: preço de munição fixado em 30 por texto, três compras com desconto de 30 cada, estoque acrescido de 40 por compra, ausência de compra sem saldo, upgrade não pode ser grátis, relógio de combate fica parado com loja aberta, retomada e reinício limpam corretamente histórico/saldo.
2. **Missão urbana 3D**: tiro diminui vida do guarda, estado parcialmente ferido é salvo e recuperado após recarregar a página, derrotar o guarda sozinho não concede recompensa, interagir longe do armazém não vence a missão, captura na porta conclui a missão, prêmio é exatamente +450 e o estado persiste após novo recarregamento sem duplicar pagamento.

Os resultados estruturados ficam em `tests/_browser_output/gameplay-lifecycle-results.json`; capturas em caso de falha ficam em `screenshots/*-gftrain05-failure.png`.

## Validação e limites

- `npm test` inclui os testes de regressão do chefão.
- O job Chromium da CI também executa `python tests/browser-gameplay-lifecycle-v5.py` após a matriz de gameplay GF-TRAIN-04.
- Os testes de navegador avaliam **dois ciclos adicionais**, não a totalidade dos gêneros, fases e sistemas de combate.
- O teste do boss é com encontro isolado e tiros do runtime num ambiente controlado; não representa uma campanha 3D jogada inteiramente do começo ao fim por um usuário.
- O salvamento testado é o do protótipo urbano; não há alegação de save universal em outros motores.
- A alteração permanece em branch/PR até que Node e Chromium estejam verdes no mesmo SHA. Publicação automática no Pages não está autorizada por este pacote.

## Execução local

```bash
npm test
node tools/build-browser-fixtures.cjs
python tests/browser-gameplay-lifecycle-v5.py
```
