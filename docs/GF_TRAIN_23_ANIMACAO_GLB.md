# GF-TRAIN-23 — Animação GLB e camadas seguras
24/11/2026. Inspiração conceitual: [teste de pose do Limiar](https://github.com/luispauloalves500/limiar-ecos-da-quarentena/blob/main/tests/pose-restore.test.ts).
- Controlador comum de GLB: restaura pose anterior do mixer, captura a nova pose e aplica offsets quaternion opcionais por nome exato de osso. Valida peso e quaternion, permite limpar camada; sem camada na morte.
- Ataques urbanos acionados por eventos reais de disparo/dano, não por duração de ruído ou proximidade. Clipe ausente não vira ataque fictício. Morte terminal e reset para nova partida.
- Testes com Three.js real e canal constante durante 120 frames, repetição de ataque, morte e reset.
- Limites: sem retargeting automático, IK, rigging ou geração de clipes novos. Camadas são API opt-in, sem inventar offsets para rigs desconhecidos. Validação Chromium e visual pendente; não integrar antes do CI.
