# Auditoria geral e notas do GameForge Studio

**Data:** 16/11/2026 · **Base técnica auditada:** `main`, commit `8d44d47968284f24588077a34ffd690e227edb5a` · **Versão package.json:** `0.21.0`.

**Nota geral: 6,4 / 10** (média ponderada de 14 áreas, nota técnica proposta nesta auditoria; não representa pesquisa de usuários, desempenho de mercado nem certificação). O GameForge já cria protótipos offline e usa uma base variada de runtimes, mas ainda não produz automaticamente todas as mecânicas, missões, gráficos e sistemas solicitados em GDDs grandes ou instruções muito vagas.

**Escopo da evidência:** árvore de 143 entradas (41 módulos em `js/`, 53 arquivos em `tests/`); inspeção de `parser.js`, `intent-compiler.js`, `design-ir.js`, `game-capabilities.js`, `generator.js`, `development-engine.js`, `mission-semantics.js`, `urban-design.js`, `three-runtime.js`, `shooter-3d-runtime.js`, `urban-mission-runtime.js`, `glb-runtime.js`, `actor-animations.js`, `asset-library.js`, `urban-save.js`, `project-backup.js`, `zip.js`, `qa-bridge.js`, `visual-qa.js`, `app.js`, `index.html`, CSS, workflows e testes associados. A auditoria estrutural anterior `AUDITORIA_ESTRUTURAL_GAMEFORGE_2026-11-16.md` serviu como lista de riscos a revalidar no HEAD; **não** transferimos diretamente suas falhas antigas para o código atual. Inspeção estática + resultados reais de GitHub Actions; **não** houve teste manual em smartphone real, pentest ou benchmark gráfico de FPS.

## 1. Notas ponderadas

A soma dos pesos é 100%; as notas individuais vão de 0 a 10.

| Área | Peso | Nota | Justificativa observada |
|---|---:|---:|---|
| Entender pedidos em português | 12% | 6,3 | `parser.js`, `urban-design.js`, `intent-compiler.js`: heurísticas e expressões regulares, origem e restrições; ainda sem entendimento profundo/variado de qualquer frase casual |
| Fidelidade ao GDD e mecânicas | 14% | 5,1 | `design-ir.js` e `game-capabilities.js` marcam o que é pendente; compilação suporta subconjunto definido de objetivos, parâmetros e eventos, não mecânicas arbitrárias |
| Motores e gêneros 2D | 8% | 7,3 | Arena, shooter, corrida, plataforma, RPG e três defesas na matriz; todos geram e abrem offline |
| Motores e gêneros 3D | 8% | 6,4 | Arena, FPS, shooter, RPG, corrida, plataforma e urbano: jogáveis no browser; conteúdo procedural ainda limitado |
| Ação urbana e NPCs | 8% | 5,5 | Câmera, colisões, guardas, missão e save; bairro/objetivos ainda repetitivos, sem carros dirigíveis e polícia funcional |
| Fases, rotas e missões | 7% | 5,8 | Shooter 3D com quatro perfis de rota, biomas/eventos pré-programados, checkpoint; não cria rotas físicas nem campanhas únicas a partir de prosa livre |
| GLB e animações | 6% | 6,2 | Decoder integrado, rigs/clipes compatíveis e papéis de ator; sem retarget universal, Draco/KTX, otimização medida para muitas instâncias |
| Interface para iniciantes | 8% | 7,0 | Fluxo criar/testar/melhorar, feedback e roadmap; muitas funções coexistem em `app.js`, UX visual avaliada por código/testes, não por sessão com usuários |
| Salvamento, backup e ZIP | 7% | 8,0 | Backup com hash SHA-256, IndexedDB, restauração, checksum ZIP, save validado/backups, QA de continuidade; títulos podem colidir entre projetos |
| Segurança e isolamento | 6% | 6,7 | Prévia `iframe sandbox="allow-scripts"` e CSP sem conexão; ZIP/GLB validados e limitados; backend opcional e tokens externos fora do escopo, pentest pendente |
| Desempenho | 5% | 6,3 | Timestep em alguns motores, culling/instancing parcial, descarte; `preserveDrawingBuffer:true` em Three e ausência de metas medidas de FPS/memória móvel |
| Arquitetura e manutenção | 4% | 5,5 | Separação de arquivos e contratos; `app.js` ~92 KB, `three-runtime.js` ~40 KB, `generator.js` serializa funções por `.toString()`, `development-engine.js` altera spec por regex |
| QA automatizado | 5% | 8,8 | 324/324 Node, 16 verificações de exportação e 18 cenários Chromium no SHA auditado; cenários de campanha completa, aparelhos reais e ataque adversarial ainda escassos |
| Publicação e governança | 2% | 5,5 | CI e publicação verificada aprovadas, mas `pages build and deployment` aparece como rota paralela de deploy; migração administrativa obrigatória |

