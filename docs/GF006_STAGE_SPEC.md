# GF-006 — StageSpec v1 e layouts de combate 3D
Data: 16/11/2026

## Entrega
- O compilador local agora emite StageSpec por fase, com ID, título, linhas de origem, cenário, inimigos, ondas, chefe e condição de vitória que o runtime reconhece.
- Instruções específicas por fase podem selecionar layouts 3D cross, courtyard e outpost, sem alterar as outras fases.
- Os motores 3D de arena, FPS e RPG constroem geometria e colisões distintas nos layouts pátio e posto avançado.
- O ZIP inclui FASES_EXECUTAVEIS.json e PLANO_FASES.md; o GAME_SPEC também inclui os mesmos dados.
- O módulo funciona offline e nunca executa texto do GDD como código.

## Limitações
- Não constrói interiores acessíveis, cidades completas, rotas físicas alternativas nem NPCs roteirizados.
- Objetivos 3D de combate existentes: eliminar, coletar, sobreviver e atravessar portal.
- Em 2D, StageSpec documenta os contratos não verificados como pendentes.
- scriptedEvents e customTriggers permanecem vazios: não são implementados por texto.

## Verificação
- npm test (inclui tests/stage-spec.test.js)
- npm run verify:exports
- CI Chromium dos gêneros atuais
- Testar manualmente 3 fases (pátio, armazém, avenida) e concluir cada objetivo.

Próximo ciclo: spawns tipados, eventos por dados e checkpoints persistentes com E2E de vitória/derrota.
