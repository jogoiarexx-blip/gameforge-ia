# GF-STUDY-06 — segunda rodada de referências luispauloalves500

23/11/2026. Extensão compatível do catálogo GF-STUDY-05 (schema v5). Seis novas referências de quatro projetos; 28 arquivos, 12 repositórios, 23 lições e 40 consultas no catálogo ampliado. Leitura estática, sem importar código/assets e sem alegar fine-tuning ou mecânicas prontas.

## Slots versionados e validação de equipamento
- Fonte: https://github.com/luispauloalves500/sucata-zero/blob/main/src/persistence/save.ts
- Blob: `dd543cc86e0239d56f3716f2eb5646f5ef92dff9`
- Evidência: Valida esquema, IDs de instâncias, compatibilidade de slots, quests e limites antes da restauração; separa backend de armazenamento.
- Aplicação: Definir schema versionado, validar referências cruzadas e manter snapshot anterior quando a gravação falhar; checksum detecta corrupção acidental, não autentica.
- Validação: Cobrir migração, slot errado, ID duplicado, checksum divergente, falha de gravação e restauração.

## Eventos de missão e recompensas idempotentes
- Fonte: https://github.com/luispauloalves500/sucata-zero/blob/main/src/progression/quests.ts
- Blob: `b1e41cf41217d22f340fde8d3d5eba2237f27fbe`
- Evidência: Objetivos tipados avançam estágios; interações únicas são registradas e a recompensa recebe ID persistente.
- Aplicação: Persistir progresso, IDs de interação e concessões no mesmo snapshot; validar pré-requisitos e ignorar eventos repetidos.
- Validação: Repetir evento após reload; confirmar que XP, materiais e desbloqueios não duplicam; simular interrupção de gravação.

## Adaptador Rapier com consultas ao cenário
- Fonte: https://github.com/luispauloalves500/sucata-zero/blob/main/src/engine/physics.ts
- Blob: `effba38fa5fbb1b4d4e5883e749d8a8125c753da`
- Evidência: Inicializa mundo WASM com passo fixo, cria colisores estáticos e cinemáticos e filtra consultas de raio e esfera.
- Aplicação: Planejar adaptador opcional com lifecycle e fallback; separar grupos de colisão e simular em passo fixo; medir WASM e compatibilidade no export.
- Validação: Testar rampas, plataformas móveis, câmera sphere cast, perda de inicialização e export offline.

## Fronteiras de atos e restauração coerente
- Fonte: https://github.com/luispauloalves500/crise-no-vale/blob/main/js/campaign-rules.mjs
- Blob: `5d81763d60fb5169b1d8cf95eac8866ae0bac787`
- Evidência: Regras puras condicionam transições e finais a flags; normalização usa a área para remover estados incompatíveis de atos futuros.
- Aplicação: Modelar grafo de áreas e pré-requisitos explícitos; usar posição e histórico para validar saves sem conceder progresso não comprovado.
- Validação: Testar salto de ato, flags futuras, derrota de chefe, escolha de final, retorno e migração legítima.

## Camadas aditivas sem rotação acumulada
- Fonte: https://github.com/luispauloalves500/limiar-ecos-da-quarentena/blob/main/tests/pose-restore.test.ts
- Blob: `2e96c4c79310f1d21e8f28602910192d707d5e79`
- Evidência: Teste com AnimationMixer mostra que um canal constante pode deixar de ser regravado, permitindo acúmulo de ajuste aditivo.
- Aplicação: Restaurar pose base antes do mixer, capturar resultado e só então aplicar camadas procedurais; resetar em troca de rig/clipe.
- Validação: Rodar clipe constante por vários frames; comparar ângulo com ajuste esperado; testar troca de clipes e ausência de osso.

## Câmera veicular com oclusão e FOV dependente da velocidade
- Fonte: https://github.com/luispauloalves500/Driver-2/blob/main/js/render/driver-camera-rig.js
- Blob: `f102fc5687fb6d3ce2152e82619cd98f3d5e8d34`
- Evidência: Calcula alvos por modo, aproxima a posição quando obstáculos bloqueiam a linha e usa amortecimento temporal.
- Aplicação: Separar alvo e filtro de câmera; usar consulta robusta de colisão, encurtamento rápido e retorno suave; manter modos selecionados.
- Validação: Testar marcha ré, mudança de modo, edifício próximo, velocidade e diferentes taxas de quadros.

## Prioridade de implementação após GF-TRAIN-21

1. Save intermediário com eventos, NPCs e recompensas em snapshot coerente; regressões de replay e reload.
2. Camada de animação sem acúmulo e câmera com colisão; testes em Chromium.
3. Adaptador físico Rapier opcional, sem alterar o export padrão antes de validar tamanho, offline e mobile.

O estudo de visibilidade de Madrugacraft já consta no GF-STUDY-05; não duplicado. Asas do Eclipse também já consta no catálogo. Nenhuma alteração nos runtimes ou nos repositórios de origem. Gate: npm test e workflows existentes antes do merge.
