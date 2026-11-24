# GF-TRAIN-22 — estado roteirizado no save intermediário 3D
Data: 23/11/2026. Expansão de GF-TRAIN-21. Referências conceituais: [Sucata Zero / missões](https://github.com/luispauloalves500/sucata-zero/blob/main/src/progression/quests.ts), [Crise no Vale / campanha](https://github.com/luispauloalves500/crise-no-vale/blob/main/js/campaign-rules.mjs).

- Snapshot único: eventos disparados, escolhas, estado NPC, índices e relógios das missões principais/secundárias, posição do NPC e recarga.
- Reconstrução das ondas disparadas por ordem de IDs antes de restaurar inimigos vivos, sem reaplicar cura ou recompensas. Estado completed impede pagar novamente.
- Contratos inválidos, eventos desconhecidos, escolhas inválidas, índices inconsistentes e estados ausentes são rejeitados; fallback ao checkpoint existente.
- Saves antigos de fases simples continuam legíveis. Loja, multiplayer, plataforma e outros runtimes não incluídos; nenhum sistema de inventário externo importado.
- Teste Node de boot/reload, recompensa única e snapshot inválido. CI pendente; revisão visual e teste Chromium de cenário roteirizado ainda necessários. Não integrar à main antes da validação.
