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

## Importação do layout RPG 2D
- [x] Campo JSON adicionado ao Studio; aceita configuração exportada pelo editor para fase 1.
- [x] Análise valida coordenadas de chave/alavanca/portão, máximo oito baús e moedas 0–250; injeta `stageConfig[0]` e ativa puzzles no RPG 2D.
- [ ] Persistir campo em backup/restauração do projeto; integração atual não garante preservação no backup.
- [ ] Testar exportação, importação e execução no navegador; ainda não verificados.
- [ ] Estender importação a múltiplas fases.

## RPG 2D — persistência do layout
- [x] Campo de JSON do layout incluído no snapshot do Studio, carregamento de projeto e salvamento automático.
- [x] Normalização do backup portátil e do armazenamento local agora preserva `rpgLayoutJson` (máximo 30 KB).
- [x] Adicionados testes de backup, restauração local e limite de tamanho em `tests/rpg-layout-backup.test.js`.
- [ ] Execução do CI e validação de navegador pendentes.
- [ ] Importação de múltiplas fases e sincronização bidirecional com editor visual ainda pendentes.

## RPG 2D — layouts de múltiplas fases
- [x] Editor visual suporta criar, selecionar e excluir até 30 fases e exporta `{stages:[{puzzle,chests},...]}`.
- [x] Importação no Studio aceita formato antigo de fase única e formato de múltiplas fases, validando cada fase.
- [x] Configurações importadas são aplicadas a `stageConfig[n]` na especificação do jogo.
- [ ] Verificar testes e funcionamento no navegador, especialmente seleção de fases e exportação.
- [ ] Adicionar importação de JSON de volta ao editor, persistência integrada e múltiplos puzzles por fase.

## RPG 2D — reabertura de layouts no editor
- [x] Editor visual aceita JSON colado ou arquivo JSON local com uma ou até 30 fases.
- [x] Importação valida chave, alavanca, portão, coordenadas, quantidade de baús e recompensas antes de substituir o layout atual.
- [x] Download do JSON de todas as fases pelo editor.
- [ ] Validar interface no navegador e execução de testes automatizados.
- [ ] Sincronização automática entre Studio e editor e múltiplos enigmas independentes por fase ainda pendentes.

## RPG 2D — transferência direta editor → Studio
- [x] Editor envia layouts via localStorage da mesma origem, com ação explícita do usuário.
- [x] Studio importa e valida o layout enviado por botão, sem copiar/colar JSON.
- [x] Layout recebido integra o salvamento existente e é usado na geração RPG 2D.
- [ ] Testes no navegador pendentes; transferência requer mesma origem e armazenamento local habilitado.
- [ ] Sincronização bidirecional e múltiplos enigmas por fase ainda pendentes.

## Plataforma 2D — primeira rodada de melhorias
- [x] Movimento com aceleração e desaceleração, pulo com altura variável, coyote time e jump buffer.
- [x] Inimigos podem ser derrotados por salto sobre eles, com pontuação e XP.
- [x] Câmera horizontal limitada à extensão de mundo usada pelo motor.
- [x] Queda fora do mapa encerra a tentativa.
- [ ] Executar testes de regressão e validar colisões, física e controles touch no navegador.
- [ ] Criar fases com plataformas alcançáveis, checkpoints e novos padrões de inimigos.

## Plataforma 2D — checkpoints e progressão
- [x] Plataformas com variação vertical reduzida e moedas distribuídas nas plataformas.
- [x] Checkpoints a cada seis plataformas, com bandeira visual e cura de 10 pontos.
- [x] Quedas retornam ao checkpoint com penalidade de 25 de vida; game over ao esgotar vida.
- [x] Telemetria inclui checkpoint alcançado e número de quedas.
- [ ] Validar no navegador alcance dos saltos, colisões, geração de fases e desempenho no celular.
- [ ] Próximo: inimigos patrulhando plataformas, armadilhas e animações.

## Plataforma 2D — patrulha e animação procedural
- [x] Inimigos patrulham os limites da plataforma e invertem a direção nas extremidades.
- [x] Personagem recebe animação procedural de braços/pernas ao caminhar e orientação conforme movimento.
- [x] Retorno ao checkpoint limpa estado de salto e movimento vertical.
- [ ] Validar colisões, animações e patrulhas no navegador e no celular.
- [ ] Próximo: armadilhas, inimigos variados, efeitos visuais e testes automatizados.

## Plataforma 2D — armadilhas e inimigos blindados
- [x] Armadilhas de espinhos geradas em plataformas selecionadas, com colisão e dano.
- [x] Inimigos blindados exigem dois saltos: quebra da armadura e derrota.
- [x] Velocidades variadas de patrulha e indicação visual dos inimigos blindados.
- [x] Telemetria expõe quantidade de armadilhas.
- [ ] Testar colisão com espinhos e impactos nos inimigos no navegador e em controles móveis.
- [ ] Próximo: melhorar efeitos visuais leves, balancear geração e acrescentar testes de regressão.

