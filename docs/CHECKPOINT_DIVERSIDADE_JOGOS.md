# CHECKPOINT — GameForge Studio | 2026-11-14

## PAINEL ATIVO DE CONTINUIDADE — auditoria geral de 16/11/2026

**Fonte de verdade para as próximas etapas:** [PLANO MESTRE — 28 itens com prioridade, evidência e aceite](./PLANO_MESTRE_GAMEFORGE.md).

**Base auditada:** `main` `5130453010ba7c590a30ad5def463678c7d45bd6`, GameForge Studio `v0.20.0`. A execução [CI 43860458148](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43860458148) aprovou **196 testes, zero falhas**; Pages também foi publicado. Regressões de exportação **ocorreram** em runs anteriores e foram corrigidas no commit citado. O histórico técnico abaixo não deve ser lido como estado atual.

### Fila de execução — não avançar sem registrar resultado

- [ ] **GF-001 · P0 — Gate de publicação (EM REVISÃO):** workflow, preflight, testes negativos e dupla verificação de SHA implementados; **ainda falta mudar Settings → Pages → Source para GitHub Actions** para remover a rota automática da branch.
- [x] **GF-002 · P0 — Exportação e boot (VALIDADO em Chromium):** cobertura expandida para **15 pares gênero/dimensão**, incluindo URB-01 3D; 261 testes Node e 17 cenários Chromium aprovados no run 43887382720. QA em hardware real continua GF-019.
- [ ] **GF-003 · P0 — Reconhecimento real de GDD:** corpus versionado de gêneros e casos longos (incluindo GoldenEye FPS 3D), incerteza e conflitos.
- [ ] **GF-004 · P0 — Contrato de capacidades:** diferenciar requisito solicitado, parâmetro configurado e mecânica implementada/testada.
- [x] **GF-005 · P0 — Integridade de projeto (VALIDADO em Chromium):** continuidade, backup, ZIP e GLB testados em browser limpo; ver seção Encerramento GF-005. Testes físicos/mobile seguem em aberto.
- [ ] **GF-028 · P1 — Ação urbana 3D (EM EXECUÇÃO):** **URB-01 VALIDADO** — bairro 3D jogável, câmera em terceira pessoa, colisões, combate, negócio, missão e save; **URB-02 a URB-05 pendentes** (IA/câmera avançadas, economia, veículos, GLB).

**Bloqueio externo:** GF-001 ainda depende da mudança administrativa da origem de publicação do Pages. **Próxima tarefa de motor: URB-02** (câmera com oclusão, mira e guardas com IA aprimorada). GF-005 já foi validado em Chromium; GF-019 mantém QA em dispositivos físicos. Os **22 itens P1/P2** (interface, evolução de motores, campanhas, assets, animações, performance, segurança, backend e editor) estão detalhados no plano mestre. Manter IDs estáveis e alterar o estado para `VALIDADO` somente com código publicado, testes e CI no mesmo commit; QA visual requer navegador real.

**Escopo desta auditoria:** análise estática de código, documentação, testes e GitHub Actions. **Não** foi feito teste manual real em Android/iPhone, nem auditoria do servidor opcional (código backend não está neste repositório).

---


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

## Engenharia — etapa 10: reutilização de buffers e pressão de GC da arena (16/11/2026)
- **Base confirmada:** GitHub Actions runs 43843485927 e 43843484715 aprovados no commit `71ff2b974ac7f92436102e9dd7082c61f1636691`.
- **Mudança funcional:** `js/runtime-template.js` agora reutiliza a grade espacial entre quadros, recicla arrays de buckets por pool e executa `nearbyBulletIndexes()` com um único buffer de índices temporário. O loop de combate acessa `bullets[bulletIndex]` sem criar um array de objetos por inimigo. `nearbyBullets()` permanece para compatibilidade de ferramentas, retornando cópia independente.
- **Segurança e equivalência:** `tests/arena-spatial-grid.test.js` cobre limpeza de células antigas, identidade do buffer, consulta sem resíduos e 1.400 quadros com pool limitado. `tests/arena-spatial-equivalence.test.js` agora percorre o **mesmo caminho por índices usado na arena**, reusando grid entre frames, comparando com busca linear em 120 cenas/5 quadros.
- **Benchmark atualizado:** `tools/bench-arena-spatial.cjs` mede três métodos (`brute`, `compat` e `reused`), incluindo custo de criação/reutilização de grade. CI executa com `npm run bench:arena`.
- **Validação confirmada:** GitHub Actions run 43844682631, job 133221782852, commit `cd73ec42d568a776e00ddef80ab91b120fe9d1ff`: **128 testes aprovados, zero falhas**, microbenchmark aprovado.
- **Medição observada em Node v20.20.2, CI:** valores informativos, não FPS do jogo:

| Inimigos / projéteis | Linear | Grade compat | Grade reutilizada | Ganho da reutilizada vs compat |
|---|---:|---:|---:|---:|
| 12 / 30 | 6,64 ms | 3,71 ms | 3,82 ms | 0,97× |
| 50 / 200 | 135,88 ms | 16,31 ms | 16,24 ms | 1,00× |
| 140 / 650 | 764,40 ms | 60,02 ms | 59,53 ms | 1,01× |
| 280 / 1.300 | 1.890,86 ms | 138,46 ms | 136,36 ms | 1,02× |

- **Interpretação:** o ganho de CPU **adicional** da reutilização em relação à grade anterior é pequeno ou nulo neste microbenchmark, embora elimine a alocação de arrays por inimigo no caminho de produção. Não foi medida redução de GC ou heap em navegador; não anunciar melhora de FPS.
- **Limites:** grade ainda cria strings de chaves de célula; pool mantém buffers até o maior pico de ocupação; medir heap/GC em sessão real e mobile. Não foi realizado QA em navegador ou celular nesta etapa.
- **Próxima prioridade:** perfil de memória e pausa de GC com ferramentas de navegador; revisar movimentação de inimigos e culling, expandindo para outros motores somente com benchmark apropriado.

## Engenharia — etapa 11: integração inicial de GLB estático no mundo 3D (16/11/2026)

**Objetivo:** superar a inspeção isolada de metadados GLB e permitir que o modelo seja realmente usado dentro de um jogo gerado.

**Arquivos alterados:** `js/glb-runtime.js` (novo), `js/three-runtime.js`, `js/generator.js`, `js/app.js`, `js/project-backup.js`, `index.html`, `tests/glb-import.test.js`, `package.json`, `LEIA-ME.md` e este checkpoint.

**Concluído em código:** entrada de um GLB 2.0 estático até 1,2 MB; malhas triangulares e materiais/texturas embutidos; posição X/Z e escala; instância preservada por fase sem substituir regras de personagens; prévia e HTML offline com asset embutido; ZIP com `assets/cenario.glb`; backup/restauração de base64 e metadados; controles de remoção e reposicionamento.

**Validação realizada nesta sessão:** compilação de sintaxe de 8 módulos JS com V8 (sem erros). Testes de fumaça executados com o código lido diretamente do GitHub: GLB sintético com 3 vértices decodificado pela cópia real do Three.js r180; material, geometria e alinhamento ao chão instanciados; geração de HTML/iframe com asset e limites de posição; backup `encode/decode` recuperando o conteúdo; inicialização de arena real com renderizador substituto, objeto importado em X=8, Z=7, escala 1,4, preservado ao iniciar. Suíte Node `tests/glb-import.test.js` adicionada para reproduzir conversão, rejeição, HTML, backup e inserção no runtime.

**Não verificado:** execução completa de `npm test` no runner ou conclusão do GitHub Actions do commit final; WebGL real em navegador publicado, desempenho Android, qualidade de modelo Meshy, texturas em exemplos reais, animações esqueléticas, física e colisão de assets. Esses itens **não** estão marcados como concluídos.

**Próximos objetivos:** executar `npm test`/CI e QA visual, conferir texturas; remover limite de 1,2 MB com armazenamento IndexedDB para arquivos binários e ZIP importável; biblioteca de múltiplos assets com licenças e papéis (player, NPC, inimigo, cenário); GLTFLoader completo e sistema de animações por estado; benchmarks de memória e regressões dos motores 2D/3D.

### Validação de CI da etapa 11 — confirmada

- Commit de correção dos testes: `6a1610c04511`.
- **GitHub Actions run 43848177323: aprovado.** Validação de sintaxe, `npm test` e `npm run bench:arena` concluíram com sucesso em Node 20.
- Resultado do runner: **137 testes aprovados, 0 falhas, 0 ignorados**.
- **GitHub Pages run 43848176335: aprovado.** O fluxo de build/deploy finalizou, mas isso não comprova QA de renderização WebGL em navegador de usuário.
- Houve falhas anteriores introduzidas pelo sandbox do teste GLB, corrigidas antes desta confirmação.
- Mantidas pendências: QA visual real, celulares, modelos GLB Meshy maiores, rig/animação/colisões.

