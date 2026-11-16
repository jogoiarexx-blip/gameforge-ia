# GF-TRAIN-06 — Campanhas com checkpoints no shooter 3D

## O que foi implementado

O motor de nave 3D agora retoma **campanhas lineares** a partir do início da última fase desbloqueada, mesmo após fechar e reabrir o HTML offline. É uma evolução de código e validação para o GameForge, **não fine-tuning de pesos de IA**.

**Comportamento observável:**

- Fase 1 começa sem save. Ao derrotar o chefe ou concluir a etapa sem chefe, o jogador recebe a pontuação da etapa e só então o jogo persiste **o início da próxima fase** (não um estado parcial de luta).
- Fechar o navegador na fase 2 e voltar continua na fase 2, restaurando vida de transição, pontuação, arma e eliminações.
- Perder a batalha da fase 2 mantém o último checkpoint; clicar em *Tentar novamente* reinicia a fase 2 sem reaplicar o prêmio anterior.
- Clicar em *Reiniciar* limpa save principal, backup e temporário e começa uma campanha nova na fase 1.
- Vencer a última fase conclui a campanha e apaga o checkpoint; uma nova sessão começa pela primeira fase.
- A ausência de `localStorage` não interrompe a partida: apenas torna o salvamento indisponível.
- **Campanhas com caminhos alternativos:** preservam a rotina anterior de seleção de rotas e seu salvamento independente. O novo esquema só se aplica a campanhas lineares.

## Segurança e validade do estado

O validador `js/shooter-campaign-save.js` exige: versão correta, identidade de conteúdo (título/fases/regras), índice desbloqueado entre 1 e penúltima fase, saúde entre 1–100, arma de 1–3, eliminações e pontuação inteiras finitas dentro de limites. Dados corrompidos não liberam uma fase arbitrária. A escrita usa o mecanismo já existente de temporário, leitura de conferência e backup (`js/urban-save.js`).

O hash identifica versões do jogo, não autentica contra uma pessoa alterando intencionalmente o armazenamento local no próprio navegador. Se fossem usados placares online competitivos, o estado teria de ser validado no servidor.

## Testes do treinamento

- `tests/shooter-campaign-save.test.js` valida contratos, limites, versões de GDD, corrupção e backup, falta de storage e inclusão do módulo no pacote offline.
- `tests/shooter-3d.test.js` executa uma campanha controlada com **três chefes derrubados por disparos reais**, verifica transições, save, nova instância do motor, falha/repetição no mesmo checkpoint e limpeza após a vitória final. As ondas de inimigos são encurtadas por uma sonda que existe **somente no VM dos testes**, e não no ZIP.
- `tests/browser-shooter-checkpoint-v6.py` inicializa o ZIP real no Chromium, cria um checkpoint válido **pelas próprias regras exportadas**, recarrega e verifica a continuação na fase 2; depois confere *Reiniciar* e rejeição de save corrompido. A geração do checkpoint aqui é controlada, pois a obtenção dele por vitória real já é testada separadamente no VM.
- `tests/browser-gameplay-training.py`, `tests/browser-gameplay-lifecycle-v5.py`, a matriz GF-002 e os demais testes permanecem na CI.

## Executar

```bash
npm test
npm run verify:exports
node tools/build-browser-fixtures.cjs
python tests/browser-shooter-checkpoint-v6.py
```

A integração permanece como PR de revisão até que todos os jobs Node e Chromium estejam verdes **no mesmo commit**.

## Limitações e próximo avanço

Ainda não há salvamento universal em todos os gêneros; o checkpoint desta rodada cobre apenas a campanha linear de shooter 3D. Também não há reprodução exata de uma batalha interrompida, nem prova de que todos os níveis de todas as campanhas podem ser concluídos por um jogador humano. Etapas futuras podem reutilizar esse contrato no RPG 3D e na plataforma e testar campanhas completas em aparelhos físicos.
