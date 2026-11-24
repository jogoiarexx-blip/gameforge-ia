# GF-TRAIN-28 — Voo livre arcade XYZ
24/11/2026. Referências conceituais: Asas do Eclipse (input unificado e cancelamento de toque) e Dragon Fury (inclinação visual e perfis de movimento).
- API independente de renderização: passo fixo 60 Hz, três perfis, yaw/pitch/roll, aceleração, turbo, energia, decolagem e pouso simplificados, limites de área e altitude.
- Alvos dentro de cone e alcance, projéteis com teste de segmento, dois inimigos e chefe com três níveis de agressividade, limite de 96 projéteis.
- Demonstração Three.js offline em tools/flight-studio.html com teclado, toque e controle analógico, câmera de perseguição, HUD e pausa. Modelos procedurais são placeholders.
- Testes Node de determinismo, energia e geometria. CI e validação visual/dispositivo real pendentes.
- Não é simulação aerodinâmica, não inclui mísseis teleguiados, terreno irregular, save, GLB animado, campanha ou integração automática ao gerador padrão. O lock indica alvo; tiro permanece frontal.
