# GF-011 — NPCs com rotina, missões secundárias e consequências entre fases

**Escopo real:** Arena, FPS e RPG 3D do motor `js/three-runtime.js`. Este incremento continua o GF-010 NPC (PR #6). O usuário consegue expressar missões opcionais e efeitos futuros por linhas simples no GDD ou comando.

## Exemplo de GDD

```md
## Fase 1 — Vila
NPC: Exploradora Lia no sul
Fala do NPC: "Precisamos de ajuda."
Missão secundária do NPC: sim
NPC rotina: manhã sul, tarde centro, noite norte
Opção 1: Defender a vila | ir ao sul -> sobreviver 5 segundos | 100 pontos
Opção 2: Desafiar os guardas | ir ao sul -> sobreviver 5 segundos | 200 pontos
Consequência opção 1: apoio na próxima fase
Consequência opção 2: emboscada na próxima fase

## Fase 2 — Fortaleza
```

## Contratos implementados

- **Rotina diária, não relógio do sistema:** um dia simulado dura **90 segundos de jogo**, distribuídos em manhã (0–30s), tarde (30–60s) e noite (60–90s). Reinicia a cada fase. A instrução define os destinos norte/sul/leste/oeste/centro; o NPC se move em direção ao destino a até **2 unidades/s**, com colisão geométrica pelo motor e animação procedural. A personagem fica parada quando a escolha de missão está aberta, mantendo o clique/tecla próximos. **Não** é planejamento de rotas com A* nem navegação livre entre edifícios.
- **Missão secundária verdadeira:** a linha `Missão secundária do NPC: sim` faz o NPC oferecer uma missão opt-in. A campanha principal continua definida pelas regras da fase ou pelo `missionSteps` GF-008, com **progresso independente**, e o portal não exige falar com NPC. Recompensas são entregues apenas ao cumprir a missão extra depois de aceitá-la. O jogador também pode ignorá-la e terminar a fase.
- **Duas consequências futuras comprováveis:** `apoio na próxima fase` adiciona **até 20 pontos de vida** e, sem loja FPS, **20 balas extras** na entrada da fase seguinte. `emboscada na próxima fase` faz a próxima fase começar com **2 inimigos a mais**, limitados a 26. São efeitos alternativos, atribuídos somente à opção escolhida e missão concluída.
- **Checkpoint:** mantém a estrutura v1 do GF-007. Em checkpoints entre fases, adiciona opcionalmente `campaignEffect` com `sourceStage`, `choiceId` e `kind`. O leitor revalida a escolha a partir do GameSpec da fase anterior, rejeitando tipos inventados, etapa de origem falsa e efeito divergente. Salvamentos v1 antigos sem `campaignEffect` continuam válidos. A fase restaurada recebe os inimigos extras uma vez pela configuração, sem nova adição à vida já salva.
- **Comandos limitados e previsíveis:** consequência inexistente, rotina fora das cinco zonas ou sequência não suportada deixam o NPC da instrução marcada como **pendente**. Textos do GDD nunca são executados como JavaScript. O `PLANO_FASES.md` traz os campos de missão secundária e rotina.
- **Estado visível:** HUD mostra missão principal e extra sem confundi-las, indicador da fase informa apoio/emboscada, e telemetria expõe período do dia, posição do NPC, progresso secundário e consequência ativa para QA.

## Restrições que permanecem

- Uma NPC com quest por fase; sem IA generativa, comércio, diálogos livres, horários de trabalho do mundo real, inventário, reputação global, mudança de relações entre NPCs ou conversas persistentes dentro da fase.
- Se a missão extra não for completada antes de sair pelo portal, **não** há consequência futura. Não são transportadas missões pendentes.
- Suporte de checkpoint persiste somente em jogos de combate 3D com `projectId` válido e **sem economia de armas FPS ativada**, como antes. Os efeitos funcionam dentro da mesma sessão sem checkpoint, mas não prometem persistência quando o backend de salvamento está desativado.
- Se o NPC não conseguir chegar a uma zona por obstáculo sem caminho navegável, ele pode parar: não foi adicionado pathfinding de mapa urbano ou navegação completa. Movimento validado em arenas.
- Consequência de uma decisão afeta apenas a **fase imediatamente seguinte**; não existe ainda armazenamento de histórico multi-capítulo.
- Não houve medições de FPS em dispositivos físicos Android/iOS.

## Validação

Testes de parser de GDD e comandos, compatibilidade de NPCs GF-009/010, regras de horário e movimento, missões secundárias não obrigatórias, dois fluxos de campanha completos (apoio/emboscada) com recarga de checkpoint, reset de campanha e rejeição de alterações maliciosas do save. Testes Node + exportações reais no Chromium via CI.
