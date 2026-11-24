# GF-VOXEL-13 — Mundo de exploração e checkpoints regionais

## Implementado
- Mapa **finito** de 4096 × 4096 × 160, 65.536 chunks possíveis. Terreno e malha em worker, consultas por seed e cache LRU de até 96 arrays densos. Limite de coordenadas [-2048,2048). A floresta inicial usa uma grade mais espaçada no tamanho 4096, mantendo o limite atual de registros; não é povoamento infinito.
- Checkpoints opcionais IndexedDB em regiões de 128 × 128; ativado automaticamente no mapa 4096. Manifesto e regiões gravados na mesma transação, revisão monotônica, fila de escrita coalescida e remoção de regiões obsoletas. Cópia de emergência em localStorage; restaura o checkpoint válido mais recente. A opção tem chave de save própria. O estado completo ainda é reconstituído na memória; não é streaming regional independente nem armazenamento ilimitado. Limites existentes de 16384 edições e 4096 árvores permanecem.
- Natação opcional: movimento reduzido na água, velocidade vertical limitada, Espaço para subir. Água não se propaga, não tem correntezas ou cachoeiras físicas.
- Cache de resultados de vilas limitado a 512 entradas.

## Validação
Checagem isolada confirmou 65.536 chunks possíveis, um chunk denso materializado após snapshot, edições distantes nas regiões -15,14 e 14,-14 restauradas corretamente e snapshot worker idêntico ao local. Testes Node adicionados para integridade regional e mapa; Chromium exercita recuperação do IndexedDB após apagar localStorage em outra aba. CI completa pendente.

## Limites
Mundo infinito real, biomas adicionais, novos tipos de árvore, lagos/cachoeiras, propagação de água e luz e certificação de FPS em aparelho físico ainda não implementados. O IndexedDB depende de disponibilidade do navegador; prévia isolada pode não disponibilizar armazenamento. Não há sincronização multiplayer nem resolução de edições concorrentes em múltiplas abas. Dependência PR #69, que depende da #68.
