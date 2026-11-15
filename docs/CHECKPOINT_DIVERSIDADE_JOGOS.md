# CHECKPOINT — GameForge Studio | 2026-11-14

## Objetivo
Evoluir o GameForge para criar muitos jogos distintos, inclusive dentro do mesmo gênero, com combinações de mecânicas, identidade visual, fases e progressão próprias, sem quebrar projetos existentes.

## Estado verificado (branch main)
- package.json declara v0.16.0; LEIA-ME abre com v0.15 (documentação a alinhar).
- js/parser.js reconhece 8 gêneros 2D (arena, shooter, racing, platform, rpg, tower-defense, lane-defense, block-td) e 4 gêneros 3D (arena, fps, racing, platform).
- js/generator.js escolhe runtimes por gênero; os jogos sem IA reutilizam estruturas e mecânicas pré-programadas.
- js/development-engine.js aplica alterações determinísticas reconhecidas; não interpreta qualquer mecânica inédita.
- js/three-runtime.js usa cenários/personagens procedurais e quatro temas 3D.
- GDD indexado e backup/rollback disponíveis; limites documentados: 30 fases na maioria dos gêneros, até 40 títulos em lane-defense, GDD até 1 MB.
- GitHub Actions verifica sintaxe e testes Node. Nesta análise não houve execução de testes nem QA visual.

## Diagnóstico
**Capacidade atual:** gerar protótipos de vários gêneros, com variações de tema, parâmetros e campanhas.
**Limitação principal:** dois GDDs do mesmo gênero tendem a produzir jogos estruturalmente parecidos. A simples descrição de uma mecânica nova não a implementa automaticamente.
**Não comprovado:** diversidade real por geração em massa, qualidade de 30 fases, performance em celulares reais, integração IA/backend e importação GLB operacional no gerador.

## Roadmap priorizado
### P0 — Medir antes de alterar
- [ ] Rodar npm test e registrar resultados.
- [ ] Gerar pelo menos 3 GDDs diferentes por gênero, comparar código, objetivos, cenários, inimigos e progressão.
- [ ] Testar no navegador desktop e Android; registrar falhas reproduzíveis.
- [ ] Alinhar versão/documentação.

### P1 — Diversidade dentro do mesmo gênero
- [ ] Separar gênero de mecânicas (combate, exploração, puzzle, economia, progressão, stealth, crafting, narrativa).
- [ ] Criar manifesto declarativo de recursos com compatibilidade, dependências e limites.
- [ ] Introduzir seeds configuráveis e arquétipos de fase, inimigo, chefe e objetivo.
- [ ] Implementar gerador de campanhas com variação real de layout e desafios.
- [ ] Adicionar testes de diversidade e regressão com seeds fixas.

### P2 — Editor e assets
- [ ] Editor visual de cenas 2D/3D, colisões e pontos de spawn.
- [ ] Pipeline GLB/GLTF com inspeção de escala, rig, animação e orçamento de renderização.
- [ ] Sistema de animações por estados e fallback para assets sem animação.
- [ ] Importação/exportação preservando referências e licenças.

### P3 — IA segura e evolução contínua
- [ ] Backend HTTPS para provedores de IA (incluindo Kimi, se API e termos permitirem), mantendo chaves exclusivamente no servidor.
- [ ] Plano de alteração com diff, aprovação, testes e rollback antes de aplicar.
- [ ] QA automatizado de objetivos, colisões, inicialização, exportação e performance.
- [ ] Fluxo opcional de publicação no GitHub com confirmação e checks.

## Critérios de aceite da próxima etapa
1. Testes existentes passam sem regressões.
2. Três jogos do mesmo gênero demonstram diferenças verificáveis de mecânicas/objetivos e layout, não apenas cores ou nomes.
3. Exportações continuam jogáveis offline quando aplicável.
4. Backup e desfazer continuam íntegros.
5. Limitações não implementadas aparecem claramente no relatório do jogo.

## Registro de execução
- 2026-11-14: inspeção estática de árvore, LEIA-ME, parser, generator, development-engine, runtimes 2D/3D, package.json e workflow.
- Não houve alteração de código, execução de testes ou publicação de melhorias funcionais nesta etapa.
- Próxima ação recomendada: P0, matriz de testes de diversidade; em seguida P1, manifesto modular de mecânicas.

## Atualização — composição de mecânicas (2026-11-14)
- [x] Catálogo declarativo inicial em `js/parser.js` para combate, exploração, puzzles, economia, inventário, crafting, furtividade e progressão.
- [x] GDD gera `spec.mechanics` com `requested`, `available` e `pending`, sem afirmar implementação inexistente.
- [x] Testes de regressão adicionados em `tests/mechanics-composition.test.js`.
- [ ] Executar testes Node no CI e verificar status.
- [ ] Implementar mecânicas executáveis interoperáveis, começando por puzzles + inventário + economia no RPG 2D.
- [ ] Integrar editor visual e escolhas explícitas de mecânicas na interface.
