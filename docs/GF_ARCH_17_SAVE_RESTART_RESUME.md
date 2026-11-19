# GF-ARCH-17 — QA de salvar, reiniciar e continuar

## Entrega

O GameForge Studio agora dispõe de um teste de salvamento mais profundo **para jogos de simulação 2D com persistência ativada**. O Studio cria um iframe descartável com `sandbox="allow-scripts"` (sem `allow-same-origin`), substitui o armazenamento local **apenas dentro do clone** por um armazenamento virtual restrito a chaves de simulação GameForge e inicia o jogo. Tenta realizar uma ação real de produção, salva, obtém um registro armazenado, **remove inteiramente o primeiro iframe**, cria um segundo iframe isolado com o registro e clica em **Continuar**. O resultado só recebe `PASS` quando o estado foi alterado, a segunda instância aceitou a retomada e os campos persistentes bateram com o registro salvo.

O jogo principal, o estado real do usuário, o armazenamento local do Studio e seus modelos GLB **não recebem comandos de teste**. No clone, não há `eval`, acesso a serviços externos ou permissão de mesma origem do Studio.

## Modificações

- `js/save-resume-qa.js`: plano com impressão digital de arquivos/requisitos; armazenamento virtual em iframe de origem opaca, no máximo quatro chaves `gameforge-simulation-v1-*`, 30 mil caracteres por valor; execução e destruição de dois clones; diagnósticos `PASS`, `FAIL`, `INCONCLUSIVE` e `UNSUPPORTED`; anexação de observações apenas parciais aos requisitos declarados.
- `js/qa-bridge.js`: permite clicar somente em controles explicitamente cadastrados (`simulation-action-start`, `simulation-save`, `simulation-continue`) e fornece `qa-storage` **somente** quando o injetor de armazenamento virtual GF17 está presente. Não permite acesso genérico ao localStorage, HTML arbitrário ou seletores fornecidos no pedido.
- `js/simulation-runtime.js`: adiciona IDs estáveis às ações de simulação; não modifica os cálculos econômicos nem a lógica de persistência.
- `js/app.js` e `index.html`: novo botão **Testar salvar → reiniciar → continuar** no laboratório de QA, com resultado visível e associação à matriz de requisitos.
- `RESULTADOS_RESTAURACAO_GF17.json` e `RELATORIO_RESTAURACAO_GF17.md`: relatórios portáteis em ZIP/backup; invalidação automática quando código, assets, instrução ou configuração mudam.
- `tests/gf17-save-resume.test.js` e `tests/browser-gf17-save-resume.py`: testes Node com mock de duas instâncias, proteção de storage e ausência de aprovações fictícias; no Chromium, novo teste do Studio e verificação de persistência real em *fixture* de fazenda, em contexto de testes separado.

## O que a GF17 comprova e o que NÃO comprova

O `PASS` do Studio é uma **observação parcial concreta**: a simulação gravou um registro, ele sobreviveu à **recriação do jogo em um segundo iframe** e foi restaurado. Como o armazenamento é em memória para preservar a privacidade, o teste não atesta que o navegador/dispositivo real guardará os dados entre sessões. Para isso, a CI do Chromium realiza um controle independente com o localStorage real de uma fixture de fazenda em uma origem de testes.

Salvamento de RPG 3D, missões completas, durabilidade de todos os jogos, desempenho e reinício após fechar o navegador físico **não estão cobertos** pelo botão GF17. Jogos sem contrato de salvamento de simulação ativado não recebem teste fictício. Não foi criado executor autônomo de agentes de IA nesta etapa.

O estado de missão/chefe da GF16 continua representando apenas observação de eventos e dados dos motores, não conclusão funcional de campanhas. Evidência positiva da GF17 permanece `OBSERVED_PARTIAL` na matriz GF14, nunca `VERIFIED`.

## Aceite

1. `npm test`, `npm run verify:exports` e `npm run bench:arena` aprovados.
2. Chromium: dois clones, storage virtual, estado modificado, persistência entre clones, resumo, matriz e ZIP; ao alterar o pedido, relatórios anteriores não podem ser exportados.
3. Chromium: fixture independente de simulação salva em localStorage real, recarrega e retoma a partida.
4. Matriz de exportações, GLB, GF13–GF16 e continuidade de projetos permanecem aprovadas.

## Próxima prioridade

GF-ARCH-18: contratos tipados de persistência para os demais motores (RPG 3D e urbano), cenários de missão completos com telemetria de objetivos/conclusão e orçamento de execução por gênero. Não habilitar ferramentas de agentes externos sem isolamento específico.