## Interface — etapa 11: fluxo de criação limpo e prévia central (16/11/2026)
- **Pedido:** tornar o layout do GameForge mais fácil de entender, limpo, centralizado e sem textos/ferramentas em excesso na tela inicial.
- **Problema identificado:** três colunas apertadas; GDD, modelos, motor, roadmap, editor de fases, QA e ferramentas de engenharia estavam expostos simultaneamente, fazendo a prévia ficar abaixo da dobra.
- **Arquivos de interface modificados:** `index.html` e `css/app.css`.
- **Navegação principal:** três passos visíveis: (1) ideia ou GDD, (2) criar jogo, (3) prévia jogável; títulos e rótulos reduzidos; prévia reposicionada antes das ferramentas avançadas.
- **Reorganização sem remoção de funcionalidade:** seções com detalhes nativos `<details>/<summary>`, fechadas inicialmente, para backup, editor RPG, estilos e gráficos, modelos de jogo, biblioteca de técnicas, roadmap, editor por fase, evolução, QA, ferramentas de engenharia, GLB e log. IDs de controles originais preservados.
- **Layout:** grade de desktop centralizada em largura máxima, painéis com bordas suaves e espaços definidos, barra superior fixa e áreas laterais roláveis; em notebooks duas colunas com painel de código abaixo, e em telas menores um fluxo vertical. Área central com preview ampliada e bem destacada.
- **Acessibilidade:** resumos navegáveis com teclado, foco visível, detalhes acessíveis e sem `open` inicial; rótulos claros. Código fonte e ações de exportação continuam expostos.
- **Cobertura automatizada:** novo `tests/studio-layout-focus.test.js` testa unicidade dos IDs, manutenção dos controles, componentes recolhíveis e ordem do fluxo principal; 4 testes da interface aprovados.
- **CI verificada:** GitHub Actions run `43848177323` (commit `6a1610c0451127022a153883ed3bfac8cb36db7d`) passou com **137/137 testes** e benchmark da arena executado. Falha anterior no sandbox de GLB (AbortController ausente) corrigida em `tests/glb-import.test.js`, sem alterar o runtime GLB.
- **Ajuste editorial posterior:** removida descrição longa e contagem estática de 29 referências na biblioteca; commit `8a968ed21a89307f52b75cb5a039b12cadf34184`. Esse commit exige confirmação própria da CI.
- **Não realizado:** inspeção visual real da tela em navegador/celular (capturas e teste com usuário), métricas de usabilidade e verificação manual de todos os acordeões. Não declarar QA visual concluído sem teste real.
- **Próxima etapa:** QA visual em 375px/768px/1366px, conferir overflow e prévia real com jogos gerados, melhorar descida para área de edição com acessibilidade e corrigir qualquer regressão observada.

## Engenharia — etapa 12b: validação robusta de GLB e backup visual (16/11/2026)

**Falhas identificadas:** o backup e o armazenamento local ignoravam os controles de qualidade gráfica 2D e estilo visual; o leitor GLB podia montar hierarquias cíclicas e aceitar transformações inválidas. A nova biblioteca de múltiplos GLBs verificava inicialmente apenas cabeçalho e metadados antes de armazenar.

