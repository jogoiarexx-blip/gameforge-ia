# GF-TRAIN-01 — treinamento verificável de comandos em português

## O que foi treinado

O GameForge **não hospeda um modelo de IA que possa ser retreinado neste repositório estático**. O treinamento desta etapa é um conjunto supervisionado de **144 pedidos rotulados**, com um interpretador determinístico aprimorado e testes de regressão. Cada caso descreve um jogo com gênero e dimensão esperados; sete pedidos também verificam quantidade de fases. O texto que a pessoa escreveu permanece íntegro no projeto.

- Corpus: `training/briefs-ptbr-v1.json`
- Interpretador: `js/intent-compiler.js` e `js/parser.js`
- Avaliação: `tests/brief-training.test.js`
- Execução: `npm test` (inclui a avaliação) e `node --test tests/brief-training.test.js`
- Escopo: 10 gêneros, 2D/3D quando há motor, linguagem informal, abreviações, erros ortográficos pontuais e distinção entre GDD, proibição e intenção.

## Regras de segurança e limites

1. Corrigir somente padrões pequenos e explícitos: `qro` → `quero`, `navina`/`navezinha` → `navinha`, `platafoma` → `plataforma`, `corrda` → `corrida`, `primera pessoa` → `primeira pessoa`, `3 d` → `3d`, etc. Não usar correção genérica que troque nomes de personagens, títulos ou termos desconhecidos.
2. Nenhuma entrada é executada como código. Sem geração de motores novos apenas por encontrar palavras.
3. Respeitar restrições (`sem armas`, `sem 3D`) e manter incompatibilidades/pedidos não implementados explicitamente visíveis.
4. O benchmark mede **classificação e extração de algumas contagens**. Ele não prova que uma campanha inteira ou qualquer novo sistema foi implementado, que a IA aprende sozinha ou que gráficos/controles funcionam em hardware real.
5. A CI deste PR deve aprovar Node, verificação de exportações e Chromium; não publicar no Pages antes de integrar a alteração verificada.

## Próximas rodadas

- Ampliar a avaliação com 100 pedidos reais anonimizados (com permissão), separando treino e validação para não decorar o próprio teste.
- Etiquetar objetivos, quantidades por fase, proibições, escolhas e recursos não suportados, medindo **precisão**, **recall** e taxa de promessas falsas.
- Para alterar código com base em novas frases, adicionar exemplo rotulado, um teste que falha antes da correção, implementar a regra com escopo limitado e executar a matriz completa.
- Para IA verdadeira via modelo externo, será preciso um backend seguro, conjunto de dados revisado, métricas independentes, custos/privacidade e aprovação de cada mudança; a implantação atual em GitHub Pages não oferece isso.

**Critério de sucesso deste pacote:** os 144 casos do corpus batem com os rótulos, os testes de proibição e pendência passam e a regressão dos motores existentes continua verde no mesmo SHA.
