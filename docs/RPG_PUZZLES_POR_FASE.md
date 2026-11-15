# RPG 2D — configuração de enigma por fase

O motor RPG 2D ativa o enigma de chave, alavanca e portão quando o GDD menciona "puzzle", "puzzles" ou "enigma". A configuração abaixo é para o objeto `GAME_SPEC` gerado e pode ser aplicada no código editável:

```json
{
  "stageConfig": [
    {
      "puzzle": {
        "key": {"x": 300, "y": 850},
        "lever": {"x": 1730, "y": 800},
        "gate": {"x": 1940, "y": 800},
        "rewardCoins": 75
      }
    }
  ]
}
```

Sem coordenadas, o motor escolhe entre três disposições por índice de fase. Coordenadas fora do mundo usam valores seguros; portões muito próximos da origem ou portal voltam à posição padrão. O obstáculo do portão é removido após a coleta da chave e ativação da alavanca. O inventário mostra os estados e a telemetria expõe `puzzleKey`, `puzzleLever`, `puzzleSolved`.

Limitações: há apenas um conjunto de chave/alavanca/portão por fase; não existe ainda editor visual de posições, nem geração automática de coordenadas a partir de linguagem livre do GDD. O jogador ativa itens por proximidade. As posições personalizadas não passaram por validação completa de navegabilidade e colisões.

## Recompensa de conclusão
Ao abrir o portão, o jogador recebe ouro (45 por padrão, ou `rewardCoins` entre 0 e 250) e 20 XP. A recompensa é aplicada uma única vez por fase, e o estado é exposto como `puzzleRewarded` na telemetria. O sistema usa as moedas existentes do RPG e não cria uma segunda economia.

## Baús de tesouro por fase
O RPG 2D agora coloca três baús por padrão, coletados por proximidade, independentemente de haver puzzle. Configure até oito por fase em `stageConfig[n].chests`:
```json
{"chests":[{"x":475,"y":800,"coins":25},{"x":1190,"y":800,"coins":50}]}
```
Cada baú dá 10 XP e a quantidade configurada de ouro (0–250). Baús são reiniciados ao reiniciar a fase; não são persistidos entre tentativas. Telemetria: `chestsOpened` e `chestsTotal`. Ainda não há editor visual ou garantia de navegabilidade para coordenadas personalizadas.
