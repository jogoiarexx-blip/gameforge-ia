# GF-TRAIN-08 — Checkpoint intermediário com objetivos cumpridos

## Objetivo

O GameForge agora tem checkpoint **durante as fases** dos jogos RPG e plataforma 3D, além dos checkpoints entre fases do GF-TRAIN-07. A melhoria evita repetir os mesmos inimigos/cristais só para recuperar seu progresso. O estado é restaurado mesmo após fechar e reabrir o jogo exportado offline.

É **evolução do código do motor e testes**, não fine-tuning dos pesos de um modelo de IA.

## Marcos reais que geram salvamento

- **RPG 3D:** cada inimigo morto por projétil do motor e cada cristal coletado. O checkpoint guarda os IDs dos inimigos abatidos e dos cristais coletados, vida, munição, pontuação e atributos do RPG (nível, XP, poções).
- **Plataforma 3D:** cada cristal coletado e cada nova plataforma de pouso seguro. Guarda IDs dos cristais, última ilha alcançada, vida, munição e pontuação.
- **Próxima fase:** após vencer e concluir a animação, substitui o checkpoint parcial por um checkpoint limpo da nova fase. A nova fase tem os seus próprios inimigos e cristais.
- **Derrota ou recarga:** restaura somente o último checkpoint válido: inimigos já derrotados continuam removidos, cristais já coletados ficam invisíveis, e prêmios/XP não são pagos outra vez. Plataforma retoma sobre a última ilha marcada.
- **Novo jogo ou vitória final:** remove a chave principal, backup e escrita pendente.

O checkpoint parcial não registra inimigos apenas feridos, projéteis, tempo de missão de sobrevivência, posição exata do RPG, física de um salto em andamento ou todos os itens de um RPG comercial. A gravação acontece ao concluir **um marco verificável**, não a cada tecla ou quadro; mudanças posteriores sem novo marco não são prometidas como persistentes. Checkpoints do GF-TRAIN-07 (somente a próxima fase e atributos) permanecem legíveis na mesma chave, sem migração destrutiva.

## Validação e limites de segurança

O contrato em `js/adventure-campaign-save.js` exige uma fase válida, identidade da campanha, atributos consistentes, IDs de cristais/inimigos **ordenados, sem repetição e em limites definidos**, e checkpoint de plataforma com índice limitado. Sem um marco intermediário, a fase 1 não cria um save vazio.

A restauração em `js/three-runtime.js` verifica os IDs existentes na cena antes de remover objetos. O mecanismo anterior de escrita temporária/backup (`js/urban-save.js`) continua responsável por falha do armazenamento e recuperação de arquivos corrompidos.

Isso não constitui proteção antifraude criptográfica contra alguém que edite seu próprio navegador ou score offline; rankings competitivos exigiriam um servidor confiável.

## Testes

- `tests/adventure-campaign-save.test.js`: formato novo e v7, ID duplicado/malformado, limitação por gênero, backup e save de fase 1.
- `tests/adventure-campaign-runtime.test.js`: cristal por colisão, morte real de inimigo por projétil e XP, pouso físico numa plataforma, recarga/derrota/nova partida, pontuação sem duplicações, progresso da fase 2, compatibilidade com os casos anteriores. A sonda que posiciona objetos ou acelera objetivos existe **somente na VM de testes**, nunca dentro do ZIP exportado.
- `tests/browser-midstage-checkpoints-v8.py`: reimporta os **ZIPs reais** de RPG e plataforma, constrói um estado parcial válido **com o próprio contrato do game.js**, recarrega a página, verifica remoção dos objetivos já cumpridos, atributos, ausência de pagamento repetido e limpeza por Reiniciar. A gravação do checkpoint por jogo de verdade é validada separadamente pela suíte de VM, não reivindicada no Chromium.
- CI preserva as exportações e testes GF-002, GF-TRAIN-04 a 07 e GF-005.

## Executar

```bash
npm test
npm run verify:exports
node tools/build-browser-fixtures.cjs
python tests/browser-midstage-checkpoints-v8.py
```

Somente declarar aprovada quando **Node e Chromium estiverem verdes no mesmo commit**. O PR é dependente dos PRs de treinamento anteriores; não publica automaticamente o Studio no GitHub Pages.
