# GF-TRAIN-21 — Save intermediário seguro em jogos 3D

Data: 23/11/2026. Base: `main` após integração GF-TRAIN-20 (PR #46).

## O que mudou

A GF-TRAIN-21 implementa **continuação no meio de uma fase** para jogos **Arena/FPS/RPG 3D simples**, sem trocar ou migrar os checkpoints de transição de fase já existentes.

- `js/world-rules.js` inclui um contrato independente `gameforge-midstage-v1:GENERO:projectId`, com `midStageKey`, `midStageEligible`, `midStageFingerprint`, `midStagePayload` e `readMidStage`.
- O autosave do motor 3D começa depois de pelo menos 1 segundo de simulação; atualiza a cada aproximadamente 4 segundos de jogo ativo, também ao pausar e durante eventos de saída/blur. Não grava quando morto ou numa transição.
- O save guarda **fase atual (inclusive primeira fase), posição e direção do jogador, vida, pontuação, munição, relógio da campanha e da fase, nível/XP/poções, cristais já coletados e lista de inimigos vivos com HP/posição**.
- Ao iniciar, restaura o registro intermediário somente se for compatível com o contrato do mundo e tão recente em fase quanto o checkpoint de campanha. A cena é recriada antes de aplicar o estado dos cristais e inimigos, evitando respawn dos já eliminados.
- O botão **Reiniciar** limpa os dois tipos de save. Ao completar uma fase, o save intermediário é descartado e o checkpoint antigo é mantido; a vitória final remove ambos.
- Saves inválidos, IDs duplicados, números fora do limite, fingerprints incompatíveis ou jogador reaparecendo dentro de obstáculo não são restaurados. O jogo usa o checkpoint de campanha conhecido quando possível.

## Limites de suporte (importante)

O save intermediário é permitido somente quando o jogo tem `projectId` válido no formato `gf-xxxxxxxx-xxxxxxxx`, pelo menos duas fases, gênero Arena/FPS/RPG em 3D, **sem loja de combate** e sem os sistemas roteirizados abaixo na fase:
- NPC quest/sidequest, sequência de passos (`missionSteps`), eventos por tempo ou zona (`events`, `zoneEvents`) e `sideQuestSteps`.

**Por que esse limite?** Esses sistemas exigem estados de recompensa/evento/quest adicionais. Restaurar parcialmente poderia duplicar recompensas, reaparecer inimigos especiais ou corromper a progressão. Nessas fases permanece o checkpoint seguro **entre** fases.

Ainda não há save intermediário para plataforma, corrida, navinha, urbano, multiplayer, fases com loja ou fases com eventos/NPC. O armazenamento é local ao navegador e não sincroniza aparelhos.

## Testes

- **Node:** `tests/stage-events-checkpoints.test.js` testa salvar posição/vida/tempo/inimigos, destruir e iniciar novamente, reiniciar apagando o save, desativar em fases com eventos/quest, rejeitar registros inválidos e incompatibilidade de projetos de mesmo título.
- **Chromium:** `tests/browser-gf-train-21-midstage.py` reimporta um ZIP realmente gerado, joga por alguns segundos, confirma save, recarrega, retoma a mesma fase, verifica posição/tempo e testa limpar com Reiniciar.
- **Matriz existente:** continuam obrigatórios os testes de GF-TRAIN-20, 19, 18, editor 3D e GLB, além de Node e otimização GLB.

Se qualquer check falhar, não integrar à `main`.

## Oportunidades GF-TRAIN-22

Expandir o contrato de save para eventos, missões secundárias e NPCs com transações idempotentes, incluir teste de coleta/derrota em Chromium e suporte de plataforma 3D. Depois adicionar restauração de bosses e upgrades somente com evidência de integridade.
