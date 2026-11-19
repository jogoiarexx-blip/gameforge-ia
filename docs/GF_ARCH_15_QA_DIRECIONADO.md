# GF-ARCH-15 — QA direcionado por requisito

## Escopo

Versão 15 (19/11/2026) construída sobre a GF-ARCH-14. O GameForge agora executa roteiros de QA conhecidos e tipados **dentro da prévia existente**, reutilizando o canal de mensagens do GameForgeVisualQA e o bridge instrumentado `qa-bridge.js`. Não chama IA externa, não executa código arbitrário e não acessa o GitHub durante os testes.

### O que mudou

1. O novo botão **Executar testes por requisito** fica em *Testes e diagnóstico visual → Rastreabilidade do código e requisitos*.
2. O motor relaciona requisitos explícitos aos roteiros conhecidos. Testes básicos de canvas, erros JS e progresso de frames também são executados.
3. Cenários adicionais: ArrowRight, para pedidos de movimento; espaço, para pedidos de disparo. Outros sistemas não recebem testes simulados.
4. Cada cenário registra início, término, ID, escopo exato, IDs de requisitos afetados, observações/medidas e estados: `PASS`, `FAIL`, `INCONCLUSIVE`, `ERROR`.
5. O relatório `MATRIZ_REQUISITOS_GF14.json` associa as evidências executadas, mas mantém os requisitos como `OBSERVED_PARTIAL` no máximo. Falhas viram `ISSUE_DETECTED`; recursos não suportados permanecem `UNSUPPORTED`.
6. Resultados são vinculados a revisões de `game.js`, `style.css` e do pedido/GDD. A exportação e o salvamento invalidam resultados de outra revisão e exigem nova execução.
7. O projeto e seu ZIP preservam `RESULTADOS_TESTES_GF15.json` e `RELATORIO_TESTES_GF15.md`.

### Contratos e limites

- Os cenários não podem ser definidos por código introduzido pelo usuário. O executor só usa `ping`, `inspect`, `start`, `press`, `release` no QA bridge.
- `inspect` fornece canvas, contador de frames, posição do jogador, estado e erros comunicados; sem imagem nem acesso a arquivos.
- A tecla é liberada em `finally`, inclusive quando o roteiro falha.
- Um cenário `PASS` não equivale a uma funcionalidade inteiramente validada. Uma observação de ArrowRight não certifica salto, câmera, animação, controles móveis ou movimento em outros mapas.
- Movimento pode alterar o estado **da prévia em execução**, não do código-fonte. Salvamento real, missões, chefes, combate completo, AI dos inimigos, assets 3D e taxas de FPS ainda exigem testes específicos ou avaliação humana.
- Checksum FNV é um detector não criptográfico de alteração acidental, **não uma assinatura de segurança**.
- Este release não inclui processo isolado para executar agentes externos; o manifesto GF-ARCH-14 continua apenas informativo. Permissões declaradas não são sandbox.

### Verificações

`npm test`: testes de seleção de cenários, dados inconclusivos, ausência de falsos positivos, vínculo por revisão, liberação de teclas no erro, backup e interface.

`python tests/browser-gf15-scenarios.py`: teste real no Chromium para gerar uma arena, executar cenários, ler os arquivos da matriz e exportar o ZIP.

A suíte existente continua testando exportação de gêneros 2D/3D, restaurar projeto, modelo GLB, histórico e regressões. Merges só após ambas as tarefas CI serem aprovadas.

## Próxima fase GF-ARCH-16

Execução de testes por comportamento específico (ex.: salvamento e retomada, completar missão, morte de chefe) com contratos de telemetria explícitos por motor e processamento em prévia descartável, para evitar impactos sobre partidas ativas. Agentes autônomos devem permanecer fora do processo do navegador até existir isolamento robusto e autorização por ferramenta.
