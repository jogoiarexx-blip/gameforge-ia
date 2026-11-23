# GF-TRAIN-20 — Auditoria de PRs antigas e recuperação de gameplay real

Data da auditoria: **23 de novembro de 2026**. Base analisada: `main` no commit `7de36383fea87caf24b898d5bf408bfb7dd21633`.

## Conclusão principal

Os sete PRs #9–#14 e #36 ainda estão abertos e **não devem ser integrados em lote**. Os PRs #9–#14 são uma pilha antiga dependente: cada etapa foi desenvolvida sobre a branch anterior, e não sobre a `main` atual. O PR #36 altera componentes sensíveis da interface e de QA, e está dezenas de commits atrás da `main`. Ainda que o GitHub calcule diffs e alguns PRs antigos sejam marcados mergeable, isso **não** é evidência de segurança de runtime nem de compatibilidade com o código novo.

| PR | Contribuição única identificada | Estado vs `main` atual | Decisão |
|---|---|---|---|
| #9, GF-TRAIN-03 | 120 pedidos compostos, ajuste de compilação e testes novos | Corpus de 120 casos ainda não presente na `main`; compilador atual foi ampliado por outras rotas | Estudar como corpus independente e executar sobre compilador moderno; não copiar `intent-compiler.js` antigo |
| #10, GF-TRAIN-04 | Browser testando movimentação, pausa, retomada, reinício, objetivos e loja, além de gerador de fixtures | A matriz atual verifica boot e múltiplos sistemas, mas a suíte dedicada de nove sessões não foi transportada | **Recuperar princípios e ampliar** no GF-TRAIN-20, sem substituir a matriz atual |
| #11, GF-TRAIN-05 | Chefão com derrota obrigatória; ciclo loja/economia e vitória | Alterações antigas em `shooter-3d-runtime.js` confrontam melhorias recentes de rotas, GLB e performance | Manter aberto; criar testes dedicados de derrota do chefe e recompensas antes de transplantar lógica |
| #12, GF-TRAIN-06 | Save de campanha no shooter 3D e testes de três chefes | `main` tem save de **rota selecionada** quando StageBranches está ativo, não o checkpoint genérico de campanha dessa PR | Reimplementar incrementalmente no runtime atual, com chave versionada; não copiar engine antigo |
| #13, GF-TRAIN-07 | Checkpoint para RPG e plataforma 3D | `main` já tem checkpoint entre fases para RPG, FPS e Arena 3D com `projectId`; **plataforma 3D ainda não usa o mesmo contrato** | Não duplicar RPG; separar implementação de plataforma para fase posterior |
| #14, GF-TRAIN-08 | Save intermediário de objetivos em RPG/plataforma 3D | `main` salva checkpoint após transição de fase, não o estado completo dos objetivos no meio dela | Necessita contrato de estado e migração próprios; não fazer merge direto |
| #36, GF-ARCH-18 | QA de save urbano e contrato de checkpoint em clones de origem opaca | `main` já tem GF-ARCH-17 e persistência urbana; o teste 3D completo dessa PR ainda não foi transplantado | Rebase seletivo dos testes/QA, mantendo isolamento e integridade do backup |

## Checkpoints: o que existe hoje

`js/world-rules.js` oferece `checkpointKey`, `checkpointPayload` e `readCheckpoint` para **Arena, FPS e RPG 3D** somente quando há:
- `projectId` válido no formato `gf-xxxxxxxx-xxxxxxxx`;
- ao menos duas fases e save correspondente a uma fase que já teve a anterior concluída;
- ausência de loja `combatEconomy.enabled` no FPS;
- progresso dentro dos limites definidos no contrato (`health`, `score`, `ammo`, relógio e XP).

`js/three-runtime.js` consome o checkpoint no botão Iniciar e escreve novo checkpoint **na transição de fase**. Não salvar cristais, inimigos abatidos e posição mid-stage é uma limitação real. O shooter com rotas usa outra chave e não substitui o save de campanha genérico.

Por isso a GF-TRAIN-19 foi ajustada no GF-TRAIN-20: checkpoint agora é **parcial** para Arena/FPS/RPG 3D e **pendente** para plataforma, navinha e outros motores sem o mesmo contrato.

## Recuperação GF-TRAIN-20

Em vez de importar arquivos de runtime antigos, esta etapa:
1. Mantém as **16 exportações** já verificadas no navegador.
2. Gera **três jogos novos reais** a partir de comandos em português: arena com sobrevivência de 5 segundos, FPS com compra real de munição e shooter 3D com chefe apenas na terceira fase.
3. Abre os seis jogos-base (plataforma e arena 2D; arena, FPS, shooter e corrida 3D) **a partir do ZIP reimportado** e valida menu, relógio avançando, teclado, pausa, renderização em pausa, retomada, reinício e ausência de exceções/scripts remotos.
4. Executa os três cenários com critérios observáveis no jogo (não só JSON): missão liberada após tempo real, créditos debitados e balas entregues, projétil da nave disparado.
5. Exercita controles de tela de plataforma 2D e arena 3D num viewport móvel emulado via Chromium CDP. **Não afirma ter testado aparelho real**.
6. Grava resumo de aprovação/falha em `tests/_browser_output/gameplay-train20-results.json`; screenshots de falhas entram no artefato de CI.
7. Protege os contratos de checkpoint modernos com testes Node e impede reportar falso recurso concluído.

## Executar e aceitar

```bash
npm test
npm run train:threejs
node tools/build-browser-fixtures.cjs
python tests/browser-gf-train-20-gameplay.py
```

Critério para merge: os testes Node, a otimização GLB e **todo o job Chromium** devem passar no mesmo SHA; qualquer reprovação exige correção antes de integrar à `main` e publicar.

## O que não foi prometido

Esta etapa não entrega checkpoint mid-stage para plataforma/navinha, derrota de todos os chefes, animação GLB completa ou FPS medido em smartphone. A PR #36 continua independente, e as PRs antigas não são fechadas até serem reconciliadas e verificadas. **11 sessões automatizadas** comprovam somente os comportamentos explicitados.

Próximo incremento: contratos versionados de checkpoint para plataforma 3D e shooter 3D, com teste de continuidade de campanha real em Chromium e sem perda da progressão existente.