## Plataforma 2D — efeitos leves e balanceamento
- [x] Partículas curtas ao atingir inimigos por cima, sem imagens externas.
- [x] Armadilhas deixam de ser posicionadas sobre plataformas de checkpoint.
- [x] Partículas de impacto são removidas após curta duração.
- [ ] Testes automatizados de física e colisão e validação real no navegador ainda pendentes.
- [ ] Próximo: testes de regressão, correções da física e balanceamento por fase.

## Plataforma 2D — regressão de combate e balanceamento
- [x] Pisão usa velocidade de queda e posição anterior à resolução do pouso.
- [x] Inimigos limitados a 22 e distribuídos por plataformas distintas.
- [x] Criado tests/platform-runtime.test.js com verificações estáticas das regras de pisão, checkpoints, inimigos e partículas.
- [ ] Executar testes em Node e validação interativa no navegador; não afirmar aprovação sem execução.
- [ ] Próximo: cenários de física com testes dinâmicos e transição ao motor de corrida.

## Corrida 2D — primeira evolução
- [x] Aceleração, freio e turbo com velocidade variável e direção suavizada.
- [x] Colisões reduzem velocidade, aplicam dano e exibem feedback.
- [x] Geração de tráfego baseada em distância percorrida, com limite de proximidade por faixa.
- [x] Telemetria de velocidade, distância e colisões; controles documentados na interface.
- [ ] Testes reais no navegador e em dispositivos móveis ainda pendentes.
- [ ] Próximo: pistas com curvas, tráfego que muda de faixa e HUD de velocidade.

## Corrida 2D — curvas e HUD
- [x] Pista com deslocamento lateral procedural em função da distância.
- [x] Obstáculos e tráfego acompanham a curvatura visual da pista.
- [x] Limites laterais do jogador acompanham o centro da estrada.
- [x] HUD com velocímetro e distância percorrida.
- [ ] Validar colisões em curvas e experiência no celular.
- [ ] Próximo: transições de faixa com prevenção de colisão, variedade visual de carros e testes dinâmicos.

## Corrida 2D — tráfego e modelos visuais
- [x] Tráfego adversário tenta mudanças de faixa com intervalo e verificação de proximidade de outros carros.
- [x] Quatro variações de cores de carros com janelas e faróis.
- [x] Cones com desenho próprio e faixa de sinalização.
- [ ] Suavizar interpolação das mudanças de faixa (atualmente o centro da faixa muda imediatamente).
- [ ] Validar colisões e espaçamento com testes dinâmicos e navegador.
- [ ] Próximo: interpolação lateral, melhorias de física e testes de regressão.

## Motor gráfico — primeira atualização de qualidade visual
- [x] Renderização reutilizável de carros com carroceria em gradiente, vidros, rodas e iluminação.
- [x] Pista com tonalidades de asfalto e cenário com vegetação procedural.
- [x] Céu com gradiente e sol para o gênero plataforma.
- [ ] Verificar compatibilidade e desempenho no navegador/celular, incluindo custo dos gradientes por quadro.
- [ ] Próximo: separar perfis de qualidade, sprites e animações reutilizáveis, iluminação leve e visual específico por gênero.

## Motor gráfico — qualidade adaptativa
- [x] Perfis gráficos low, medium e high com seleção automática inicial high.
- [x] Ajuste automático a cada 180 amostras de tempo de quadro, com redução de detalhes em quadros lentos.
- [x] Densidade de vegetação e camadas da pista e cenário 2D variam conforme o perfil.
- [x] Telemetria inclui graphicsQuality e graphicsFrameMs.
- [ ] Expor escolha de perfil na interface de criação e garantir propagação de spec.graphicsQuality no gerador.
- [ ] Validar visualmente os três níveis, inclusive no celular; executar testes de desempenho.
- [ ] Próximo: animações e sprites reutilizáveis e controles de qualidade na interface.

## Motor gráfico — personagens vetoriais animados
- [x] Função reutilizável drawAnimatedActor para inimigos de plataforma, com cabeça, corpo, braços, pernas e armadura.
- [x] Ciclo de caminhada por fase, direção de patrulha e simplificação no perfil gráfico baixo.
- [x] Ajuste visual de pernas do jogador durante saltos.
- [ ] Verificar suporte de CanvasRenderingContext2D.roundRect nos navegadores-alvo e testar o desenho no celular.
- [ ] Próximo: animações de ataque, dano e derrota; biblioteca de estilos de personagens e controles gráficos no Studio.
