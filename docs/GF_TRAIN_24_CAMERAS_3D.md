# GF-TRAIN-24 — Câmeras 3D reutilizáveis
24/11/2026. Referências conceituais: [Driver 2](https://github.com/luispauloalves500/Driver-2/blob/main/js/render/driver-camera-rig.js), [Madrugacraft](https://github.com/luispauloalves500/madrugacraft-3d), [Limiar](https://github.com/luispauloalves500/limiar-ecos-da-quarentena).

- Arena/RPG: câmera elevada original e modo sobre o ombro (C ou botão); zoom em três níveis (Z ou botão) ou roda do mouse.
- Corrida: perseguição próxima/distante, FOV e distância variáveis com velocidade.
- Câmera genérica: segmento contra AABB expandida, retração imediata e retorno exponencial, nova validação após interpolar. Usa alturas de colisores conhecidos e bounds de GLBs posicionados. Não altera as dimensões XZ dos colisores de gameplay.
- Urbano: suavização temporal e retração imediata usando a proteção existente.
- FPS mantém primeira pessoa; plataforma conserva enquadramento. Não há controle dedicado de câmera por gamepad nesta revisão.
- Testes de geometria, independência de frequência e troca de modo em runtime. CI e revisão visual pendentes. AABB é aproximação; sem garantia de colisão exata com toda malha visual.
