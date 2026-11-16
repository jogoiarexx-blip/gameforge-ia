# GF-007 — Encontros, eventos temporizados e checkpoints por fase

Data: 16/11/2026

## Escopo efetivamente implementado

- **Arquétipos de inimigos (arena, FPS e RPG 3D):** `runner` (mais rápido, menos HP), `brute` (maior HP/dano, menor velocidade), `sentinel` (mais resistente), `mixed` (alterna três arquétipos). Possuem escala/cor e atributos de combate diferentes. Sem prometer IA tática, projéteis de NPC ou rigs GLB específicos.
- **Instruções leigas por fase:** “Fase 1: inimigos rápidos”; “Fase 2: brutamontes”; “Na fase 2, ponha inimigos mistos”. GDD e comando mantêm linhas de origem, com precedência do comando mais recente.
- **Eventos temporizados reais (3D combate):** “Aos 5 segundos chegam 3 reforços” (2–8 inimigos extras) e “Cura 25 aos 8 segundos” (10–45 pontos de vida). Cada evento executa **uma vez por tentativa**, e uma missão não é declarada concluída antes de reforços pendentes.
- **Checkpoint persistente após concluir fase:** somente arena/RPG/FPS 3D sem loja de combate. Salva ao entrar na fase seguinte (índice, vida, pontuação, munição, relógio, nível, XP e poções). Restaura em recarga do navegador. Botão **Reiniciar** limpa o checkpoint; conclusão da campanha também o remove.
- **Isolamento e validação:** a chave `gameforge-campaign-v1:<gênero>:<projectId>` usa ID determinístico do conteúdo do projeto, e não somente título. Save inválido, de outra campanha ou de versão incompatível é rejeitado. O armazenamento é opcional (falha de quota/privacidade não impede jogo).
- StageSpec e `FASES_EXECUTAVEIS.json` passam a incluir encontros, eventos e dados de checkpoint, sem introduzir código arbitrário a partir da prosa.

## Limites conhecidos

- Checkpoints no meio da fase, salvamento dos créditos/upgrades da loja FPS, partidas 2D e gênero urbano não estão cobertos por esta entrega.
- Reforços e curas temporizados são os únicos novos eventos de script executáveis; diálogos, patrulhas cinematográficas, rotas secretas e outras ordens livres continuam sem contrato.
- A identidade derivada de GDD/comando separa jogos diferentes e permanece estável nos dados exportados; cópias intencionalmente idênticas compartilham uma identidade. Para duplicatas independentes, será preciso uma função de clonar projeto com novo ID.
- Sem benchmark de FPS em Android/iOS reais, e sem prometer inteligência adaptativa dos NPCs.

## Verificação

- `npm test` (inclui `tests/stage-events-checkpoints.test.js`)
- `npm run verify:exports`
- CI Chromium: exportações dos gêneros, prévia, ZIP e continuidade
- Testes automatizados de spawn temporal, idempotência de eventos, conclusão de fase, reload e reset de checkpoint

Próxima melhoria proposta: sistema de objetivos encadeados e eventos por gatilho de posição com E2E de campanha de ponta a ponta.
