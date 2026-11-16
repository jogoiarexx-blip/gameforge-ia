# GF-TRAIN-04 — Treinamento de jogabilidade nos jogos realmente exportados

## O que foi implementado

Esta etapa não modifica pesos de modelo de IA. Ela acrescenta **testes de comportamento jogável** ao GameForge, depois das rodadas 01–03 de reconhecimento do português. O objetivo é impedir que uma instrução seja marcada como bem-sucedida só porque aparece no `GAME_SPEC` ou o JavaScript compila.

O `tools/build-browser-fixtures.cjs` mantém as **15 exportações padrão** de GF-002 e produz **3 novos jogos** com requisitos compilados diretamente de frases em português:

- **Arena 3D — sobrevivência:** `Na fase 1, sobreviver por 5 segundos.` Verifica que `missionReady` começa falso e passa a verdadeiro após tempo de jogo real no Chromium.
- **FPS 3D — loja de munição:** `Balas custam 30 créditos.` Verifica preço em `GAME_SPEC`, existência de créditos e que a loja abre e fecha com teclado.
- **Navinha 3D — chefe somente na última:** verifica `boss: no/no/yes` no `GAME_SPEC`, boot de três fases e pelo menos um disparo acionado por teclado.

O script `tests/browser-gameplay-training.py` também abre ZIPs reimportados de **seis motores** (plataforma e arena 2D; arena, FPS, shooter e corrida 3D) e verifica:

1. Menu e inicialização do jogo;
2. Comandos de teclado e deslocamento mensurável onde aplicável;
3. Relógio de gameplay avançando normalmente;
4. Pausa que **interrompe a simulação**, mas não interrompe o desenho dos quadros;
5. Retomada depois da pausa;
6. Reinício que zera o tempo;
7. Nenhuma exceção JavaScript durante a sessão;
8. Nenhuma dependência de rede externa nos seis cenários-base.

O manifesto e os resultados são produzidos em `tests/_browser_output/gameplay-training.json` e `gameplay-training-results.json`. Em caso de falha, salva screenshot por cenário.

## Como executar

```bash
node tools/build-browser-fixtures.cjs
python tests/browser-gameplay-training.py
```

A rotina é executada em CI pela etapa **GF-TRAIN-04** de `.github/workflows/verify.yml`, em conjunto com `npm test`, `verify:exports`, a matriz de navegador GF-002 e o teste de continuidade GF-005.

## Limites transparentes

- Não mede FPS reais em smartphone, não cobre toda a campanha nem demonstra combate até derrotar todos os chefes.
- A missão de sobrevivência é avaliada até destravar o requisito, não até vencer todas as fases.
- São **9 sessões automatizadas** de browser com critérios explícitos, não 9 jogos completos.
- Colisões e recuperação de saves são cobertas por outras suítes existentes; o novo teste não substitui os contratos dessas suítes nem QA humano de teclado, toque e gamepad.
- A nova suíte deve ser aprovada no mesmo SHA de todos os outros jobs **antes** da publicação. O PR é de revisão, não uma atualização da página pública.

## Próxima rodada

Ampliar a validação de objetivos compostos para eliminação/coleta, chefes até conclusão, compra/desconto real na economia e matriz de dispositivos, com critérios de aceite observáveis e fixtures que reproduzam cada bug. Validar casos novos fora do corpus criado pelo próprio desenvolvedor.
