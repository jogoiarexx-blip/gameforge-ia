# GF-ARCH-14 — Rastreabilidade e evidências por requisito

Data: 19/11/2026. Base: GF-ARCH-13. Entrega incremental para GameForge Studio, sem motor 2D/3D novo e sem dependências externas.

## O que foi implementado

**1. Mapa lexical de código com proveniência:** o módulo `js/code-provenance.js` examina os arquivos JavaScript fornecidos, ignora comentários e strings na tokenização, identifica funções, classes, bindings e exportações globais `GameForge*` e registra o arquivo e a linha. Relações entre arquivos são marcadas `INFERRED` porque a associação de símbolos não resolve escopos. Ao contrário da GF-ARCH-12, não é apenas um mapa por nome de arquivo: agora existem posições de definição e referência.

**2. Matriz de requisitos:** `js/requirement-evidence.js` separa frases do pedido e itens do GDD, preserva requisitos declarados pendentes no contrato do motor e atribui os estados `UNVERIFIED`, `UNSUPPORTED`, `OBSERVED_PARTIAL` e `ISSUE_DETECTED`.

**3. Ligação com QA real:** após clicar em Testar comportamento, o relatório de QA visual já existente fornece evidências parciais para grupos específicos (movimento, canvas, erros de execução, avanço do loop). A observação de movimento NÃO comprova velocidade, animação, câmera ou todos os controles pedidos. Um problema do QA tem prioridade sobre uma observação positiva do mesmo grupo. A verificação registra um identificador da versão dos arquivos `game.js` e `style.css`; alterações posteriores invalidam a evidência anterior.

**4. Interface:** dentro do laboratório de testes há a opção **Rastreabilidade do código e requisitos**, botão **Atualizar análise e relatórios**, e resumo de requisitos, alertas, pendências e símbolos.

**5. Arquivos portáteis:** o jogo passa a incluir `MAPA_CODIGO_GF14.json`, `MATRIZ_REQUISITOS_GF14.json` e `RELATORIO_REQUISITOS_GF14.md` no backup/exportação.

## Validação

- `npm test`: testes de tokenização, referências ambíguas, origem de símbolos, QA parcial, ausência de aprovação fictícia, pendências e invalidação de evidências por mudança de versão.
- `node --check js/*.js` e `npm run verify:exports`.
- Chromium no GitHub Actions: confirmar interface, geração e exportação de relatórios.
- Teste humano ainda obrigatório para comprovar mecânicas específicas; não foi criado um agente LLM que faça esse julgamento autonomamente.

## Limites técnicos importantes

O índice **não é um AST completo** e não executa código. Não resolve imports dinâmicos, templates com expressões, escopo léxico real, alias de funções nem chamadas dinâmicas; não é substituto de tree-sitter. Marcadores `INFERRED` são hipóteses e não devem ser tratados como fatos.

A matriz atual **não pode declarar requisito totalmente aprovado**. No máximo associa observação parcial e erro ao roteiro genérico de QA. Não foi incorporado um runner de testes por requisito, uma sandbox para agentes não confiáveis, nem integração com sistemas externos. Esses sistemas exigem isolamento, testes instrumentados por requisito e revisão de segurança próprios.

O identificador de revisão é um checksum não criptográfico: serve para detectar alterações acidentais, não para garantir autenticidade de artefatos.

## Próximo avanço sugerido

GF-ARCH-15: runner de verificações tipadas por requisito, com ID do teste, cenário executado e resultado, além de um processo de agentes isolado do navegador, somente com leitura e propostas de arquivos previamente autorizados. Manter aprovação humana obrigatória antes de aplicar alterações.
