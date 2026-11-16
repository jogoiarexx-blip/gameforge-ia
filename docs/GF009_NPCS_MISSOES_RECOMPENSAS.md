# GF-009 — NPCs de missão, conversa e recompensas no combate 3D

**Escopo verificável:** arena, FPS e RPG 3D exportáveis; no máximo um NPC de missão por fase. Os gêneros 2D, shooter 3D, plataforma, corrida e urban-action não foram alterados.

## Exemplo para leigos (GDD ou comando)

```md
## Fase 1 — Vila
NPC: exploradora Lia no sul
Fala do NPC: "Ajude a proteger nossa vila!"
Missão do NPC: ir ao sul -> sobreviver 5 segundos
Recompensa do NPC: 200 pontos e 20 de vida e 30 balas
```

O jogo coloca o NPC visível no mapa, 1,6 unidade ao lado do ponto sul. **Chegue perto (raio 2,6) e pressione E** ou o botão **Conversar [E]** na tela sensível ao toque. A primeira conversa revela a fala; na segunda interação o jogador aceita a missão. O portal continua bloqueado até cumprir as etapas do NPC. A HUD mostra a tarefa atual; os marcadores de destino 3D ficam visíveis após aceitar. Ao concluir, a recompensa declarada é dada **uma vez por tentativa**.

## Contratos implementados

- `NPC: <nome ou papel> no <norte|sul|leste|oeste|centro>` cria um personagem distinto do jogador e dos inimigos, não hostil, sem adicionar colisões extras ao cenário.
- `Fala do NPC: ...` fornece um único texto de até 160 caracteres; a UI usa `textContent`, sem HTML/JS. Não são implementadas árvores de escolhas, dublagem nem animações labiais.
- `Missão do NPC: etapa 1 -> etapa 2` usa **exatamente** a gramática de etapas suportada pelo GF-008: chegar a uma das cinco zonas, eliminar inimigos, coletar **3 cristais**, sobreviver entre 5 e 180 segundos. Entre 2 e 5 etapas. A sequência inicia **após aceitar**.
- `Recompensa do NPC: 200 pontos e 20 de vida e 30 balas` pode usar 0–500 pontos, 0–45 de vida e 0–80 balas; quantidades não citadas permanecem **zero**, sem prêmio inventado.
- Pontuação tem limite de 1 bilhão, vida de 100 e munição de 999; na loja FPS, a revista continua limitada a 20. Um pagamento duplicado durante a mesma tentativa é impedido pelo estado `completed`.
- O NPC e a missão são serializados em `GAME_SPEC` e documentados em `FASES_EXECUTAVEIS.json`/`PLANO_FASES.md`, mantendo origem de linhas.
- As fases sem `npcQuest` conservam a mecânica GF-008 e os modos normais de conclusão.
- O GF-007 persiste checkpoints **entre fases**: se o jogo for encerrado dentro da fase, o NPC/quest daquela fase reiniciam de maneira deliberada. Ao concluir e atravessar o portal, o checkpoint salva a pontuação recebida.

## Limitações e próximos passos

- Só um NPC com missão por fase, em posições cardeais/central pré-existentes. NPCs não seguem rotinas, não caminham, não têm IA conversacional nem escolhem respostas.
- O NPC usa geometria procedural simples e não substitui o pipeline GLB/animações dos personagens.
- Fala sem missão válida, recompensas acima dos limites e objetivos não implementados permanecem **pendentes**, não resultam em uma falsa promessa de jogo pronto.
- Recompensa de munição com loja FPS respeita o limite da revista; inventário, habilidades, reputação e economia interligada ainda não são contratos deste PR.
- O botão de toque só aparece perto do NPC. É preciso testar desempenho em dispositivos físicos para atribuir um orçamento de FPS.

## Validação

`tests/stage-events-checkpoints.test.js` cobre compilação do GDD e de comando localizado por fase, sanitização de diálogos, rejeição de recompensas exorbitantes, NPC no mundo 3D, botão de toque, aceite em duas interações, conclusão das etapas, pagamento único e regressões de fases sem NPC. A publicação principal só deve ser feita depois da aprovação completa do CI Node + Chromium e da integração ordenada GF-006/007/008/009.