**Cálculo:** soma(nota × peso) / 100 = **6,391 → 6,4/10**. As notas não têm falsa precisão estatística: são critérios profissionais de maturidade e fidelidade, não medidas laboratoriais.

## 2. Evidências da versão auditada

- **Testes Node:** run [43931386117](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43931386117), `# tests 324`, `# pass 324`, `# fail 0`.
- **Exportação:** `npm run verify:exports` verificou 16 variantes de jogo gerado.
- **Chromium:** a matriz informou 18 cenários aprovados (15 jogos com combinações de gênero/dimensão + editor e cenários urbanos) e nenhuma falha; `browser-project-continuity-gf005.py` também retornou `gf005: ok`.
- **Publicação verificada:** run [43931758077](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43931758077) concluiu com sucesso no mesmo SHA. O workflow paralelo antigo `pages build and deployment` também foi registrado no mesmo commit. **Sucesso dos dois não prova bloqueio de commits ruins pelo caminho antigo**.
- **Tamanho/organização:** repositório rastreia 143 entradas; `js/app.js` ~92 KB, `js/three-runtime.js` ~40 KB, `js/expanded-2d-runtime.js` ~37 KB, `js/generator.js` ~18 KB; Three.js local ~699 KB.
- **Compatibilidade de hardware:** não há dados suficientes para dar garantia sobre FPS, temperatura, consumo de RAM/VRAM ou controles em aparelhos Android/iOS reais. A nota de UX e desempenho é *provisória* fora da matriz Chromium.

## 3. Achados e prioridades com critérios de aceite

### P0 — risco de confiança (tratar primeiro)

**AUD-G1 | Blindar a publicação do Pages**
- Causa: a árvore contém `.github/workflows/publish-verified.yml` e o GitHub segue registrando `pages build and deployment`. Há uma rota tradicional distinta que historicamente conseguiu publicar sem esperar o teste novo.
- Ação do administrador: Settings → Pages → Build and deployment → Source → **GitHub Actions**, e inspecionar proteções do ambiente `github-pages`. Não modificar branch de deploy sem o administrador.
- Aceite: criar uma execução negativa controlada em PR e provar que o Pages não atualiza; publicar somente `head_sha` que tenha CI Node+Chromium aprovada, sem dupla implantação.
- Risco: **alto**; esforço: **baixo** (configuração, auditoria e verificação).

**AUD-G2 | Dizer a verdade sobre a implementação do GDD**
- Causa: o `DesignIR` já avisa sobre pendências, mas `GAME_SPEC` e motores ainda não produzem toda mecânica citada, inclusive em gêneros próximos (polícia, dirigir, árvore de habilidade, quests, diálogos, multiplayer).
- Ação: marcar cada requisito como `implementado`, `parcial`, `incompatível` ou `pendente` com evidência; gerar um plano de tarefas testáveis por mecânica; bloquear afirmações de conclusão quando o núcleo do jogo não existe.
- Aceite: 100+ briefs leigos/gírias/infantis/GDDs variados com revisão humana da intenção, teste da mecânica realmente gerada e cobertura de negativas; **0 requisitos nucleares inexistentes declarados implementados**.
- Risco: **alto para a confiança do usuário**; esforço: **alto**.

### P1 — diferenciar o jogo criado de um protótipo genérico

**AUD-G3 | Compilador de instruções robusto** (`parser.js`, `intent-compiler.js`, `urban-design.js`)
- Expandir benchmark para linguagem infantil, erros de português, revisões incrementais (“troca só o carro, não muda a missão”), intenções híbridas e longos GDDs; reportar ambiguidade em vez de escolher `arena` automaticamente.
- Aceite: 100+ comandos em corpus versionado, precisão de gênero/dimensão e preservação de restrições quantificada.

**AUD-G4 | Fases realmente diferentes e criadas por dados** (`js/three-runtime.js`, `js/shooter-3d-runtime.js`, `js/urban-mission-runtime.js`)
- Criar `LevelSpec/StageSpec` por fase contendo mapa, objetivos, inimigos, chefes, eventos, triggers, itens e condição de vitória; dois GDDs diferentes não podem gerar a mesma campanha trocando apenas rótulos.
- Aceite: mínimo de 3 fases jogáveis variadas em dois gêneros; Chromium valida concluir todas com checkpoint e replay.

**AUD-G5 | Rotas espaciais e objetivos encadeados** (`js/stage-branches.js`)
- As rotas atuais diferenciam paleta, geometria decorativa, encontros e bônus; ainda não conduzem a saídas e mundos fisicamente separados.
- Aceite: escolha leva a volume de jogo e encontros inacessíveis às outras rotas; teste de colisão, navegação, checkpoints, rotas secretas e premiação única.

**AUD-G6 | Evolução incremental baseada em schema e AST, não substituição de texto** (`js/development-engine.js`, `js/generator.js`)
- Hoje o fluxo de modificação direta encontra `const GAME_SPEC = {...};` via expressão regular e substitui a declaração; novo código é serializado via `.toString()`. Um editor humano ou uma revisão estrutural pode invalidar esse caminho.
- Aceite: `GAME_SPEC.json` canônico, migração de versão, JSON Schema ou validação equivalente, diff estruturado, transação de candidato/rollback; testes “muda fase 3, preserva 1/2/4”.

