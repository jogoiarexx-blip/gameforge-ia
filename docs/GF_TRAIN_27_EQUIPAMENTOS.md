# GF-TRAIN-27 — Equipamentos modulares
24/11/2026. Referências conceituais: Sucata Zero (save e referências de inventário/equipamento), Limiar (esqueleto e acessórios).

- Catálogo validado, cinco raridades, pilhas limitadas, IDs de instância, slots arma/armadura/acessório, atributos derivados, upgrades com custo atômico de materiais.
- Save JSON versionado por projeto e catálogo; rejeita referências inexistentes, duplicadas ou incompatíveis. Sem autenticação contra edição intencional de save local.
- Sockets de acessórios rígidos para Three.js: nome de osso exato e único; transformação local validada; troca não altera pose do esqueleto. Modelos skinned de vestuário não são retargetados automaticamente.
- Demonstração independente em tools/equipment-studio.html, responsiva e com localStorage. Testes Node e Three.js real em tests/equipment.test.js.
- API reutilizável: gameForgeEquipmentFactory().create(catalog,{projectId,capacity,catalogVersion}); add, equip, upgrade, discard, snapshot, attributes, serialize/load. sockets(model).attach(slot,boneName,object,transform).
- Ainda não conectado ao combate dos exports padrão, ao gerador de loot ou ao editor visual de GLBs. Não promete armadura skinned nem rig automático. CI pendente.
