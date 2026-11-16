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

## Plataforma 2D — variações e animações de inimigos
- [x] Inimigos walker, armored e scout com diferenças visuais.
- [x] Flash de dano ao quebrar armadura.
- [x] Animação breve de derrota com redução de altura e transparência, removida após 0,45 segundo.
- [ ] Testar no navegador e celular, incluindo colisões e compatibilidade Canvas.
- [ ] Próximo: integrar estilos visuais selecionáveis ao gerador e validar animações em testes dinâmicos.

## Studio — estilos e qualidade gráfica 2D
- [x] Controles visuais para qualidade automática/leve/equilibrada/alta e estilos padrão/natureza/neon/deserto/ruínas.
- [x] Persistência dos controles via creationOptions e restauração do projeto.
- [x] Parser transmite graphicsQuality e visualStyle ao spec.
- [x] Runtime aplica paletas visuais e níveis de qualidade do spec.
- [ ] Testar geração completa, exportação e compatibilidade com os demais gêneros.
- [ ] Próximo: criar cenários e silhuetas realmente diferentes por estilo; validar testes automatizados.

## Engenharia — etapa 2: tráfego, corredor de colisão e regressão
- Subsistema: motor de corrida 2D, mudanças de faixa.
- Arquivos alterados: `js/runtime-template.js`; `tests/racing-lane-logic.test.js`; este checkpoint.
- Problema: checagem apenas da faixa final não protegia a origem e o corredor atravessado.
- Solução: verificação de intervalos de faixas durante a transição, com cones e veículos em movimento; ajuste de tolerância para não bloquear faixa não adjacente.
- Verificações executadas: 7 casos de lógica avaliados diretamente sobre helpers extraídos do runtime, todos passaram após correção. Primeira tentativa falhou no caso de faixa não adjacente e foi corrigida.
- Testes adicionados: 5 casos Node `node:test` em `tests/racing-lane-logic.test.js`.
- Não executados nesta sessão: suíte `npm test`, testes de navegador/celular, medição de FPS e regressão E2E dos demais motores. Os testes Node foram publicados, mas sua execução ainda não foi confirmada.
- Pendências: validar integração no navegador e GitHub Actions, melhorar geração de tráfego e isolar subsistemas em módulos sem quebrar exportação offline.

## Engenharia — etapa 3: validação CI e exportação offline
- Inspeção confirmada: workflow `.github/workflows/verify.yml` executa `node --check js/*.js` e `npm test` no Node 20.
- Execução GitHub Actions nº 96 (run 43767911857) do commit 8014d5dea8e31748d1d1912da298a0849f391e1b: concluída com sucesso, incluindo sintaxe e testes automatizados.
- Arquivo criado: `tests/runtime-export-smoke.test.js`, cobrindo exportação offline dos gêneros plataforma, corrida e arena, presença de configuração gráfica e compilação sintática do código gerado.
- A execução CI dos novos testes estava na fila quando consultada; não foi declarada aprovada.
- Limitações: smoke tests não executam gameplay nem simulam DOM, física, GPU ou touch; faltam navegador real, medição de FPS e regressão dos motores RPG/TD/3D.
- Próxima ação: confirmar CI do novo teste, corrigir falhas e adicionar harness de inicialização com DOM simulado.

## Engenharia — etapa 4: integração dos motores em DOM/Canvas simulados
- CI anterior confirmada: GitHub Actions run 43768984046 (commit 548985a8a21a17be1d3e63aa818871a0a243cc7d) concluiu com sucesso.
- Arquivos alterados: `tests/runtime-boot-integration.test.js` (novo) e este checkpoint.
- Cobertura nova: inicialização, primeiro frame, início de jogo, avanço de relógio, pausa/retomada para plataforma, corrida e arena; aceleração e distância da corrida via entrada de teclado.
- Técnica: Node `vm` com elementos DOM e Canvas 2D simulados; não substitui navegador real.
- Resultado no momento da publicação: teste de integração publicado no commit 94d989f893b1b0113c32147794b671a0ff9256d8; workflow 43771066988 estava na fila. Não afirmar sucesso sem consulta posterior.
- Pendências: confirmar CI, corrigir eventuais falhas, adicionar testes de colisão e transição de fases, realizar QA em browser/mobile e medir desempenho.

