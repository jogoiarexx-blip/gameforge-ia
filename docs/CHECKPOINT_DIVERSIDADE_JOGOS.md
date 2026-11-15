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

## Estratégia por motor — 2026-11-14
- [x] Planejador `js/idea-mixer.js` criado com cinco ideias combináveis e classificação de mecânicas disponíveis/pendentes.
- [x] Testes unitários do planejador adicionados.
- [x] Corrigido escape de limites de palavra nas expressões regulares do catálogo.
- [ ] Integrar seletor de misturas à interface e à exportação; o planejador atual é API de código, não funcionalidade jogável.
- [ ] Rodar testes e QA do GitHub Actions após os commits.
- [ ] **Motor 1: RPG 2D** — implementar puzzle de chave/porta, inventário interoperável e comércio, com testes.
- [ ] Motor 2: plataforma 2D — exploração e objetivos não lineares.
- [ ] Motor 3: shooter 2D — progressão e missões distintas.
- [ ] Motor 4: aventura/FPS 3D — exploração, missões e interação com objetos.
- [ ] Motores de corrida e tower defense — variações próprias após estabilização.
Critério: cada motor só avança após testes, exportação, backup e revisão visual; mecânica pendente não pode ser marcada como implementada.

## Motor 1 — RPG 2D: primeiro enigma jogável
- [x] Chave coletável, portão ativável e condição adicional de conclusão quando o GDD solicita puzzles.
- [x] HUD e telemetria mostram estado da chave e do portão; modo Tower Defense não afetado.
- [ ] Validar no navegador que o portão seja fisicamente bloqueante e que o fluxo seja acessível.
- [ ] Criar testes automatizados de integração do puzzle e verificar CI.
- [ ] Tornar locais de chave e portão configuráveis por fase; integrar editor e misturador à interface.

## Entrega seguinte — 2026-11-14
- [x] Portão do RPG 2D agora usa obstáculo de colisão, retirado ao resolver o desafio.
- [x] Chave + alavanca obrigatórias para abrir portão quando puzzles solicitados no GDD.
- [x] Indicadores do inventário e telemetria incluem chave, alavanca e resolução.
- [x] Parser reconhece `puzzles` no plural.
- [ ] Validar navegação completa em navegador e executar regressões; nenhuma execução de workflow encontrada para commit consultado.
- [ ] Fazer gate parametrizado por fase, múltiplos puzzles, integração da mistura ao formulário e testes E2E.

## RPG 2D — puzzles por fase (continuação)
- [x] Três arranjos de chave e alavanca alternados entre fases; portão preservado no corredor final.
- [x] Suporte opcional a `stageConfig[n].puzzle.key/lever/gate` com coordenadas x/y e validação básica.
- [x] Guia `docs/RPG_PUZZLES_POR_FASE.md` publicado.
- [ ] Executar testes Node e validar manualmente jogabilidade/colisões no navegador.
- [ ] Construir editor visual e múltiplos enigmas por fase; coordenadas personalizadas ainda não possuem verificação automática de caminho.

## RPG 2D — recompensa por enigma
- [x] Resolver chave + alavanca + portão concede XP e ouro configurável por fase, uma vez por resolução.
- [x] Recompensa integrada ao saldo existente e registrada na telemetria.
- [ ] Testar cenário completo no navegador e confirmar CI.
- [ ] Próxima implementação: múltiplos enigmas independentes por fase, editor de posicionamento e baús.

## RPG 2D — baús configuráveis
- [x] Até oito baús por fase com ouro e XP, coleta por proximidade e indicadores de telemetria.
- [x] Três baús padrão; opção `stageConfig[n].chests` para alterar posições e moedas.
- [ ] Executar testes automatizados e QA de navegação; validar posicionamento customizado.
- [ ] Próximo: editor visual e múltiplos puzzles independentes por fase.

## RPG 2D — primeiro editor visual
- [x] Publicado `tools/rpg-layout-editor.html`, editor estático com arrastar objetos, até oito baús e exportação JSON para `stageConfig[n]`.
- [x] Editor responsivo com controles de toque e mouse, seleção e exclusão.
- [ ] Integrar editor diretamente à interface principal e salvar configuração no GDD/exportação.
- [ ] Validar navegador e testes de regressão; ainda não confirmado.
- [ ] Múltiplos enigmas independentes e verificação automática de caminhos permanecem pendentes.

## Integração de navegação do editor RPG
- [x] Interface principal inclui link direto ao editor visual RPG 2D, aberto em nova aba.
- [ ] Aplicar JSON do editor ao spec do jogo pela interface (ainda é cópia manual).
- [ ] Confirmar CI e teste visual em mobile e desktop.
