# RPG 2D — configuração de enigma por fase

O motor RPG 2D ativa o enigma de chave, alavanca e portão quando o GDD menciona "puzzle", "puzzles" ou "enigma". A configuração abaixo é para o objeto `GAME_SPEC` gerado e pode ser aplicada no código editável:

```json
{
  "stageConfig": [
    {
      "puzzle": {
        "key": {"x": 300, "y": 850},
        "lever": {"x": 1730, "y": 800},
        "gate": {"x": 1940, "y": 800}
      }
    }
  ]
}
```

Sem coordenadas, o motor escolhe entre três disposições por índice de fase. Coordenadas fora do mundo usam valores seguros; portões muito próximos da origem ou portal voltam à posição padrão. O obstáculo do portão é removido após a coleta da chave e ativação da alavanca. O inventário mostra os estados e a telemetria expõe `puzzleKey`, `puzzleLever`, `puzzleSolved`.

Limitações: há apenas um conjunto de chave/alavanca/portão por fase; não existe ainda editor visual de posições, nem geração automática de coordenadas a partir de linguagem livre do GDD. O jogador ativa itens por proximidade. As posições personalizadas não passaram por validação completa de navegabilidade e colisões.