## Engenharia — etapa 5: transição e conclusão de fases
- Auditoria: confirmado sucesso das execuções CI 43771083834 e 43771083505 (commit 65a9f8bdf261a43782b59814c75399204b363772), cobrindo testes de inicialização simulada dos três motores.
- Arquivos modificados: `tests/runtime-boot-integration.test.js` e este checkpoint. Código de produção inalterado nesta etapa.
- Novos testes: simulação prolongada de corrida até vitória na última fase e transição da primeira para a segunda fase, verificando reinicialização do percurso e manutenção do estado de jogo.
- Resultado: commit dc0a4440786885680c03f5ab6d47ea6e6b4bbcb5 publicado; CI dos novos cenários estava na fila na última consulta, sem resultado confirmado.
- Riscos: o tráfego aleatório pode provocar colisões e derrota antes do objetivo; teste de progressão pode revelar falta de controle determinístico da simulação.
- Pendências: analisar CI e estabilizar simulações com semente aleatória e controle de estado; validar física/colisão e executar testes em navegador e dispositivo móvel.

## Auditoria transversal dos repositórios de jogos — 15/11/2026
- Solicitação: aproveitar técnicas reutilizáveis dos jogos da conta no GameForge, com prioridade para código aberto e licenças.
- Inventário: 99 repositórios visíveis na primeira listagem; 11 árvores de raiz consultadas; quatro arquivos-fonte inspecionados diretamente.
- Arquivos alterados: `js/repository-knowledge.js`; `docs/AUDITORIA_REUSO_JOGOS_2026-11-15.md`; `tests/repository-audit-catalog.test.js`; este checkpoint.
- Catálogo: quatro técnicas com origem verificável — loop fixo (Operacao-eden), checkpoint (navinha-arcade), cache de sprites (Neon-Sky-Force) e colisões (Dragon-Fury).
- Testes criados: IDs únicos, proveniência e recuperação de referências por busca. Execução CI ainda precisa ser confirmada.
- Limite: referências catalogadas, não são implementação portada nem prova de compatibilidade; licenças e direitos de assets ainda exigem auditoria individual.
- Próximo: verificar CI; portar uma técnica por vez com testes de regressão e benchmark, começando por loop fixo.

- Observação de CI após auditoria: run 43777702383 falhou em teste pré-existente de vitória da corrida, que terminou em derrota devido ao tráfego durante a simulação; a falha não apontou sintaxe do catálogo. Ajuste do teste em `tests/runtime-boot-integration.test.js` publicado no commit 0abe7cca7ebb24021b6d8944c16fc11442d5da0e. Resultado do novo CI ainda pendente.
- Risco pendente: teste de corrida ainda não possui controle determinístico de obstáculos/RNG; evitar considerar a mitigação por direção constante uma correção definitiva.

## Engenharia — etapa 6: simulação 2D de passo fixo (Operação Éden)
- Diagnóstico: `frame(ms)` avançava a física com dt variável limitado a 33ms; em FPS diferentes, física, colisão e cronômetros podiam divergir.
- Origem da técnica: `Operacao-eden/src/core/GameLoop.js` (inspiração arquitetural, não cópia literal).
- Arquivos alterados: `js/runtime-template.js`, `tests/runtime-boot-integration.test.js`, `tests/test_repo_knowledge.js` e este checkpoint.
- Implementação: SIM_STEP=1/60, acumulador, no máximo cinco updates por frame, clamp de pausa/aba suspensa em 250ms, descarte do backlog e reset do acumulador fora do estado ativo.
- Testes acrescentados: relógio da simulação comparado em 30/60/120 FPS; limite de passos após salto de 20 segundos; pausa de 20 segundos sem recuperar o tempo.
- Regressão anterior: CI 43780747779 passou após substituir assert rígido de 29 entradas do catálogo por teste de mínimo e IDs únicos.
- Resultado da alteração do loop: código publicado; CI 43780779249 estava na fila na consulta inicial, portanto ainda não validado como aprovado.
- Pendências: confirmar CI e corrigir regressões, testar em navegador/celular, medir frame time e integrar simulação determinística nos outros motores com interfaces adequadas.

