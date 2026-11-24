# GF-TRAIN-25 — Fundação de física 3D opcional
24/11/2026. Referência: [Sucata Zero](https://github.com/luispauloalves500/sucata-zero/blob/main/src/engine/physics.ts). Adaptador autoral, sem importar código do jogo.
 
## Escopo
- Rapier compat fixado em 0.21.0 (mesma versão declarada pelo projeto de referência).
- Mundo físico com gravidade, corpos fixos/dinâmicos/cinemáticos, caixas, esferas, cápsulas, rampas por rotação, atrito, restituição, CCD opcional, impulso, raycast e remoção.
- Passo 60 Hz limitado a cinco substeps, API de pose para sincronizar Three.js, descarte e limite de 512 corpos.
- Teste real de Rapier e bundler offline em workflow separado; nenhuma dependência nova nos exports padrão. Não integrado automaticamente aos controladores de personagem, veículos ou save.

## Uso explícito em jogo customizado
Execute npm install e npm run vendor:rapier para gerar vendor/rapier-offline.js e licença; distribua esses arquivos e js/rapier-physics.js junto do jogo. Carregue os dois scripts antes do código do jogo. Exemplo:
 
```js
const physics = await gameForgeRapierFactory().init(GameForgeRapier);
physics.add('floor',{kind:'box',half:{x:20,y:.5,z:20}},{x:0,y:-.5,z:0});
physics.add('crate',{kind:'box',half:{x:.5,y:.5,z:.5}},{x:0,y:3,z:0},{type:'dynamic'});
// No loop: physics.step(dt); const pose = physics.pose('crate');
// Copiar pose.position e pose.rotation ao mesh; liberar physics.dispose() ao trocar mundo.
```
 
Próxima etapa: integrar opt-in ao export e ao controlador cinemático com testes reais de escadas, plataformas e mobile. Veículos, persistência e colisão detalhada de malhas continuam pendentes. O bundle e os testes não foram executados nesta sessão; verificar CI antes do merge.
