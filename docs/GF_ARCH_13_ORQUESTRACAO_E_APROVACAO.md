# GF-ARCH-13 — Orquestração guiada e aprovação de mudanças

Base: GF-ARCH-12 (branch de origem), 19/11/2026. Evolução incremental e compatível com GameForge Studio.

## Objetivo

Transformar pedidos em linguagem natural em um plano de responsabilidades técnicas, selecionar candidatos a arquivo usando heurísticas e o grafo GF-ARCH-12 e **não substituir os arquivos do jogo sem uma aprovação explícita**.

## O que realmente funciona

1. **Roteamento local**: analisa pedidos em português e separa arquitetura, gameplay, gráficos e QA. Cada especialidade informa arquivos sugeridos, razão, tarefas e status `PLANNED` ou `NOT_NEEDED`. Todos começam `execution: NOT_RUN`. Nenhum agente LLM autônomo é executado por este módulo.
2. **Respeito a restrições explícitas**: cláusulas como `não altere style.css` protegem o caminho mencionado; também mantemos o texto de outras restrições no relatório, mas só as proteções por caminho são verificadas automaticamente.
3. **Preparar proposta**: o botão existente gera mudanças via motor local ou backend IA já existente, porém **não modifica** o projeto. A proposta contém arquivos alterados e uma prévia limitada dos trechos substituídos; não é um diff completo.
4. **Aprovar e testar**: o código só é aplicado após clicar `Aprovar e testar`. O sistema confere os detectores de conflito do arquivo-base e a integridade da proposta. Depois utiliza a prévia e QA já existentes, com histórico reversível e rollback em caso de aumento de alertas.
5. **Descartar proposta**: remove o candidato sem alterar o jogo.
6. **Documentação**: novos jogos gerados offline recebem `PLANO_AGENTES_STUDIO.md`; `RELATORIO_EVOLUCAO.md` inclui a trilha de planejamento especializada.

## Segurança e limites

- A lista de escrita na aplicação é intencionalmente conservadora: `game.js`, `style.css` e relatórios conhecidos. Outros arquivos e exclusões são bloqueados. Não execute código enviado por agentes como se fosse plugin confiável.
- Os detectores de conflito usam hash FNV e comprimento: verificam mudanças acidentais, não são prova criptográfica contra adversários. Não autorizam mudanças em repositórios remotos ou publicação.
- Restrições funcionais sem arquivo explícito, como `não mexer no WhatsApp`, ficam documentadas e exigem **inspeção/QA humano**: o planejador não consegue provar automaticamente que um fluxo foi preservado.
- A prévia de código exibe trechos limitados; revisar o jogo completo pode exigir outras ferramentas.
- Os gates de QA não são marcados como aprovados sem testes reais. Teste humano fica pendente.
- Esta etapa não implementa múltiplos agentes de IA reais, servidor de patches, marketplace de plugins ou AST preciso. É uma base local de coordenação, sem acesso externo adicional.

## Como usar

1. Abra o Studio e gere/importe seu jogo.
2. Digite um pedido, como `Melhore o combate sem alterar style.css`.
3. Clique `Planejar alteração`: veja especialistas, arquivos sugeridos e restrições.
4. Clique `Preparar proposta`. Veja lista de arquivos e trechos em `Ver trechos que serão alterados`.
5. Clique `Aprovar e testar` ou `Descartar proposta`.
6. Depois da aprovação, confirme na prévia e revise o funcionamento real.

## Testes

- `npm test` inclui casos de rota gameplay/gráficos, impacto reverso, proteção por nome, aprovação obrigatória, mudança concorrente, conteúdo adulterado, exclusão bloqueada, relatórios e integração.
- CI existente: `node --check js/*.js`, `npm run verify:exports`, navegador Chromium e testes de projetos/exportação.
- Ainda é necessário validar a usabilidade manual do botão de aceitar/descarte; a execução automática no Chromium testa o fluxo existente e pode demandar cobertura específica deste novo painel.

## Próximo passo GF-ARCH-14

Criar uma interface de comparação de patches com diff completo e indicadores de teste por requisito, executar especialistas reais em processo isolado e com permissões aprovadas, e medir a qualidade de sugestões em jogos de gêneros diferentes.