**Implementado e publicado:** \`js/project-backup.js\` conserva \`graphicsQuality\` e \`visualStyle\`. \`js/glb-runtime.js\` verifica pais duplicados, ciclos, referências de nós e raízes, transformações finitas e valida malhas, índices, atributos e texturas sem precisar de Three.js. \`js/app.js\` aplica esta pré-validação antes de salvar novos assets no IndexedDB. Há testes em \`tests/project-backup.test.js\` e \`tests/glb-import.test.js\`.

**Validação:** checagem sintática de JavaScript antes de cada publicação; GitHub Actions \`43850704275\` (commit \`877e77ebac\`) e \`43850716944\` (commit \`6bb0a889c1\`) concluídos com sucesso, incluindo os testes e benchmark informativo da arena. A execução não equivale a QA visual em navegador real.

**Pendências:** testar modelos Meshy com texturas no Chrome e Android; medir consumo de memória com quatro GLBs de até 25 MB; ampliar suporte a animações, rigs e colisões sem comprometer motores 2D. Novas alterações paralelas ao repositório devem ser reavaliadas sobre o HEAD atual, sem sobrescrever arquivos.


## Engenharia — etapa 12: biblioteca multi-asset GLB 25 MiB e backup binário (16/11/2026)

**Problema real observado:** importação de apenas 1 GLB (até 1,2 MB) e armazenamento como base64 no projeto/backup JSON. Arquivos maiores sobrecarregariam o localStorage, impediriam reabertura e não permitiriam usar vários objetos ao mesmo tempo.

**Arquivos de implementação:**
- `js/asset-library.js` (novo): manifesto de até 4 GLBs, limite 25 MiB por arquivo / 50 MiB por projeto, IDs seguros, validação e operações binárias no IndexedDB.
- `js/app.js`: importar múltiplos arquivos, seleção individual, posição X/Z/escala, exclusão, persistência e carregamento assíncrono dos binários na prévia; exportação HTML e ZIP; backup ZIP com restauração dos GLBs em novo namespace de armazenamento.
- `js/generator.js` e `js/three-runtime.js`: incorporam múltiplos objetos decorativos GLB em cada fase, sem mexer nos comportamentos dos motores 2D/3D; mantém compatibilidade com o antigo `ASSET_CENARIO.b64`.
- `js/glb-runtime.js`: limite de 25 MiB, codificação de texturas por blocos, validação estática pré-importação de triângulos, índices e hierarquia; recusa ciclos e extensões não suportadas.
- `js/zip.js`: leitura de ZIP sem compressão com limite de tamanho, CRC32 e validação de caminhos; suporte a HTML grande nos projetos 3D.
- `js/project-backup.js`, `index.html`, `LEIA-ME.md`, `package.json`: manifesto versionado e ID persistente do armazenamento, controles novos e documentação.
- `tests/asset-library.test.js`, `tests/glb-import.test.js`, `tests/project-backup.test.js`: validação de manifestos, IndexedDB simulado, ZIP/CRC, exportação, múltiplos objetos instanciados em Three.js e ausência de regressões de opções gráficas.

**Verificação automatizada confirmada:** GitHub Actions `43850982361` no commit `2d9d57f2`: **146 testes aprovados, 0 falhas**, sintaxe dos módulos JS e `npm run bench:arena` concluídos. Os testes Node incluem o Three.js r180 real com renderizador substituto. Após atualizações de documentação, executar/confirmar novamente o workflow do HEAD.

**Limites honestos:** armazenamento IndexedDB depende da disponibilidade/quota do navegador; apenas o backup ZIP completo transporta arquivos binários entre dispositivos; GLBs continuam **objetos estáticos/decorativos**, não jogador/inimigo com rig, animações ou colisão; a prévia e o HTML único ainda incorporam modelos via base64 e podem gastar muita RAM com dezenas de MB. O leitor glTF limitado não suporta Draco/meshopt/extensões obrigatórias. Teste com arquivos Meshy reais, WebGL real e Android permanece pendente; GitHub Pages publicar não equivale a QA visual.

**Próxima etapa recomendada:** medir memória e latência ao importar 25 MiB num celular real e com vários modelos; separar transferência dos bytes da prévia do HTML para reduzir base64 em memória; preparar importação GLTFLoader completa, papéis de asset e AnimationMixer por estados antes de permitir substituir o jogador/inimigos.

## Engenharia — etapa 13: buffers tipados e cache por GLB (16/11/2026)

**Motivo:** o importador GLB criava arrays convencionais com todos os números dos vértices, copiados em seguida para um novo \`Float32BufferAttribute\`. Primitivas com o mesmo índice de material geravam múltiplas instâncias do material, e referências diferentes ao mesmo índice de textura acionavam carregamentos duplicados.

**Implementado:** \`js/glb-runtime.js\` usa \`Float32Array\` para posições/normais/UVs e \`Uint8Array\`/\`Uint16Array\`/\`Uint32Array\` para índices; os objetos \`BufferAttribute\` recebem esses arrays sem copiar de novo. Materiais são memorizados por índice por importação; texturas com mesmo índice têm um só carregamento e uma única referência, sem misturar materiais distintos. Índices normalizados são rejeitados no runtime.

**Cobertura adicionada:** \`tests/glb-import.test.js\` compara identidade dos materiais e texturas, número de carregamentos, tipos dos buffers e rejeição de índice normalizado. Verificação sintática em V8 concluída. GitHub Actions run \`43851747931\` **aprovado**: 153 testes passaram, zero falhas; sintaxe e benchmark informativo da arena também concluídos com sucesso.

**Escopo e limites:** foram eliminadas cópias/alocações desnecessárias no caminho de decodificação. Ganho exato de memória, pausas de GC, tempo de carga e FPS não foram medidos em browser real; a biblioteca continua limitada aos modelos GLB estáticos e o carregamento ainda é síncrono. Manter testes de todos os motores e fazer perfil Chrome/Android com arquivos 3D reais antes de anunciar melhora numérica.

## Interface — etapa 12: navegação móvel e ordem acessível do editor (16/11/2026)
- **Objetivo:** tornar o layout mais direto em smartphones e notebooks, preservar a prévia central e evitar excesso de controles na tela.
- **Arquivos alterados:** `index.html`, `css/app.css`, `js/app.js`, `tests/studio-mobile-navigation.test.js`, `tests/studio-layout-focus.test.js` e este checkpoint.
- **Navegação:** cabeçalho móvel com quatro links `Ideia / Criar / Jogar / Código` apontando para âncoras únicas; botão `Continuar para criação` no editor do GDD; `scroll-margin-top` acomoda a barra fixa e foco por teclado continua visível.
- **Fluxo de criação:** ao gerar com sucesso em telas <=780px, `js/app.js` conduz à prévia; respeita a preferência `prefers-reduced-motion`. No desktop, não força a rolagem.
- **Responsividade:** cabeçalho mais compacto até 400px; correção de `fullscreen` para utilizar `100dvh` sem altura fixa herdada do contêiner.
- **Acessibilidade:** blocos avançados da coluna esquerda reorganizados **no DOM**, não apenas com `flex order`. Isso corrige a divergência entre ordem visual e ordem de foco e impede que o link `Continuar` fique no começo do painel.
- **Preservação de funções:** os IDs e controles existentes (GDD, presets, backups, editor de fases, assets, exportação) foram mantidos; não houve alterações nos motores de geração de jogos.
- **Testes novos/atualizados:** links e seus destinos, unicidade de IDs, área central antes das ferramentas, responsividade e fullscreen, movimento reduzido, ordem do DOM e inexistência de CSS `order` para os campos.
- **Validação confirmada:** GitHub Actions **run 43851648160**, commit `1156ec5ad510624f670e07b44597628184208dc7`, **151 testes aprovados / 0 falhas**, benchmark da arena concluído.
- **Limitação:** validação estrutural automatizada, não capturas visuais nem navegação manual real em Android, iOS ou notebook; essas verificações permanecem pendentes.
- **Próximo:** QA visual em Chrome e smartphone real, observar foco da navegação fixa, prévia e possíveis rolagens horizontais; ajustar com base no resultado.

## Engenharia — etapa 13: relógio físico unificado dos motores 3D e de naves 2D (16/11/2026)

**Diagnóstico:** `js/three-runtime.js` usava `dt` variável limitado a 35 ms para atualizar movimentos, projéteis, inimigos, física e missões. O motor separado `js/shooter-runtime.js` tinha o mesmo problema. Em telas de 30/60/120 FPS, a simulação podia avançar quantidades diferentes de tempo e ter comportamentos distintos de jogabilidade.

**Arquivos modificados:**
- `js/three-runtime.js`: `simulate(SIM_DT)` desacoplada da renderização; taxa física de 60 Hz, acumulador de passos, no máximo cinco substeps por quadro e limite de entrada de 250 ms. Pausa e reinício descartam acúmulos. Telemetria `simulationHz` e `simulationSteps`.
- `js/shooter-runtime.js`: mesma política de passo fixo para naves 2D, limite de backlog, limpeza em pausa/intermissão/reinício e telemetria. Medição de FPS gráfico segue baseada nos intervalos reais de renderização.
- `tests/three-world.test.js`: harness com intervalos configuráveis; testes para todos os cinco gêneros do motor 3D (arena, FPS, RPG, corrida, plataforma) a 30/60/120 FPS, equivalência de deslocamento, pausa, salto de 20 segundos de uma aba suspensa e reinício.
- `tests/shooter-fixed-step.test.js` (novo): harness de Canvas/DOM simulado para naves 2D; valida relógio, deslocamento e número de passos nos três FPS, proteção após intervalo de 20 segundos, pausa/retomada e restart.
- Este checkpoint.

**Publicação:** `775bd09ef1ba8bdb5d229198f29b24ac339c9a99` (runtime 3D), `9daa74688306d1e8bbf8ecd8d5c153ecc0e82ce8` (testes 3D), `c19e1f198db4b6a5b7053ff81b2b478f3b3a6b85` (runtime de naves 2D) e `81f4f171bbbe3dc6d09d2420364b82548d57f138` (testes de naves).

**Execução confirmada:** GitHub Actions **run 43854030736**, job **133253571489**, commit `81f4f171bbbe3dc6d09d2420364b82548d57f138`, **164/164 testes aprovados, zero falhas**; sintaxe JavaScript e benchmark informativo da arena também passaram. A suíte usa Three.js real com renderizador simulado para Node, não substitui teste WebGL real.

**Compatibilidade:** mantidos controles existentes, modos de renderização e serialização do runtime nos arquivos `game.js` exportados. As políticas anti-stall descartam simulação excedente após mais de cinco passos: isso protege o jogo de travamentos, mas significa que o relógio do jogo não precisa avançar o mesmo que tempo real durante lentidão extrema.

**Pendências:** realizar QA manual em Chrome/Android, coletar métricas de frame time e quedas de FPS com WebGL real, validar qualidade visual/câmera em 120 Hz e testar gamepad. Evitar extrapolar resultado automatizado para ganho numérico de FPS.


## Engenharia — etapa 13: ampliação dos motores 3D e interpretação de ideias (16/11/2026)

**Origem do bug:** tela do usuário mostrava "Estilo não compatível com 3D" ao pedir "criar um game de navinha" enquanto o navegador mantinha um GDD de GOLDENEYE 007. `js/parser.js` reconhecia `shooter`, mas `styles['3d']` não tinha esse gênero. A geração 3D existente ainda limitava o runtime a arena, FPS, corrida e plataforma. O GDD antigo e a ideia recente apontavam para estilos diferentes.

**Entrega técnica:**
- `js/parser.js`: suporte explícito a `shooter` e `rpg` em 3D; prioridade ao pedido recente de criação do gênero quando a seleção está em detecção automática; avisos explicativos quando o GDD descreve outro gênero; erro específico para gêneros ainda sem runtime.
- `js/shooter-3d-runtime.js` **novo**: motor procedural dedicado com naves e inimigos low poly em Three.js offline, movimentação X/Z, tiros de jogador e inimigos, ondas, boss com 3 estados de combate, coleta de power-ups, 3 níveis de tiro, saúde, HUD, progressão entre fases, pausa/restart, controles touch e telemetria QA. Não reaproveita apenas a lógica de combate da arena.
- `js/three-runtime.js`: caminho RPG 3D com XP por eliminações, evolução de níveis com aumento do dano mágico e poções de cura, mantendo exploração e objetivos de portal.
- `js/generator.js`: escolhe o motor próprio de shooter 3D e continua gerando o 2D antigo; motores 3D não exigem boot do motor 2D.
- `index.html` e `js/app.js`: exemplos Navinha 3D e RPG 3D; botão "Usar esta ideia como novo GDD" para criar novo projeto quando o GDD salvo não condiz com a descrição; mensagem de conflito clara e confirmação ao substituir GDD longo.
- `tests/shooter-3d.test.js` e `tests/expanded-generator.test.js`: simulação com Three.js real em test harness, movimento, tiro, pausa/restart, compilação de jogo autônomo e teste de incompatibilidade genuína.

**Resultado verificado:** execução GitHub Actions `43854140712`: **164 testes aprovados, 0 falhas**, sintaxe e benchmark de arena executados; publicação GitHub Pages `43854140495` concluída. Testes antigos de motores 2D e 3D incluídos na suíte. Atualizações posteriores de versão/documentação requerem confirmação do HEAD.

**Limites não ocultados:** criação livre de lógica inédita por IA no modo estático não existe; RPG 3D tem progressão inicial e não inclui crafting/inventário completo; shooter 3D usa objetos procedurais e padrões programados, não gera automaticamente modelos a partir de textos. Sem QA visual WebGL real/Android e sem benchmark de FPS em dispositivos. Outros gêneros 3D como Tower Defense ainda exigem motores próprios.

**Próxima fase:** testes visuais dos dois gêneros novos em PC e celular, ergonomia do editor e câmera do shooter, integração de assets como jogador e inimigo animado, e sistema de eventos/quests por fase a partir de GDD estruturado.

## Engenharia — etapa 14: personagens 3D articulados, reação a dano e perseguição sem aglomeração (16/11/2026)

**Diagnóstico:** os humanoides procedurais no motor 3D tinham apenas quatro membros com oscilação simples; `animateActor` deslocava a posição Y do grupo inteiro durante cada atualização, dificultando garantir pés ancorados. Inimigos de arena/FPS/RPG perseguiam o jogador apenas por vetor direto, podendo se sobrepor sem separação de vizinhos. Ataques e acertos não geravam reação no rig; a arma de FPS não tinha recuo visual.

**Implementação publicada:**
- `js/world-rules.js`: função pura `crowdDirection(actor,target,actors,spacing)` combina perseguição normalizada e afastamento local, com desempate determinístico para pares coincidentes, ignorando inimigos já eliminados. Mantém `moveCircle` para respeitar obstáculos e limites existentes. Integração no runtime serializado para exportação offline.
- `js/three-runtime.js`: agrupamento `upperBody` da cabeça/tronco/braços com pernas independentes. `animateActor` agora calcula poses absolutas de caminhada, respiração, ataque e impacto; não acumula deslocamento vertical no personagem. Inimigos recebem IDs estáveis e `stagger` curto após disparos, aplicam separação local e animam conforme a velocidade efetivamente percorrida. A arma FPS tem recuo e recuperação gradual atrelados ao disparo. Plataforma, corrida e shooter 3D conservam seus sistemas próprios; mudanças de personagens concentram-se em arena/FPS/RPG.
- `tests/three-crowd-steering.test.js` (novo): direção normalizada, simetria/determinismo na sobreposição, ignorar inimigos distantes e mortos, dispersão durante perseguição.
- `tests/three-world.test.js`: testes com Three.js real e renderizador WebGL simulado verificando movimento dos membros, ataque, reação ao impacto, estabilidade vertical, recuo e recuperação da arma FPS.
- `tests/mission-objectives.test.js`: atualização de expectativa do teste de campanha para permitir configuração vazia `{}` em fases não alteradas; não muda regras de missão. Foi necessário por evolução paralela de serialização que provocava falha em CI.

**Commits:** `3523b2b2709a42421a4ea609701678516d501976` (separação pura); `4a3ea04403458ed3d4fbbd447f95a4b4bafc2f3e` (rig e IA de combate); `08a2938ea1eda2570eac64f87f4392d24a30b641` (testes de direção); `ff025366b4784462ef363620df74eedbaff985f6` (testes de rig); `ab2d207ad6992f7f39cd4e28b9cae8a2a9ef402e` (recuo FPS); `ede0585c8a886ecb4cac38deeb7c31265c71e21f` (teste de recuo); `08dc771d4a700a6799842a6ac76b2a8c45d9aea1` (teste de campanha compatível).

**Validação confirmada:** GitHub Actions **run 43856289351**, job **133261273486**, commit `08dc771d4a700a6799842a6ac76b2a8c45d9aea1`: **171 testes aprovados / zero falhas**. Sintaxe JavaScript e benchmark informativo da arena também passaram. A suite cobre outros motores e exportação sem CDN.

**Limitações e pendências:** esta atualização anima personagens gerados proceduralmente, não transfere rig/animações automaticamente de GLBs importados; personagens GLB continuam exigindo um pipeline de `AnimationMixer`, mapeamento de estados e adequação de esqueleto. Separação de inimigos é local e usa até O(E²) com limite atual de inimigos; medir custo antes de elevar os limites. Não há perfil de FPS nem verificação visual em WebGL real/Android. Próximas etapas: QA visual, controle de animações de assets externos, esquiva/melhoria de comportamento dos inimigos, reforçar estados de gameplay e testes em dispositivo.

## Engenharia — etapa 15: classificação automática do gênero pelo GDD (16/11/2026)

**Problema relatado:** o GoldenEye 077 aparecia como jogo de nave. Foi consultado o GDD completo `jogoiarexx-blip/goldeneye-077/GOLDENEYE_007_REMASTER_GDD_COMPLETO_v1_0.md` (cerca de 71,6 mil caracteres). O documento descreve explicitamente `FPS tático de espionagem`, câmera em primeira pessoa, mira, guardas, armas e missões. Menções ocasionais a aeronaves, corrida a pé, pular cinematics e plataformas de cenário não definem o gênero principal.

**Causas localizadas:**
- `js/parser.js` usava ocorrências de palavras com pesos por frequência e não distinguia sinais de gênero de itens ocasionais; `nave` podia ser capturada dentro de `aeronave`. `caminhada`, `pular` e `plataforma` eram contados como corrida/platformer.
- `js/app.js` restaurava configurações de `game-style`/`game-dimension` de projeto anterior, e o evento de importação de outro GDD não limpava as escolhas. O comando complementar antigo também permanecia.
- A dimensão era determinada antes de classificar o gênero e podia escolher 2D para um FPS descrito apenas por título e jogabilidade, provocando fallback silencioso para arena.

**Correções publicadas:**
- `js/parser.js`: substituição do classificador de contagem por sinais contextualizados/ponderados (`detectGenreInfo`) de câmera, mecânica e estilo, sem confundir taxa de quadros `60 FPS` com o gênero FPS. Busca no início e no restante do GDD; expõe gênero inferido, sinais e confiança. Mantém suporte a RPG, plataformas, corrida, nave 2D/3D e três modos de Tower Defense. Detecta FPS 3D pela jogabilidade mesmo sem a palavra `3D`. Impede trocar silenciosamente um motor incompatível por arena; apresenta erro de compatibilidade.
- `js/app.js`: ao importar um novo arquivo .md/.markdown, substituí-lo inteiro por colagem extensa ou criar um GDD novo por comando, a dimensão e o gênero retornam a `Detectar pelo GDD` e o comando de projeto antigo é limpo; preferências manuais posteriores continuam disponíveis, com aviso explícito quando discordam do documento. Não usa o `GAME_SPEC` de um jogo gerado anteriormente quando o documento ativo é diferente. O diagnóstico mostra gênero inferido, confiança e sinais.
- `tests/gdd-genre-detection.test.js` (novo): nove testes de FPS GoldenEye com elementos secundários conflitantes, título/espionagem sem `3D`, navinha 2D e 3D com requisito de 60 FPS, falso positivo `aeronave`, plataforma/corrida, override manual e reinício de detecção na importação.
- Ajustes menores de compatibilidade com regressões existentes de plataforma/corrida e mensagens de motor 3D incompatível foram feitos para que os testes antigos continuem relevantes.

**Validação confirmada:** GitHub Actions **run 43858628707**, job **133269301989**, commit `20a74282a336d8178174c71979cea65c5107ce45`: **196/196 testes aprovados, zero falhas**, sintaxe JavaScript e benchmark da arena aprovados. Os testes do GoldenEye usam uma versão resumida representativa do GDD; o documento completo de 71,6 mil caracteres foi inspecionado via GitHub, sem afirmar que cada uma de suas linhas foi executada como teste unitário.

**Limites:** identificar corretamente FPS 3D seleciona o runtime apropriado, mas não implementa automaticamente toda a espionagem, IA, cutscenes e missões específicas do GDD no gerador offline. Escolhas manuais explícitas ainda prevalecem, acompanhadas de alerta. Falta teste em navegador real/Android e avaliação com um catálogo maior de GDDs para medir confusão entre gêneros, inclusive pedidos híbridos.


## Engenharia — etapa 14: compilador de GDD e comandos em linguagem natural (16/11/2026)

**Objetivo solicitado:** melhorar o entendimento de instruções escritas para transformar **um GDD completo ou um comando simples** em configurações reais do jogo, e permitir modificações futuras por linguagem natural. A versão de entrega é **v0.20.0**.

**Diagnóstico prévio:** `js/parser.js` selecionava o gênero via padrões e permitia criar protótipos, mas não convertia números e descrições por fase em regras executáveis. `js/app.js` bloqueava pedidos sem GDD. O fluxo incremental de `js/development-engine.js` reconhecia apenas alguns comandos relativos (mais difícil, mais rápido etc.), sem aceitar quantidades absolutas nem vários ajustes de fases em uma frase. Relatórios não separavam claramente regras implementadas de funcionalidades inexistentes.

**Arquivos alterados nesta etapa:**
- `js/intent-compiler.js` (novo): identifica especificações de número de fases, ondas, inimigos, voltas, chefes, duração/objetivo de missão, ambientação global e por fase, texto de HUD, velocidade, cadência e dificuldade; respeita prioridades do pedido recente, limites e configuração isolada por fase. Produz `GAME_SPEC.stageConfig`, `GAME_SPEC.tuning` e relatório estruturado `implementation.applied/pending/warnings`. Não executa o conteúdo enviado pelo usuário.
- `js/parser.js`: liga o compilador a `parseGdd()`, aceita texto sem GDD, cria título inicial para comandos diretos, melhora instruções para backend de IA e preserva conflito entre GDD salvo e criação de outro gênero. As melhorias paralelas de detecção de FPS, corrida e plataformas tiveram regressões corrigidas.
- `js/app.js`: permite criar jogo quando só há um comando, mostra resumo de regras compiladas e pendências em seção expansível, exporta comando original e relatório de interpretação. O backend opcional recebe rascunho inicial quando não há GDD.
- `js/generator.js` e `js/project-backup.js`: relatório de geração distingue o que está no código de funcionalidades pendentes; backup permite `COMANDO_ORIGINAL.md` e `PLANO_INTERPRETACAO.md`, mantendo versões anteriores compatíveis.
- `js/development-engine.js`: aplica mudanças de linguagem natural a jogos existentes (como seis inimigos na fase dois, quantidades de ondas e chefe somente na última) sem substituir runtime. Mantém o comportamento incremental antigo.
- `js/campaign-editor.js`: ondas editáveis para navinha 3D e missões programadas de RPG 3D; não marca uma missão como implementada se o código antigo não contém o runtime.
- `js/shooter-3d-runtime.js`: utiliza os temas de fase interpretados do GDD.
- `tests/intent-compiler.test.js`, `tests/intent-evolution.test.js`: cenários de criação, GDD grande, prioridades, limites, pendências, código exportado e edição incremental.

**Teste verificado:** execução GitHub Actions `43858628707` no commit `20a74282`: **196 testes passaram, 0 falhas**. A suíte inclui regressões dos motores 2D e 3D, edição de missões e testes do compilador, além do benchmark de colisões do projeto. Testes em WebGL de navegador real e Android não foram alegados. A suíte foi ajustada para preservar antigos contratos de missão; falhas intermediárias foram corrigidas.

**Restrições de interpretação:** esta etapa é um compilador determinístico de requisitos suportados. Não inventa IA de inimigos, multiplayer, animações esqueléticas ou árvores de habilidades; tais recursos ficam pendentes. “Objetivo: ...” em texto livre é só um rótulo de HUD, não uma condição programada de vitória; sobrevivência, coleta e eliminação possuem condições programadas nos motores compatíveis. O relatório `implementation.applied` reflete alterações de configuração, mas teste de gameplay e revisão manual seguem essenciais.

**Próxima etapa:** melhorar inferência contextual para documentos longos e instruções contraditórias, incluir assistente opcional de IA para gerar módulos novos mediante validação de testes, criar mapeamento entre entidades citadas no GDD e assets GLB, e executar QA visual real em navegadores e dispositivos móveis.


## Engenharia — etapa 15: GDD → mecânica jogável de loja e evolução de armas (16/11/2026)

**Objetivo:** evoluir além do catálogo de palavras-chave da v0.20 e compilar um pedido como “FPS 3D com loja para comprar munição, curar vida e melhorar armas” para um sistema real de jogo, preservando motores antigos.

**Subsistema escolhido:** combate e inventário simplificado de FPS 3D, para comprovar compilação de mecânicas com estado, ações reais, interface e auditoria de requisitos. Esta fase não tenta inventar módulos arbitrários por IA no GitHub Pages.

**Implementação e arquivos:**
- `js/combat-economy.js` (novo): factory isolado, determinístico e testável de moedas, reserva de munição, custo de cada compra, kits médicos, melhorias de dano/cadência, inventário reduzido e histórico de 12 transações. Limites de custo, reserva, créditos e evolução; não executa JS arbitrário nem transaciona dinheiro real.
- `js/intent-compiler.js`: identifica pedidos de loja de munição/vida/armas, preços explícitos, créditos e reserva inicial no GDD/comando; registra `GAME_SPEC.combatEconomy` e estados `applied/pending`. Suporte **somente FPS 3D**; outros gêneros mantêm a pendência em vez de fingir loja genérica.
- `js/three-runtime.js`: munição com pente de 20 balas e reserva consumível no FPS opt-in, tecla R para recarga, créditos por inimigo (20) e chefes (90), pausador da loja (B), menu acessível por clique/toque, compra 1/2/3 com validação, aplicação de cura e dano real a cada tiro, HUD e telemetria. Créditos e melhorias duram toda a campanha; reinício reseta o estado. Sem loja, permanece a recarga automática antiga.
- `js/generator.js`: inclui o código completo da factory no `game.js` offline para FPS 3D; assim, um FPS v0.21 pode habilitar a loja incrementalmente sem rebuild do runtime. Não adiciona dependências externas de rede.
- `js/development-engine.js`: permite habilitar/configurar a loja em projetos FPS com runtime compatível; rejeita alteração de arquivos gerados por versões antigas sem o contrato da loja.
- `index.html`, `js/parser.js`, `package.json`, `js/project-backup.js`: registro do módulo, catálogo de economia no FPS 3D e versão v0.21.
- `tests/combat-economy.test.js`: estados da loja, recusa de compras sem dinheiro, cura máxima, reserva, evolução, preços escritos, geração offline, ativação incremental, proteção de projeto antigo e simulação 3D com menu e recarga reais.

**Validação automatizada:** GitHub Actions `43860904541` completou com **203 testes aprovados e 0 falhas**. Foi encontrada e corrigida uma regressão no serializador que havia escrito escapes de quebra de linha incorretos; suíte geral voltou a verde após a correção. No teste funcional novo, a reserva consumida é proporcional às balas faltantes, e não um pente fixo.

**Limitações e próximos passos:** sem persistência após refresh, salvamento só no estado da campanha; modelos procedurais e três níveis de dano, não três armas físicas diferentes. A economia é um exemplo de módulo suportado, não IA geradora ilimitada. Foi acrescentado um mecanismo anti-softlock: se pente e reserva estiverem vazios e o jogador não puder comprar munição, o motor libera 6 tiros emergenciais a cada 20 segundos de simulação, sem criar créditos; o inventário contabiliza as concessões. Ainda é preciso realizar QA visual real no navegador/celular e validar o equilíbrio de recursos. Futuro: geração opcional de módulos novos por backend IA com `proposal/diff`, build isolado, testes de sintaxe, smoke tests e aceite explícito, seguido de integração com assets animados de armas/itens.


## Engenharia — etapa 16 / GF-001: gate de publicação GitHub Pages (16/11/2026)

**Status: EM REVISÃO, não VALIDADO.** O plano mestre `docs/PLANO_MESTRE_GAMEFORGE.md` marcou GF-001 como P0 porque o Pages vinha publicando commits mesmo com testes em vermelho. Uma mudança de workflow não altera a configuração anterior do Pages automaticamente.

**Implementado:**
- `tools/pages-gate.cjs`: autoriza somente `workflow_run` concluído com sucesso, disparado por push em main do mesmo repositório, sem PR/fork e com SHA idêntico ao checkout.
- `.github/workflows/publish-verified.yml`: workflow de publicação acionado pela conclusão de `Validar GameForge Studio`, com guarda redundante, checkout de SHA verificado, comparação com HEAD atual da main, empacotamento somente dos arquivos estáticos, publicação com `actions/deploy-pages`.
- `tools/verify-exports.cjs`: valida todos os gêneros 2D/3D previstos em `parser.styles` e FPS com loja; verifica script principal, dependências locais, ausência de URLs de script remoto e sintaxe de `game.js`.
- `.github/workflows/verify.yml` e `package.json`: `npm run verify:exports` agora obrigatório na CI antes de concluir validação.
- `tests/pages-gate.test.js`: rejeição de CI falha, PR/fork, SHA incorreto, script remoto, dependência ausente e JS inválido; teste de ordem das etapas.
- `docs/PUBLICACAO_VERIFICADA.md`: guia de migração obrigatória, como verificar e como reverter uma versão ruim sem contornar testes.

**Evidência:**
- Run `43869508568` para o commit `d69f34e7`: **210 testes aprovados, 0 falhas**, `verify:exports` confirmou **15 variantes e 623.744 bytes de JS compiláveis**.
- O workflow `Publicar GameForge verificado` já concluiu uma publicação verde na run `43869000500` (commit `14eadf15`). Execuções para SHA que deixou de ser o HEAD da main foram intencionalmente barradas, por exemplo run `43868905493`.
- Os testes negativos locais simulam falhas de CI e export sem enviar JS quebrado à main. O fluxo **ainda não foi provado como gate exclusivo** porque a rota anterior `pages build and deployment` continuou publicando durante testes vermelhos (ex.: commit `ea865845`).

**Dependência de configuração externa para conclusão:** em **Settings → Pages → Build and deployment → Source**, selecionar **GitHub Actions** em lugar de publicação direta da branch. As ferramentas GitHub disponíveis não permitem mudar a configuração Pages. Só marcar GF-001 como VALIDADO depois de confirmar que a rota antiga deixou de promover commits e que um commit com falha fica fora do site. Consulte `docs/PUBLICACAO_VERIFICADA.md`.

**Próximo ID:** GF-002 (matriz de inicialização, preview e exportação de todos os gêneros, incluindo GLB/ZIP em ambiente de browser), depois GF-003/004. A geração de novos módulos por IA permanece dependente de auditoria do backend real e revisão de alterações antes de execução.

## GF-001 — Iteração de fechamento do gate (16/11/2026)

**Estado: EM REVISÃO (depende de alteração administrativa no GitHub Pages). Não avançar como VALIDADO.**

- **Código:** `.github/workflows/publish-verified.yml` confere o SHA atual de `main` antes de empacotar e novamente antes de `deploy-pages` (commit `9d05132c9824075118e68fff652e1bcd7e5f7eaa`). `tests/pages-gate.test.js` agora verifica as duas barreiras e a ordem dos passos (commit `f6515aa671be2f8019491527cba7455380408a31`).
- **Evidência positiva:** CI [43872156355](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43872156355) aprovou a versão com testes do gate reforçado (commit `f6515aa6`); a validação de sintaxe, exportações e benchmark compõe o fluxo.
- **Evidência negativa real:** CI [43871603100](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43871603100) falhou e o workflow verificado [43871658520](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43871658520) ficou pulado, **mas** o deploy antigo de branch [43871602779](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43871602779) publicou o mesmo SHA. Logo, o bloqueio global **não está completo**.
- **Ação obrigatória pelo administrador:** `Settings → Pages → Build and deployment → Source → GitHub Actions`. Confirmar que não existe mais `pages build and deployment` promovendo código de branch; somente `Publicar GameForge verificado` pode publicar após CI verde.
- **Segurança:** não tentar simular a falha com código quebrado na `main` enquanto a rota antiga existir; usar `tests/pages-gate.test.js` e branches de teste. Documentação e rollback em `docs/PUBLICACAO_VERIFICADA.md`.
- **Dependência da etapa:** GF-002 pode ser preparada, mas a tarefa GF-001 só é concluída quando a configuração Pages tiver sido trocada e observada uma publicação limpa do mesmo commit.
- **Trabalho paralelo observado:** execuções de CI mais novas estavam falhando em testes de corpus de GDD (GF-003), área distinta; enquanto não ficarem verdes, não publicar novas versões por fora do gate.


## GF-003 — Aprendizado a partir dos repositórios reais de jogos (16/11/2026)

**Estado: EM REVISÃO**, conforme `docs/PLANO_MESTRE_GAMEFORGE.md`. Detalhamento completo em `docs/AUDITORIA_GDD_JOGOS_GF003.md`.

**Objetivo:** utilizar os GDDs e códigos-fonte reais dos jogos da conta do proprietário para reduzir detecções erradas e orientar a construção de motores sem importar indiscriminadamente os projetos.

**Escopo realmente inspecionado:** API GitHub listou 94 repositórios acessíveis (não todos jogos); foram verificadas árvores de 15 projetos e consultadas fontes concretas de pelo menos 10 jogos. Houve timeout ao tentar árvore de Operacao-eden nesta sessão. Não afirmar que 94 projetos foram auditados profundamente.

**Erros reproduzidos antes da mudança, com textos originais abertos via GitHub:**
- `Brinquedo-x-pesadelos-/GDD.md`: reconheceu lane-defense, mas acusou 3D por causa do trecho negativo “sem câmera 3D”.
- `Godfather/GDD_GODFATHER_COMPLETO.md`: inferiu FPS por menções a taxa de quadros, apesar da perspectiva superior e Canvas 2D.
- `Carga-pesada/source/docs/CARGA_PESADA_GDD_AUDITORIA_v1.0.md`: inferiu FPS pelo desempenho, em lugar de direção/corrida de caminhões 3D.
- `Asas-de-Brumaria/README.md`: sinais de shooter aéreo confundiam a aventura 3D com voo e dragões.
- `Folclorevania/README-v3.0.md`: era reduzido a arena em vez de plataforma/metroidvania 2D.
- `goldeneye-077/GOLDENEYE_007_REMASTER_GDD_COMPLETO_v1_0.md`: já detectava FPS 3D, mantido como regressão obrigatória.

**Implementado em código:**
- `js/game-corpus.js` (novo) com 10 jogos, caminho/URL real e resumo autoral da técnica de engenharia, limitações explícitas e identificação de título com exclusão de “inspirado em”.
- `js/parser.js` reequilibra palavras de câmera, fretes, corrida, plataforma, aventura de voo, distingue gênero FPS de taxa de quadros, desconsidera negações de 3D e revela ambiguidades; fonte reconhecida inclui link verificável.
- `js/repository-knowledge.js` ganhou 6 referências auditáveis de GoldenEye, Godfather, Folclorevania, Brumária, Neon Sky Force e Grim Grove com técnica e teste recomendado.
- `js/intent-compiler.js`, `js/app.js` e contrato da IA opcional passaram a exibir exemplos técnicos e o que **não** foi importado/implementado automaticamente.
- `tests/game-repository-corpus.test.js` testa 10 briefs parafraseados, FPS de desempenho, gênero misto, escopo negativo de câmera, referência “inspirado em” e fontes; `tests/test_studio_web.js` importa o runtime 3D para o caso Carga Pesada.

**Avaliação direta realizada:** repetida a interpretação com **seis arquivos completos** do GitHub, comparando gênero e dimensão antes/depois. Resultado depois: **6/6 classificações-base corretas** (GoldenEye FPS 3D, Brinquedos linha 2D, Godfather arena 2D, Carga Pesada corrida 3D, Folclorevania plataforma 2D, Brumária aventura/arena 3D). A amostra não representa toda a conta nem prova geração integral de todos os sistemas.

**Evidência automatizada:** GitHub Actions [43872320261](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43872320261), commit `2f1e7bf8`, **218 testes aprovados, 0 falhas**; também validou 15 variantes de exportação. Execuções posteriores com ajustes de documentação/interface requerem conferência por SHA na conclusão do HEAD. Os testes Node não são QA visual de WebGL nem de comportamento completo dos jogos.

**Limites:** o GameForge continua com motores parciais e capacidade determinística. O exemplo de habilidades de Folclorevania não gera automaticamente uma árvore; o GDD do Godfather não implementa cidade livre; GoldenEye exige novos objetivos interativos; Brumária não entrega automaticamente animações de dragão. Não copiar assets nem conteúdo sujeito a direitos de terceiros. Não chamar padrões do catálogo de funcionalidades implementadas.

**Próximo:** expandir benchmark para mais GDDs reais (tipos híbridos, múltiplas perspectivas e negações), validar UI e QA real em navegador, e avançar **GF-004** com manifesto de capacidades executáveis por gênero para converter referências técnicas em módulos próprios testados. GF-001 continua dependente de migração administrativa da fonte Pages; não considerar gate exclusivo enquanto rota antiga de branch permanecer.

## GF-002 — Matriz offline de inicialização, reexportação, ZIP e GLB (16/11/2026)

**Estado: EM REVISÃO.** A geração e a inicialização estão validadas em Node/VM; falta conferir a interface e os jogos em navegador real, sem rede. GF-001 continua EM REVISÃO porque a rota antiga de Pages por branch permanece ativa.

**Problema:** validar apenas sintaxe JS não garantia que os jogos iniciassem, que os ZIPs preservassem arquivos ou que GLBs fossem carregados.

**Implementação:** novo teste em tests/export-boot-matrix.test.js cria e inicializa todos os **14 pares gênero/dimensão** declarados no parser, além do FPS 3D com loja. Executa o game.js exportado em ambiente isolado, carrega engine-3d.js real com WebGL simulado, testa Jogar, frames, controles e Pausar. Cada ZIP é gerado e reaberto, com verificação byte a byte dos arquivos, motor e licença. Uma malha GLB válida é colocada em ASSET_LIBRARY.json + arquivo binário e verificada no cenário 3D após desempacotar, incluindo posição e escala. Uma campanha com fases modificadas é reexportada e inicializada novamente.

**Commits:** 84ba74767c59d1dc9779180e0927324cbed0faf3 (matriz), f05403ba3679ab1b5af88d4a7c18b7bc845051f0 e 10bc2a8cf05f276f827a8acd0a12cda9e9c5ae9d (mocks DOM mais completos), 5bf107e20f9652c206387fb6955c3ba9441574ca (GLB e reexportação). As falhas intermediárias foram dos mocks da DOM e da atualização de telemetria, sem alterar os motores.

**Evidência:** GitHub Actions run https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43874026698, commit 5bf107e20f9652c206387fb6955c3ba9441574ca, **237 testes aprovados, zero falhas**. Pré-validação confirmou **15 variantes, 624.821 bytes de JS gerado sintaticamente válido**. Benchmark de arena passou.

**Limites:** o teste Node não equivale a Chrome, Android ou WebGL real. A edição foi validada por reexportação do spec alterado, não por cliques no editor do Studio. O GLB testado é estático; rig/animações permanecem tarefas GF-015/GF-016.

**Para concluir GF-002:** Playwright em navegador real deve abrir todos os HTMLs com scripts defer e sem CDN, validar preview srcdoc, editor, exportação/reimportação, logs, controles e execução offline. Registrar capturas, versão e SHA antes de mudar o estado para VALIDADO. A rota legada de Pages ainda precisa ser desativada administrativamente para concluir GF-001.



## GF-004 — Contrato verificável de GDD e geração (16/11/2026)

**Estado: EM REVISÃO.** Detalhamento em `docs/GF004_CONTRATO_CAPACIDADES.md`.

**Problema:** o GameForge confundia mudança de parâmetro com mecânica implementada, não apontava linhas do GDD nem rejeitava todas as combinações incompatíveis. Também confundia restrições "sem multiplayer/crafting" com pedidos e podia sobrescrever o temporizador de sobrevivência de 60 segundos com uma linha de rótulo do HUD. A evolução incremental aceitava missões em projetos legados sem a função `R.missionReady()`.

**Implementado:** `js/game-capabilities.js` define capacidades e evidências por motor 2D/3D; `js/intent-compiler.js` gera `implementation.audit` com quatro estados, origem e linha quando localizáveis, respeita exclusões e prioridade do comando mais recente, e preserva o temporizador configurado. `js/generator.js` impede exportar GAME_SPEC incompatível e inclui `CONTRATO_CAPACIDADES.md` e `CAPACIDADES.json`. `js/app.js` exibe estados e evidências no painel de análise, `js/project-backup.js` preserva os novos arquivos, e `js/development-engine.js` bloqueia missões novas em runtimes legados sem lógica de objetivos.

**Testes:** `tests/game-capabilities.test.js` cobre compatibilidade, fonte, HUD/sobrevivência, negativas, loja FPS funcional, backup, documentos extensos e rejeição de configurações inválidas; `tests/intent-evolution.test.js` inclui caso de motor legado sem objetivos. Não equivale a QA visual ou geração arbitrária de IA.

**Progresso/limites:** `implementada` é reservado a módulo conhecido com teste, `configurada` a parâmetros existentes, `pendente` a código novo faltante e `incompatível` a opção não suportada. A origem é marcada "Não localizada" se não houver evidência. Conferir CI do último SHA antes de promover a etapa a VALIDADO. GF-001 ainda depende da escolha administrativa GitHub Actions como origem do Pages.

**Próximo:** GF-005 (persistência, GLB e backup em navegador real) após GF-002; novas mecânicas baseadas no acervo deverão seguir esse contrato.

## GF-002 — Fechamento: HTML e ZIP reais em Chromium (16/11/2026)

**Estado: VALIDADO no escopo de CI/Chromium.** Esta seção substitui o estado "EM REVISÃO" das etapas anteriores de GF-002; as limitações externas seguem como tarefas separadas.

**Arquivos publicados:**
- `tools/build-browser-fixtures.cjs` prepara cada um dos 14 projetos exportados, seus HTML/JS/CSS, bibliotecas 3D e ZIPs criados por `GameForgeZip`.
- `tests/browser-export-matrix.py` extrai cada ZIP com `zipfile`, compara todos os arquivos byte a byte e abre os 14 `index.html` **reimportados** em Chromium por HTTP local. Verifica menu, Jogar, frames, teclado, pausa, ausência de erros JavaScript e ausência de downloads remotos. Executa `2d-arena` e `3d-fps` também a 390 px e rejeita rolagem horizontal.
- No Studio real, importa um GDD de teste, seleciona motor na seção expansível, cria, abre a prévia no iframe, inicia o jogo, edita `game.js`, aplica alteração e confirma a presença do novo texto no ZIP baixado.
- `.github/workflows/verify.yml` ganhou job `browser` obrigatório no mesmo workflow que os testes Node, com Playwright em Ubuntu 24.04. Capturas de `2d-arena`, `3d-fps`, `3d-shooter` e do Studio são anexadas como artefato `gf002-browser-screenshots` por 7 dias, inclusive em execuções com falha.

**Incidentes e reparos:** runner Ubuntu 26.04 incompatível com Playwright 1.56; fixado Ubuntu 24.04. Primeiro teste do editor tentou selecionar um campo dentro de `<details>` fechado; agora abre corretamente o menu. Não foram problemas do runtime. Os 14 jogos passaram em todas as rodadas reais concluídas após a instalação do navegador.

**Prova final:** GitHub Actions run **[43876450239](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43876450239)**, SHA **`08f8aa0307c942326bc08cc32b221fc99762872d`**, ambos os jobs verdes: **247 testes Node** e **15 cenários Chromium** (14 gêneros + Studio editor/prévia/ZIP), **zero falhas**. Artefato de screenshots anexado (ID 14229968310).

**Limitações honestas:** Chromium headless em Linux não é dispositivo físico Android/iOS; nem valida 1% lows, consumo real de GPU, APIs gráficas de todo fabricante ou animações complexas GLB. O teste GLB em VM cobre modelo estático, não rig/AnimationMixer. Há edição real no Studio com arena 2D; a matriz de navegador cobre a execução de todos os gêneros, mas não o editor de cada um separadamente. Essas expansões permanecem em GF-005, GF-015/016 e GF-019. O Pages por branch ainda pode ignorar falhas da CI: GF-001 continua **EM REVISÃO** até alteração administrativa.

**Próxima tarefa única:** **GF-005** — automatizar restauração/recarga/edição/undo em navegador limpo, ZIP e GLB com IndexedDB e falhas de quota; reutilizar job browser existente. GF-003/004 seguem em revisão e precisam de checagem de suas evidências antes de validação.


## GF-005 — Continuidade com GLB íntegro e backup em Chromium (16/11/2026)

**Estado: EM REVISÃO.** Documento técnico: `docs/GF005_CONTINUIDADE_INTEGRIDADE.md`; plano mestre atualizado.

**Problemas reproduzidos no código:** restauração de projetos criados apenas por comando podia executar `parseGdd('')` antes de aproveitar `GAME_SPEC`; GLBs de mesmo tamanho podiam ser substituídos em ZIP com CRC recalculado sem alerta de conteúdo diferente; falhas no IndexedDB durante restauração deixavam o diálogo aberto.

**Correções:** `js/app.js` escolhe o `GAME_SPEC` salvo sem exigir GDD não vazio, verifica SHA-256 do GLB no ZIP e encerra transação mal-sucedida mantendo os dados antigos. `js/asset-library.js` inclui hash opcional `sha256` no manifesto, verifica novos GLBs na leitura IndexedDB, exportação e restauração; backups anteriores sem hash seguem legíveis (sem alegar integridade retroativa). `tests/asset-library.test.js` valida hash contra Node crypto, adulteração de ZIP com CRC válido e compatibilidade legado.

**Novo teste de integração em CI:** `tests/browser-project-continuity-gf005.py` roda no Chromium Playwright, cobrindo comando sem GDD, código editado, GLB real sintético, reload, backup `.gameforge.zip`, importação em perfil limpo, alteração incremental/desfazer, ZIP adulterado, erro de escrita e aviso por quota, sem vazamento de token. `.github/workflows/verify.yml` exige GF-005 após matriz GF-002; falhas agora bloqueiam o fluxo verificado de publicação. Teste foi adaptado à interface real com painéis recolhidos.

**Evidência parcial confirmada:** execução de CI `43880155784` aprovou **248 testes Node, 0 falhas** e a versão inicial do cenário GF-005 em Chromium (antes do teste extra de edição/desfazer). A revisão estendida permanece pendente de resultado verde no SHA atual; não declarar GF-005 VALIDADO antes disso.

**Limites:** SHA-256 detecta adulteração de arquivo em relação ao manifesto, não autentica origem. Browser automatizado usa GLB de triângulo mínimo, não um personagem animado complexo. Não executou testes Android/iOS reais ou de interrupção abrupta do processo. GF-001 continua com a rota antiga de Pages por branch, que depende de migração nas configurações do GitHub.

## GF-028 — Uso dos três arquivos anexados para evoluir o GameForge (16/11/2026)

**Material analisado:** `GDD_GODFATHER_COMPLETO(1).md`, `GDD_GODFATHER_THREEJS_3D_COMPLETO(1).md` e `SKILL_GAMEFORGE_URBAN_THREEJS(1).md`. O primeiro descreve a base **Canvas 2D**, enquanto o segundo é um **projeto de conversão Three.js em terceira pessoa**. A skill exige não confundir ações com FPS ou corrida e não tratar motores ausentes como implementados.

**Diagnóstico:** o catálogo anterior só tinha `arena`, `fps`, `racing` e outros motores executáveis. Projetos com carros + tiroteios + negócios + cidade eram forçados para um deles. Um GDD 3D Godfather podia receber classificação de arena por referência histórica ao projeto 2D, produzindo um protótipo que não correspondia à fantasia principal.

**Implementação de interpretação e planejamento:**
- Novo `js/urban-design.js`: identifica evidências de **ação urbana 3D com câmera em terceira pessoa**, separa gênero principal de mecânicas secundárias (carros/tiros), atribui origem/linha aos requisitos, reconhece quantidades somente quando declaradas e constrói matriz de cobertura com estado `planned`.
- `js/parser.js`: reconhece `urban-action` como **gênero em planejamento**, sem alterar os 14 pares de motores já testados; preserva a identificação original do Godfather Canvas 2D e de FPS/naves/corrida. Registra `engineAvailability.status='planned'`, câmera `third-person` e pendências. `js/generator.js` recusa exportar uma arena como se fosse cidade 3D.
- `index.html` + `js/app.js`: botão **Baixar contrato + plano urbano 3D** quando o GDD for identificado. O ZIP inclui `GAME_DESIGN_CONTRACT.json`, `PLANO_URBAN_ACTION.md` e `GDD_original.md` integral, **sem `game.js` inventado**. Criar jogo fica bloqueado até existir um motor urbano real.
- `docs/GAMEFORGE_URBAN_ACTION_THREEJS.md`: skill operável, fases URB-01 a URB-05, critérios de qualidade, preservação de saves e direitos dos assets.
- `tests/urban-design.test.js`: GDD 2D vs 3D, conversão por comando, invariância dos gêneros GoldenEye/naves/corrida, auditoria de requisitos, quantidades e ausência de motor falso.
- `tests/browser-export-matrix.py`: novo caso de navegação Chromium para ação urbana; importa um GDD, reconhece o gênero, mantém Criar bloqueado e baixa o ZIP do contrato, conferindo seu conteúdo.

**Validação confirmada:** GitHub Actions **[43881601334](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43881601334)**, commit `26d61dad07d6655aa95a40e630c4454f75175136`, concluiu os dois jobs com sucesso: **256 testes Node aprovados, zero falhas**, **16 cenários Chromium aprovados** (14 gêneros 2D/3D, Studio editor/ZIP e `urban-design-planning`), além do teste de continuidade GF-005. Não confundir isso com um motor urbano jogável: o teste verifica interpretação e exportação do plano. Os GDDs extensos originais foram inspecionados, mas não foram adicionados integralmente ao corpus automatizado.

**Escopo preservado:** o exemplo Godfather informa **3 cidades, 18 distritos, 36 negócios, 24 missões e três chefes** para aquele projeto. São metas do GDD 3D, **não defaults para outros jogos**. A classificação correta não cria veículos dirigíveis, polícia, IA de guardas, interiores, economia, animação GLB nem campanha 3D.

**Próximo passo específico para ação urbana: URB-01.** Implementar um vertical slice de bairro pequeno com XZ/Y, protagonista/câmera em terceira pessoa, colisores, mira, um inimigo, um negócio, uma missão concluível, HUD, pausa e save/load; validar em Chromium sem rede e adicionar à matriz de jogos exportáveis somente depois de funcionar. **GF-001** continua dependendo da configuração administrativa do Pages e **GF-005** deve passar integralmente para impedir perda de dados. Não proclamar motor urbano pronto antes de URB-01.


### Encerramento GF-005 — evidência Chromium (16/11/2026)

**VALIDADO no escopo de continuidade em Chromium + GLB pequeno**, após o checkpoint inicial em revisão. Execução GitHub Actions [43881202409](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43881202409), commit `7ca72df8`, com **256/256 testes Node aprovados e 0 falhas**, `verify:exports` de 15 variantes e teste GF-005 em Chromium aprovado.

O teste novo confirmou, em perfis isolados: criação só por comando, edição persistente do `game.js`, recarga, GLB binário preservado em IndexedDB e ZIP, backup e exportação, restauração em navegador limpo, melhoria incremental, desfazer, rejeição de GLB adulterado com CRC ZIP recalculado, erro simulado de IndexedDB com rollback, aviso de quota e verificação de viewport mobile. O GLB era triângulo sintético de 408 bytes; modelos rigados, arquivos grandes e dispositivos móveis físicos exigem novos testes.

**Limite de publicação:** a rota antiga `pages build and deployment` continua ativa até alterar Settings → Pages → Source para GitHub Actions (GF-001). Esta validação demonstra qualidade da GF-005, **não** resolve a dupla rota de publicação.

**Próximo checkpoint:** GF-006 (fluxo visual simplificado) / GF-009 (migração de saves), preservando esta matriz Chromium como regressão obrigatória.


## AUD-2026-11-16 — Auditoria geral e próximos passos

**Tipo de entrega:** diagnóstico estrutural e roadmap, **sem alterar motores nesta etapa**. Relatório completo em `docs/AUDITORIA_ESTRUTURAL_GAMEFORGE_2026-11-16.md`. Plano mestre atualizado. Base inspecionada: código `main` de 16/11/2026, com múltiplos commits urbanos acontecendo em paralelo.

**Metodologia:** leitura direta de árvore com 112 arquivos, principais interpretadores, geradores, runtimes 2D/3D, GLB, backup, app, CI/Pages; execução isolada de 12 pedidos de linguagem natural; revisão de logs de Actions. Sem usar métricas inventadas de FPS nem supor que testes Node garantam gameplay em dispositivos físicos.

**Pontos de falha auditados:**
- **P0 — GF-001:** coexistência confirmada da publicação antiga da branch com o workflow protegido por CI; alteração administrativa de Pages permanece necessária.
- **P0 — GF-003/004:** três pedidos curtos de ação urbana 3D em português classificados como `arena/3d`, apesar de existir URB-01; falta um `GameDesignIR` com requisitos obrigatórios, negativos e pendências rigorosas. Pedido de terror "sem tiros" ainda usa arquétipo FPS sem especificar implementação de stealth.
- **P1 — GF-028/010:** o bairro URB-01 é jogável e validado em Chromium, mas o mapa/guarda/negócio/missão são protótipo fixo, não gerados semanticamente do GDD. Criar LevelSpec por projeto e provar diferenças em dois pedidos.
- **P1 — GF-007/008/009:** `js/app.js` ~87 KB centraliza operações; evolução via substituição textual de `GAME_SPEC`; salvamento urbano usa chave por título (risco de colisão entre jogos homônimos).
- **P1 — GF-015/016/017/019:** GLB de cenário estático não equivale a rigs animados; não há evidência de orçamento de FPS/1% lows, nem E2E de campanhas completas em cada gênero.
- **P1 — GF-020/021:** riscos de tokens, importação de código e licenças exigem auditoria própria; backend opcional não constou na árvore analisada.

**Evidência positiva URB-01:** GitHub Actions [43887382720](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43887382720), SHA `9ec2995cb8`, aprovou **261 testes Node, zero falhas, 16 exportações válidas e 17 cenários Chromium** (15 jogos + Studio + cenário urbano), além da continuidade GF-005. Isto é evidência do **protótipo jogável**, não de mundo aberto completo.

**Próxima tarefa única sugerida:** corrigir **GF-001** no Settings → Pages; no código, executar **GF-003/004 — benchmark reproduzível + representação semântica de comandos curtos**. Critério: 3 erros urbanos identificados virarem classificação correta sem quebrar GoldenEye, navinha, terror e corrida. Depois passar ao `UrbanLevelSpec` de GF-028, com duas missões/cidades de teste distintas do mesmo gênero. Não marcar tarefas concluídas por relatório ou texto de HUD.

## URB-01 — Marco validado: primeiro bairro urbano 3D jogável (16/11/2026)

**Escopo:** motor de ação urbana em protótipo. Não equivale à conversão das cidades, dos 36 negócios nem das 24 missões do GDD Godfather. A diferença entre gameplay criado e requisitos ainda planejados deve continuar visível no Studio.

**Implementação registrada:**
- **js/urban-rules.js:** movimento/collision sliding em XZ, bloqueio de tiros por edifícios, captura idempotente e save com validação de versão, tipos e limites.
- **js/urban-runtime.js:** cenário Three.js local com ruas e edifícios low-poly, protagonista em terceira pessoa, colisões, uma pistola, um guarda com perseguição básica, armazém interativo, objetivo concluível, HUD, pausa, toque/teclado e save local separado dos saves do jogo 2D.
- **js/parser.js e js/urban-design.js:** seleção do novo par urban-action/3d (15 motores no total), requisitos parciais vs. planejados, uma fase jogável de demonstração sem inventar campanha completa. O GDD original continua preservado integralmente.
- **js/generator.js, index.html e js/app.js:** jogo offline exportável com Three.js local e arquivo SLICE_URBAN_3D.md; botão de exemplo Cidade 3D · URB-01 e ZIP de contrato/planejamento em paralelo.
- **js/project-backup.js, tools/verify-exports.cjs, tools/build-browser-fixtures.cjs:** registro dos novos artefatos e da nova variante nos testes do Studio.
- **tests/urban-slice.test.js, tests/urban-design.test.js, tests/export-boot-matrix.test.js, tests/browser-export-matrix.py:** testam colisão, linha de tiro bloqueada, recompensa concedida apenas uma vez, validação do save, classificação sem confundir FPS/naves/corrida e gameplay no navegador após descompactar o ZIP.

**Evidência de execução:** [GitHub Actions 43887382720](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43887382720), commit 9ec2995cb8b139f4a12a62cafdfbd82ada7c9a97, com **261 testes Node aprovados, 0 falhas**, **17 cenários Chromium aprovados, 0 falhas**, e **16 variantes** de JavaScript exportado verificadas (15 motores e FPS com loja). O Chromium jogou a missão URB-01: derrotou o guarda, caminhou até o armazém, capturou usando E, recebeu $450 uma vez, recarregou e confirmou o mesmo saldo sem duplicação. O job de persistência GF-005 também passou.

**Limitações honestas e pendências:**
1. Somente um bairro, um guarda, uma arma e um negócio fictício: veículos no cenário são decorativos, não dirigíveis. O HUD e as malhas procedurais não reproduzem as três cidades do GDD.
2. A câmera é de acompanhamento em terceira pessoa, ainda sem oclusão robusta. Ataques usam orientação do personagem, ainda não mira 3D completa por retículo ou armas variadas. O guarda tem perseguição/ataque básicos, não IA de patrulha, cobertura ou esquiva.
3. Não há interiores exploráveis, sistema de procurado/polícia, imóveis múltiplos, árvore de evolução, comércio real nem rig GLB com clipes.
4. Save é local à origem/navegador, com chave exclusiva da demonstração. Não migra o save 2D do Godfather.
5. WebGL em Chromium da CI não substitui testes em hardware Android/iOS nem medições de memória/temperatura/FPS no dispositivo. GF-001 ainda requer confirmar a configuração protegida de Pages.

**Próximo ID do motor: URB-02.** Priorizar oclusão da câmera, mira baseada no retículo, guardas com patrulha/suspeita/busca/combate e rotas/coberturas, com testes unitários e Chromium. URB-03/04/05 permanecem no plano mestre.