## Engenharia — etapa 7: núcleo geométrico de colisões
- CI da etapa 6 confirmado: GitHub Actions runs 43780833312 e 43780833169 aprovados no commit 2829d17fadec1c8aa1cdcb6a5f3cdbf6b13599e5.
- Origem da ideia: despachante de colisões de `Dragon-Fury/collision-system.js`; implementação nova e independente no runtime GameForge.
- Arquivos alterados: `js/runtime-template.js`, `tests/collision-geometry.test.js` e este checkpoint.
- Adicionado `circlesOverlap(a,b,extra)` com distância quadrática, margem opcional e tangência sem colisão; `rectanglesOverlap(a,b)` AABB pura.
- Migradas detecções circulares de arena (contato, projéteis e coleta), plataforma (contato) e corrida (obstáculos) para helper compartilhado. Preservadas regras de dano e progressão.
- Testes adicionados: sobreposição, tangência, simetria, margem de coleta, raios nulos, retângulos e presença de integração dos gêneros.
- Limite: AABB disponível mas ainda não conectada aos cenários; não houve benchmark de FPS, navegador ou QA móvel.
- Resultado: commits 40408c2425ec76607aa55afeca33d751e36d31a2 e d66613283119dcff0769ad46aa8bbfd173a84356 publicados; CI ainda pendente de confirmação.
- Próximo: confirmar CI, resolver regressões e investigar grade espacial para projéteis e inimigos numerosos.

## Engenharia — etapa 8: grade espacial para colisão de projéteis (arena)
- CI etapa 7: runs 43841441554 e 43841441121 aprovados (commit 53db2172f6546d2ccd68dee68bf7dbf2d35feeb5).
- Diagnóstico: arena comparava cada inimigo com todos os projéteis, custo O(E×B) mesmo distantes.
- Arquivos alterados: `js/runtime-template.js`, `tests/arena-spatial-grid.test.js` e este checkpoint.
- Implementação: índice espacial de projéteis com células de 64px por frame; busca em nove células vizinhas, ordenada pelo índice original do projétil para preservar prioridade de acerto. O raio máximo atual de colisão é 36px (boss 31 + projétil 5), inferior ao tamanho da célula.
- Testes: proximidade, ordem, fronteiras, coordenadas negativas, zero objetos, 100 objetos sem duplicação e presença de integração.
- Limites: custo de criação do grid por quadro e ordenação dos candidatos; sem benchmark real, sem índice para inimigos ou outros gêneros; raio de colisão maior que 64px exigirá ampliar vizinhança.
- Publicado nos commits 92ddbe83370d1615ec2b3c467bfb5c50eec92406 e 2fa5a591d91d4825aeae7c2ec895842f03858e60; CI ainda não confirmado.
- Próximo: confirmar CI, testar equivalência de colisões por simulação determinística e medir custo em cenários densos antes de otimizar outros motores.

## Engenharia — etapa 9: equivalência determinística + benchmark da grade (16/11/2026)
- **CI anterior confirmada:** GitHub Actions runs 43841704494 e 43841704389 aprovados no commit bcf30b48b60b3e60761e46fa2d7f9e2260aa3b05.
- **Falha potencial corrigida:** consulta limitada a nove células ignoraria contatos de hitboxes futuras acima de 64px; a função `nearbyBullets(grid,x,y,hitRadius)` agora consulta o intervalo de células conforme o raio real do inimigo mais o maior raio de projétil presente.
- **Arquivos atualizados:** `js/runtime-template.js`, `tests/arena-spatial-grid.test.js`, `tests/arena-spatial-equivalence.test.js`, `tools/bench-arena-spatial.cjs`, `package.json`, `.github/workflows/verify.yml` e este checkpoint.
- **Equivalência comprovada por teste:** 120 cenas com seeds fixas, acompanhadas durante cinco quadros, comparando varredura completa e grade; resultados comparados para impactos, vida e entidades remanescentes. Cobertura adicional de chefes grandes e prioridade de alvos. GitHub Actions run 43843031966 aprovado.
- **Benchmark real executado no runner CI:** job 133217041004, workflow run 43843284586 (Node v20.20.2). Resultados aproximados da microconsulta com construção de grade incluída:

| Inimigos | Projéteis | Varredura linear | Grade | Aceleração observada | Verificações linear / grade |
|---:|---:|---:|---:|---:|---:|
| 12 | 30 | 6,32 ms | 3,64 ms | 1,74× | 9.710 / 186 |
| 50 | 200 | 137,37 ms | 16,01 ms | 8,58× | 217.647 / 4.233 |
| 140 | 650 | 772,11 ms | 59,89 ms | 12,89× | 1.228.849 / 24.006 |
| 280 | 1.300 | 1.917,80 ms | 138,41 ms | 13,86× | 3.027.914 / 58.702 |

- **Como repetir:** `npm test` e `npm run bench:arena`; CI executa ambos. Benchmark informativo: mede somente busca e interseção com cenas sintéticas, **não representa FPS real**, impacto de render, dano ou hardware móvel; tempos variam entre execuções.
- **Limites/pendências:** testar ponta a ponta em navegador e no celular; analisar custo de memória e GC em sessões prolongadas; só ampliar a outros motores conforme necessidade e benchmark independente.
