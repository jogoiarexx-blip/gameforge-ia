# GF-VOXEL-15 — Núcleo de água, luz e streaming regional
Base GF-VOXEL-14 (#71). Primitivas independentes; runtime/exportador e saves legados ainda não integrados.
- Água: fontes explícitas, queda vertical prioritária, até 7 níveis laterais sobre piso, flag falling para cachoeiras, recomputação após remoção da fonte. Limites e flag truncated; não conserva volume nem simula pressão. Ainda não há malha animada.
- Luz: BFS em seis vizinhos com níveis 1–15 e bloqueio por opacidade; pode contornar paredes. AO por três vizinhos para o futuro mesher. Sem shader ou luz solar.
- Regiões 128×128, altura 160, coordenadas negativas e distantes, geração sob demanda via callback determinístico base; sem lista global de chunks. Limite numérico |x,z| < 2^40. Hash de 32 bits existente pode repetir a grandes distâncias; mundo jogável continua finito.
- Cache LRU padrão de 16 regiões de edições; carregamento individual, gravação antes de evicção, operações serializadas; falha conserva região suja. IndexedDB isolado por mundo/região, sem migração ou concorrência multiaba. Apenas blocos, não árvores, inventários, atores ou fontes.
- Verificações JS isoladas passaram. Quatro testes Node adicionados; CI e IndexedDB real/browser ainda não validados.
## Integração necessária
Ligar ao gerador/worker e runtime, carregar vizinhança antes de permitir movimento, invalidar malhas adjacentes, aplicar AO por vértice e níveis de água; persistir fontes e reconstruir fluxo derivado. Migrar saves e testar travessia, reabertura e falha de armazenamento antes de habilitar por padrão.
