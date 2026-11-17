# GF-TRAIN-07 — RPG e Plataforma 3D: checkpoints entre fases

## Objetivo

Continuar o trabalho de treinamento do GameForge com **comportamento jogável**, não apenas exemplos de frases. Expandimos o sistema de checkpoint implementado para a nave 3D no GF-TRAIN-06 para os motores **RPG 3D e Plataforma 3D**. O código permanece independente de rede e funciona no HTML exportado do GameForge.

Não há retreino dos pesos de um modelo de linguagem; os avanços são no código do gerador, motores de jogo e testes.

## O que realmente é salvo

| Campo | RPG 3D | Plataforma 3D |
|---|---|---|
| Próxima fase desbloqueada | Sim | Sim |
| Vida | Sim | Sim |
| Pontuação e munição | Sim | Sim |
| Nível da magia, XP, poções | Sim | Não se aplica |
| Cristais coletados na fase anterior | Não; cada fase tem novos objetivos | Não; cada fase tem novos objetivos |
| Posição exata do jogador dentro da fase | Não | Não |
| Estado dos inimigos, projéteis ou chefes em andamento | Não | Não |

**Checkpoint só é gravado depois da conclusão real da etapa**, durante a transição para a fase seguinte. Um personagem que fecha a página no meio de uma luta retorna ao *início da última fase desbloqueada*, evitando duplicação de recompensas pela repetição de eventos. O jogo continua na fase em que parou, com seus atributos persistentes; não retoma exatamente o mesmo segundo.

O botão **Jogar/Continuar** tenta ler a última fase válida. **Reiniciar** remove o save atual, backup e temporário e começa de novo na fase 1. Após terminar a campanha, o checkpoint é eliminado para a próxima partida começar do zero. O menu mostra "Continuar · Fase N" se houver checkpoint.

RPG: a capacidade de magia já é governada por `rpgLevel`, com XP e poções. **Não foi inventado um inventário ou árvore de habilidades que ainda não exista no motor**. Plataforma: coleta dos cristais continua sendo validada por colisão e a progressão exige abrir o portal.

## Validação e integridade

`js/adventure-campaign-save.js` cria uma chave por gênero, título e impressão digital das fases, configuração, mundo, recursos e dificuldade. A restauração valida versão, identidade, fase desbloqueada, vida, pontos, munição e, para RPG, nível, XP e poções. Um JSON malformado ou incompatível é rejeitado; o mecanismo `js/urban-save.js` preserva backup e tentativa de escrita atômica. Falha de armazenamento não impede o jogo funcionar.

**Limite de segurança:** a verificação de integridade local não oferece resistência criptográfica contra alguém que manipule manualmente o próprio navegador; não é apropriada para placares competitivos sem um backend validado.

## Testes adicionados

- `tests/adventure-campaign-save.test.js`: estado persistido, mistura de gêneros, alterações de GDD, corrupção, backups, storage bloqueado e inclusão de dependências no ZIP offline.
- `tests/adventure-campaign-runtime.test.js`: motor Three real executado em VM, com uma **sonda controlada usada somente nos testes**. O RPG progride via função real de ganho de XP, bebe uma poção, entra no portal após cumprir os objetivos, grava checkpoint, restaura em uma nova instância, passa por 3 fases e vence a campanha. A plataforma coleta cristal por colisão real, impede entrada no portal sem os requisitos, avança para fase 2, restaura e permite zerar. Verifica que arena/FPS/corrida não recebem checkpoints indevidos.
- `tests/browser-adventure-checkpoints-v7.py`: gera **dois jogos completos**, RPG 3D e plataforma 3D com três fases cada, abre os ZIPs reimportados em Chromium e cria checkpoint **válido por meio do validador exportado**. Recarrega o jogo, confere atributos, verifica movimentação, reinício completo e rejeição de salvamento malformado. A criação pela vitória real é exercitada separadamente na VM; não se afirma que esse teste de Chromium jogue as três fases manualmente.

Os novos artefatos de teste são salvos no `tests/_browser_output/adventure-training*.json`, junto com capturas se houver falha.

## Validação exigida

```bash
npm test
npm run verify:exports
node tools/build-browser-fixtures.cjs
python tests/browser-adventure-checkpoints-v7.py
```

A CI também executa as matrizes das versões GF-002, GF-TRAIN-04, 05, 06 e GF-005. **Não publicar ou declarar plenamente validado antes de todos os jobs verdes no mesmo SHA.**

## Cobertura não incluída

RPG e plataforma têm checkpoint de fase, não salvamento instantâneo de uma batalha nem inventário universal. Outras categorias (FPS, arena, corrida, plataforma 2D) continuam com as capacidades existentes. Jogos multiusuário, salvamentos na nuvem, sincronização entre dispositivos e proteção antifraude exigiriam infraestrutura própria. O código de sonda usado nos testes VM não aparece nos jogos exportados.
