# GF-008 — Missões encadeadas e gatilhos espaciais 3D

Data: 16 de novembro de 2026

## Entrega executável

Apenas **arena, FPS e RPG 3D**. O compilador StageSpec reconhece comandos escritos por leigos, transformando-os em JSON controlado, e o runtime 3D interpreta esse JSON sem `eval`.

### Exemplo de GDD

```md
## Fase 1 — Fortaleza
Etapas: ir ao norte -> eliminar inimigos -> coletar cristais
Ao entrar na área norte surgem 3 reforços
Quando chegar ao centro, cura 25
```

- A HUD mostra a etapa ativa e o progresso; o portal não é ativado até completar a **ordem declarada**.
- Uma etapa `reach` exige entrar fisicamente numa zona. `eliminate` exige zerar inimigos e não ter reforços temporizados pendentes. `collect` exige coletar os 3 cristais existentes. `survive` conta segundos **a partir da ativação da etapa**, não desde o início da fase.
- O cenário contém marcadores 3D nas zonas requeridas. As zonas são `north`, `south`, `east`, `west`, `center`; as coordenadas são relativas ao tamanho da arena. Zonas de entrada têm raio de 2,5 unidades do mundo.
- Um `zoneEvent` de reforços ou cura só dispara ao **entrar fisicamente** na zona. Cada ID dispara uma vez por tentativa; versões iguais do comando não permitem repetir o prêmio.
- A tela de prévia, exportação ZIP e `FASES_EXECUTAVEIS.json` carregam o mesmo GameSpec com etapas e zonas. As linhas do GDD/comando ficam documentadas no StageSpec.
- Fases que não solicitam sequência **preservam a regra de missão anterior** e seus tempos/objetivos.
- O GF-007 continua salvando apenas checkpoints **entre fases concluídas**. Ao retomar o jogo, a missão recomeça na entrada da fase salvada, com etapas e zonas reiniciadas de forma deliberada.

### Contratos e limites importantes

- Cada fase aceita uma sequência explícita de 2 a 5 etapas. Comandos do tipo `Etapas: ir ao norte -> eliminar inimigos -> coletar cristais` e `Fase 2: Etapas: ir ao oeste -> sobreviver 10 segundos` são reconhecidos.
- Verbos de deslocamento são limitados a 5 zonas cardeais/central; descrições como `entrar na casa do prefeito` **não** criam automaticamente uma casa nem sua interação.
- Coleta reconhece **3 cristais**, que é o número colocado pelo motor; exigir 5 não é anunciado falsamente como concluído: a sequência é marcada `pendente`.
- Eventos espaciais aceitos: reforços (2–8) e cura (10–45) nas cinco zonas; máximo 4 por fase. Outros tipos de eventos, diálogos, cinemáticas, NPCs conversáveis e missões ramificadas permanecem fora do escopo.
- Zonas de reforço opcionais não são obrigatórias para a vitória, a menos que a sequência de objetivos leve o jogador até elas. Não converter prosa ampla em código arbitrário.
- Mapas de outros gêneros e campanhas urbanas não recebem esses contratos. Não há teste com dispositivo móvel físico nesta entrega.

## Auditoria automatizada

Os testes GF-008 foram adicionados a `tests/stage-events-checkpoints.test.js` para validar compilador, precedência e negativa de comandos, regras puras, pontos visíveis, progressão real no runtime, gatilhos idempotentes e sobrevivência com temporizador por etapa. A integração no GitHub depende dos testes Node, de exportação e Chromium aprovados.
