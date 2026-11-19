# GF-ARCH-12 — Studio Intelligence

Base: GameForge 0.28.0, checkpoint 3323a837, 19/11/2026.

## Referências e adaptação

- Graphify: https://github.com/Graphify-Labs/graphify — grafos de conhecimento e rastreabilidade de arestas. O GameForge implementa uma análise textual própria, NÃO um parser AST equivalente ao Graphify.
- Claude Code Game Studios: https://github.com/Donchitos/Claude-Code-Game-Studios — brief, iteração, checkpoints e gates de QA. O GameForge implementa brief e gates de planejamento; não incorpora o conjunto de agentes do projeto.
- DeepSeek Harness: https://github.com/deepseek-ai/deepseek-harness — arquitetura extensível por plugins. O GameForge implementa um registro local restrito; não utiliza o runtime dsh/Cordis nem chama modelos externos.

Nenhuma fonte, asset, dependência ou credencial desses projetos foi copiada.

## Funcionalidades entregues

1. js/studio-intelligence.js: extrai dependências textuais de imports, scripts, CSS; diferencia EXTRACTED de INFERRED; propaga impacto reverso; identifica referências ausentes. Isso é aproximação estática, não comprovação de chamadas dinâmicas nem de funcionamento.
2. Brief: conserva gênero/dimensão, quantidade de fases, pedido em linguagem natural e restrições explícitas como "não mexer" e "manter". Não presume que mecânicas pendentes estão prontas.
3. QA: informa blocked quando game.js não existe ou needs-validation quando existe. Sintaxe, prévia, regressão e teste humano ficam pending até execução efetiva.
4. Plugins: createHarness registra módulos com ids seguros, capacidades read-spec, read-files e write-plan. Um plugin sem capacidades de leitura não recebe esses objetos; sem write-plan não emite resultados. Não há execução de código arbitrário nesta entrega.
5. Planejar melhoria exibe impacto e restrições; ao criar jogo offline, o Studio exporta BRIEF_E_CHECKLIST_STUDIO.md e MAPA_DEPENDENCIAS.json.

## Mapa do próprio motor

Na raiz do repositório, com Node.js:

    node tools/map-gameforge.cjs
    node tools/map-gameforge.cjs --impact js/development-engine.js
    node tools/map-gameforge.cjs --impact js/parser.js --json

O comando examina js/, tests/, css/ e index.html sem rede. Referências globais entre módulos são marcadas INFERRED. Sem AST, o mapa pode conter falsos positivos ou omissões. Não grava arquivos automaticamente.

## Critérios de aceite

- npm test e node --check para todos os módulos.
- npm run verify:exports.
- Fluxo GitHub Actions no Chromium para geração, prévia, exportação e backups.
- Uma pessoa deve testar o jogo manualmente e revisar os requisitos antes do merge.

## Segurança e limites

As capacidades dos plugins são controles lógicos para código confiável, NÃO uma sandbox de JavaScript. Um plugin de terceiros não confiável precisaria de isolamento real e aprovação de permissões antes de poder executar no navegador. O grafo não mede FPS. O gate de QA não declara que testes foram concluídos.

## Próximos passos

Integrar parser AST, cache incremental por hash, inspeção de chamadas com arquivo/linha, gates ligados a testes efetivos, agentes isolados e aprovação de diffs. Manter compatibilidade com o modo sem IA, Three.js e exportação GitHub Pages.