**AUD-G7 | Unificar identidade e migração de save**
- Em jogos urbanos e no shooter com ramificações, a chave deriva de `spec.title` normalizado. Dois jogos com títulos iguais na mesma origem podem acessar o mesmo progresso.
- Aceite: ID de projeto estável, por instalação/exportação, namespace local com migração v1/v2 válida e teste de jogos homônimos; backup e restauração sem recompensas duplicadas.

**AUD-G8 | GLB profissional e compatibilidade medida** (`js/glb-runtime.js`, `js/actor-animations.js`)
- Adicionar biblioteca de esqueleto/clonagem correta para múltiplos NPCs, ajuste de escala/pivô, suporte seletivo a formatos/compressão, validação de rig e normalização de clips; não prometer animação de movimento se o arquivo importado não a contiver.
- Aceite: dois modelos autorizados com esqueletos diferentes em 3 fases, dezenas de NPCs sem T-pose ou clonagem incorreta e benchmark móvel.

**AUD-G9 | Reduzir a complexidade de `js/app.js`**
- Extrair subsistemas de projeto, UI, importação, prévia, exportação, backend opcional, evolução e QA. Segregar edição de estado e operações assíncronas.
- Aceite: módulos testáveis isoladamente e regressão de edição/revert/import/ZIP/preview com CI e Chromium, sem depender de variáveis internas globais.

**AUD-G10 | Performance com orçamento por dispositivo**
- Desabilitar `preserveDrawingBuffer` onde não for estritamente necessário, quando não comprometer capturas; criar presets de hardware, profiling de `drawCalls`, triângulos, memória de texturas, pooling e limites de NPCs animados; expandir instancing sem quebrar o renderizador CPU.
- Aceite: média e 1% low FPS, uso de RAM e tempo de carga medidos em pelo menos um desktop e dois aparelhos móveis reais; orçamento de performance versionado.

**AUD-G11 | Testes de campanha e falhas reais**
- A CI atual comprova boot, funcionalidade de começo de jogo e continuidade, mas não representa testes completos das 30 fases e de todas as missões/chefes de cada gênero.
- Aceite: cenários E2E de vitória, derrota, save/recuperação, troca de fase, chefão, navegação, GLB com animações, gamepad e touch em dispositivo real.

### P2 — maturidade de produto

**AUD-G12 | Experiência infantil/guiada**: percurso `Ideia → Entendimento → Construção → Jogo → Melhorias`, mostrando o que já está pronto, o que exige modelos e como refinar o comando. Testar com usuários leigos e acessibilidade teclado/leitor de tela.

**AUD-G13 | Segurança do backend opcional**: revisar implementação do servidor de IA (não presente na árvore auditada), endpoint, autenticação, tokens, limite de requisições, logs, prompt injection e origens permitidas. O isolamento da prévia reduz risco, mas não equivale a pentest.

**AUD-G14 | Gestão de versões e lançamentos**: indicar SHA, BUILD_INFO, notas da release e relatório de compatibilidade no app. `package.json` ainda marca `0.21.0` embora vários checklists documentem incrementos posteriores.

## 4. Plano de quatro ciclos

**Ciclo A — confiabilidade e interpretação (P0):** fechar Pages antigo, benchmark de linguagem com 100+ entradas, mapa requisito→capacidade, relatórios de lacuna central e proibições.

**Ciclo B — geração fiel de conteúdo (P1):** StageSpec/LevelSpec, missões por eventos, cidades/mapas gerados por dados, rotas com desvios reais, checkpoints estruturados.

**Ciclo C — engine de produção (P1):** personagens GLB de rigs variados, pooling/LOD, draw-call budgets, controles mobile, navegação de NPCs e performance real.

**Ciclo D — qualidade de produto (P1/P2):** modularizar Studio, edição baseada em esquema, testes de campanhas completas, red-team de importações e API, release info e UX para crianças e leigos.

## 5. Parecer e recomendação final

O GameForge está acima de um editor demonstrativo simples: possui geração local, exportação standalone e testes reais no navegador. **Ainda não é uma ferramenta que transforma qualquer descrição de criança ou GDD de centenas de páginas em um jogo completo**. A nota **6,4/10** representa essa diferença entre robustez da plataforma e fidelidade ao objetivo do usuário.

**Primeira ação recomendada:** fechar definitivamente a publicação antiga no Pages. **Primeira melhoria grande de código:** um compilador `GDD → requisitos executáveis → StageSpec` capaz de diferenciar comprovadamente jogos, mapas e objetivos, com critérios de aceite reproduzíveis. Melhorar apenas a quantidade de gráficos sem resolver essa lacuna tornará o protótipo mais bonito, mas não tornará o GameForge muito melhor como criador de jogos.
