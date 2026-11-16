# GameForge Studio — Plano mestre de evolução e auditoria técnica

**Auditoria:** 16/11/2026 · **Base examinada:** `main` em `5130453010ba7c590a30ad5def463678c7d45bd6` · **Versão:** `package.json` 0.20.0.

> **Este é o quadro de trabalho a seguir em cada "próxima".** O histórico das implementações fica em `docs/CHECKPOINT_DIVERSIDADE_JOGOS.md`. Não transformar sugestões em "feito" sem implementar, testar e registrar evidência.

## 1. Estado verificado (não confundir capacidade com promessa)

- Repositório: **100 entradas** na árvore de `main`, incluindo interface (`index.html`, `css/app.css`), módulos `js/`, testes `tests/`, documentação, exemplos e ferramentas. A revisão foi **estática do repositório**, complementada por resultados reais do GitHub Actions; **não foi uma sessão de navegador/dispositivo real**.
- Núcleos existentes: `parser.js` e `intent-compiler.js` → `GAME_SPEC` → `generator.js` → runtimes 2D (arena/plataforma/corrida, shooter, RPG/TD, defesa por linhas/blocos) e 3D (arena/FPS/RPG/plataforma/corrida/shooter). O gerador offline é um **compilador de parâmetros e mecânicas já programadas**, não um modelo que desenvolve qualquer ideia.
- Projeto e edição: `campaign-editor.js`, `development-engine.js`, `gdd-roadmap.js`, backups em `project-backup.js`, binários GLB no IndexedDB via `asset-library.js`, exportação ZIP local sem compressão via `zip.js`.
- Qualidade: `.github/workflows/verify.yml` roda `node --check`, `npm test` e `npm run bench:arena`. **CI confirmada:** run [43860458148](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43860458148), commit `5130453`, **196 testes aprovados, zero falhas**. A implantação Pages no mesmo commit também concluiu com sucesso.
- **Incidente observado durante a auditoria:** run [43859970304](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43859970304) teve **12 falhas** ligadas principalmente à sintaxe do `game.js` exportado e integração de módulos. A execução mais recente **corrigiu** essa regressão. A proteção contra recorrência e o bloqueio de publicação com CI vermelha **continuam ações em aberto**.
- `tests/browser-project-continuity.py` é um teste Playwright existente, mas **não faz parte do workflow atual**. Os testes Node/Three simulados não comprovam experiência WebGL real, FPS móvel ou aparência visual.
- `js/glb-runtime.js` declara carregamento de **objetos GLB estáticos**; `asset-library.js` aceita somente papel `scene`, até **4 assets**, **25 MB cada** e **50 MB totais**. Isso não equivale a suporte amplo de personagens com esqueleto e animações.
- A interface oferece ações para um **backend opcional** (`js/engineering-workbench.js`, chamadas `/api/...`), mas a árvore desta revisão **não contém a implementação do servidor**. Segurança, desempenho, autenticação e capacidade real desse backend **não foram auditados**.

## 2. Como usar o plano sem perder o rumo

**Estados permitidos:** `PENDENTE` → `EM EXECUÇÃO` → `EM REVISÃO` → `VALIDADO`, ou `BLOQUEADO`. Os itens abaixo começam **PENDENTES**; possuir código parcial não significa item encerrado.

1. Antes de qualquer implementação, consultar **este plano + última seção do checkpoint + CI atual**.
2. Trabalhar em **um ID principal por etapa**, e registrar dependências. Não misturar vários motores sem um motivo explícito.
3. A tarefa só passa a **VALIDADO** após: mudança publicada, teste automatizado reproduzível, regressões de gêneros adjacentes, evidência da CI **daquele commit** e atualização do checkpoint. Itens de renderização/UI exigem também QA em browser real.
4. Cada entrada no checkpoint deve registrar: ID, problema/causa, arquivos, commits, testes executados, resultados, limitações, pendências e **próximo ID**.
5. Se uma mudança quebrar a CI, **prioridade absoluta é reparar ou reverter**, antes de começar outra função. Não anunciar execução aprovada usando resultados de commits anteriores.
6. Documentar o que funciona **offline** e o que depende do **backend/IA**, sem apresentar sistemas planejados como implementados.

**Ordem de execução recomendada:** GF-001 → GF-002 → GF-003 → GF-004 → GF-005; depois GF-006/007/008 e as especializações de motor. Os demais ficam no backlog até haver base estável.

## 3. P0 — Confiabilidade e entendimento (fazer primeiro)

| ID | Situação e evidência | Ação concreta | Critério de aceite | Estado |
|---|---|---|---|---|
| **GF-001** | Pages publicou commit com `verify` falhando. Rota antiga da branch ainda existe. | Gate `publish-verified.yml`, pré-validador `verify-exports.cjs`, testes negativos e manual de rollback implementados. Falta migrar **Settings → Pages → Source** para **GitHub Actions**. | Recusar CI vermelha/PR/fork/SHA antigo; publicar somente commit verificado após a migração, sem rota alternativa. | EM REVISÃO — configuração do Pages pendente |
| **GF-002** | Matriz Node e Chromium **implementada e aprovada**: 14 motores por gênero/dimensão, FPS com loja, Three.js local, geração offline, controles, pausa, exportação e teste GLB. | `tools/build-browser-fixtures.cjs` gera 14 ZIPs reais; `tests/browser-export-matrix.py` descompacta, confere bytes e abre os 14 HTMLs extraídos em Chromium sem acesso remoto; o Studio cria, executa prévia, edita `game.js` e baixa ZIP. Evidência com screenshots no Actions. | **Aprovado** no commit `08f8aa0307c942326bc08cc32b221fc99762872d`, CI [43876450239](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43876450239): 247 testes Node + 15 cenários Chromium, zero falhas; 390px e desktop. | VALIDADO — escopo Chromium; hardware Android/iOS e testes WebGL/performance ficam em GF-019 |
| **GF-003** | Corpus de 10 jogos e 6 documentos completos; auditoria adicional demonstrou três pedidos GTA/máfia/padrinho 3D caindo em arena. | Detector urbano corrigido para linguagem leiga, negativas de 3D e evidências de câmera/veículos/lojas por cláusula. Suíte de 16 casos em `tests/design-ir.test.js`; documento `docs/GF003_004_DESIGN_IR_V1.md`. | Os três erros urbanos e casos adjacentes passam, sem confundir FPS, navinha, corrida ou plataforma. CI do SHA atual e regressões reais obrigatórias. | EM REVISÃO — IR v1 CI aprovada (270/270 Node, 17 Chromium); benchmark de 100 pedidos pendente |
| **GF-004** | Versão 1 registrava apenas nomes de sistemas e restrições. A **v2 extrai atores, verbos, objetos, quantidades, condições textuais, fase, origem e relações antes/depois**, e indica ações inexequíveis sem mascará-las. | `js/mission-semantics.js` gera `actionModel` auditável; `parser.js` integra ao `GAME_SPEC`, `app.js` mostra fases/dependências, `generator.js` exporta `MODELO_ACOES.json` e `PLANO_ACOES.md`; `tests/mission-semantics.test.js` testa casos concretos. Próxima expansão: condições numéricas/temporais e corpus de >100 pedidos, medindo cobertura e falsos positivos. | [CI 43896601850](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43896601850) com 277 testes Node e 18 cenários Chromium, incluindo duas missões diferentes. Proibições não viram pedidos positivos; missões sem suporte não são substituídas silenciosamente por arquétipos genéricos. | VALIDADO na v2 limitada; evolução de condições complexas PENDENTE |
| **GF-005** | Recuperação de projeto apenas por comando corrigida; integridade de GLBs novos garantida por SHA-256 em ZIP e IndexedDB; restauração falhada mantém o projeto atual. | `js/asset-library.js`, `js/app.js`, `tests/asset-library.test.js`, `tests/browser-project-continuity-gf005.py` e workflow de Chromium. Backup portátil preserva código editado, progresso incremental, GLB e histórico de desfazer entre perfis; quota e adulteração bloqueadas. | Node **256/256** e Chromium real completos no commit `7ca72df8d8` / CI [43881202409](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43881202409). Modelos grandes/Android/iOS continuam fora do escopo. | VALIDADO — continuidade em Chromium, GLB pequeno e ZIP com SHA-256 |

## 4. P1 — Produto, motores e assets (depois de estabilizar P0)

| ID | Área / evidência | Próxima melhoria verificável | Aceite resumido | Estado |
|---|---|---|---|---|
| **GF-006** | Interface: `index.html`, `css/app.css`, `js/app.js` (>80 KB). | Unificar criação em fluxo **ideia → análise → gerar → testar → melhorar** com progresso, erros objetivos e recursos avançados recolhidos; corrigir pontos de rolagem em telas pequenas. | QA visual e teclado em 375/768/1366 px, sem overflow, controles clicáveis, preview visível. | PENDENTE |
| **GF-007** | `js/app.js` concentra editor, geração, assets, backup, rede e QA. | Extrair controladores por responsabilidade, separar estado da interface e lógica, reduzir efeitos colaterais de troca de GDD e projeto. | Contratos testados, cobertura mantida e testes E2E sem regressão do fluxo. | PENDENTE |
| **GF-008** | `development-engine.js`, `campaign-editor.js`, `gdd-roadmap.js`. | Evolução incremental com *diff* de `GAME_SPEC`, prévia candidata, aprovação/reversão atômica, tarefas relacionadas às linhas do GDD. | Pedido de alterar fase N não modifica fases adjacentes; rollback recupera projeto e assets; comparação antes/depois. | PENDENTE |
| **GF-009** | Salvos: `project-backup.js`, `GAME_SPEC`, scripts e múltiplas versões. | Esquemas versionados, migrações seguras, compatibilidade de backups antigos e integridade de referências. | Abrir corpus de backups antigos sem executar código importado; avisos claros quando incompatíveis. | PENDENTE |
| **GF-010** | Campanhas 2D/3D ainda usam arquétipos procedurais e limites de 30/40 fases. | Criar arquétipos configuráveis de objetivos, mapas, spawns, progressão e chefes **por fase**, sem clones sucessivos. | Dois GDDs do mesmo gênero geram desafios e objetivos verificavelmente diferentes; testes de transição/salvamento. | PENDENTE |
| **GF-011** | `three-runtime.js` e `combat-economy.js`: FPS/RPG 3D com componentes iniciais. | Evoluir vida/armadura, armas, munição, recarga, lojas, inimigos com patrulha/alerta/cobertura e objetivos reais **apenas onde suportado**. | Testes de dano, gasto de munição, compra, IA e vitória; não confundir texto de HUD com mecânica. | PENDENTE |
| **GF-012** | `runtime-template.js`, `expanded-2d-runtime.js`: plataforma/arena/RPG. | Fortalecer colisões, checkpoints, hitboxes, progressão, animação contextual e recuperação após morte. | Regressões de movimento em 30/60/120 Hz, mortes, checkpoints e fases, com QA no navegador. | PENDENTE |
| **GF-013** | `runtime-template.js` e `three-runtime.js`: corridas. | Testar IA de oponentes, colisões, pistas/rotas, limites da via, HUD, tuning e física de veículos configurada por gênero. | Percorrer corrida inteira sem atravessar cenário; IA evita colisões triviais; voltas e upgrades persistem. | PENDENTE |
| **GF-014** | `advanced-td-rules.js`, `strategy-rules.js`, runtimes de defesa. | Balancear economia, ondas, regras de torre, caminho, vitória/derrota e progressão longa, preservando três estilos diferentes de TD. | Simulações determinísticas em várias seeds/fases, custo de torres correto, sem fase impossível por bug. | PENDENTE |
| **GF-015** | `glb-runtime.js` é leitor de objetos estáticos; `model-inspector.js` inspeciona GLB. | Pipeline **personagem GLB com rig, AnimationMixer e estados** idle/walk/run/attack/hit/death, com fallback explícito quando asset não for compatível. | Um GLB animado real testado com caminhada e morte; sem pose T congelada; compatibilidade e limites documentados. | PENDENTE |
| **GF-016** | `asset-library.js`: 4 GLBs/25 MB/50 MB; uso como `scene`. `zip.js` gera ZIP **sem compressão**. | Importação por papéis (cenário/personagem/inimigo/veículo), escala/orientação, texturas, LOD, compressão e avisos de orçamento. | 3 assets reais diferentes inseridos e preservados no ZIP/reimportação; modelo/texturas íntegros e memória medida. | PENDENTE |
| **GF-017** | `three-runtime.js`, `software-renderer.js`, `shooter-3d-runtime.js`. | Criar orçamentos por dispositivo, culling/LOD, cache/disposal, carregamento de fases, redução de draw calls e qualidade adaptativa baseada em métricas. | Relatório com FPS, 1% lows, memória, draw calls e tempo de carregamento em desktop/Android; sem regressão visual grave. | PENDENTE |
| **GF-018** | Entrada e HUD implementados por runtime. | Contrato unificado de teclado, mouse, touch e gamepad; remapeamento, deadzone, pausa e foco; tutorial de controles por gênero. | Matriz de input em gêneros suportados, troca sem entrada presa e QA em dispositivo. | PENDENTE |
| **GF-019** | `visual-qa.js` e `qa-bridge.js` já testam preview; CI atual apenas Node. | Automatizar captura, erros JS, carga, interação, screenshot e comparação visual de **2D/3D** em Chrome real (e depois mobile). | Relatório de QA do mesmo commit com imagens e telemetria; falhas de inicialização bloqueiam validação. | PENDENTE |
| **GF-020** | Preview iframe, exportação de HTML/ZIP, comunicação de QA, servidor opcional e entradas de projeto. | Revisão de segurança: CSP, mensagens `postMessage`, URLs e tokens, importações ZIP/GLB, limites de arquivos, scripts editáveis e isolamento do backend. | Checklist adversarial e testes negativos; segredo não entra no export/backup/logs; aceitar candidatos só após revisão. | PENDENTE |
| **GF-021** | `repository-knowledge.js` referencia projetos; reutilização de código/arte não é sempre licenciada. | Catálogo de **licenças, origem, compatibilidade e atribuições** antes de copiar dependências/assets; distinguir inspiração técnica de reutilização literal. | Todo pacote de código/asset incorporado possui procedência e licença documentadas; conteúdo comercial sem permissão é excluído. | PENDENTE |

| **GF-028** | URB-01 criou um bairro e uma missão fixa. **Ações estruturadas agora geram missões diferentes no bairro 3D**: coleta/entrega e combate/captura, conforme etapas e quantidades do GDD. | `js/urban-mission-flow.js` (máquina de estados), `js/urban-mission-runtime.js` (objetos, guardas, entrega, transições e save), integração com `urban-rules.js`, `parser.js` e `generator.js`. Limites explícitos: até 3 fases, 3 guardas/provas por fase e um armazém. Preset “Cidade 3D · Missões por GDD” no Studio. | E2E Chromium concluiu coleta→entrega→outra fase→eliminação→captura e save sem duplicação; QA físico, múltiplos locais, polícia, veículos, IA de patrulha e economia ampla seguem pendentes. | EM EXECUÇÃO — missões semânticas v1 VALIDADAS; motor urbano completo pendente |

## 5. P2 — Expansões controladas (não antecipar antes das bases)

| ID | Área | Proposta | Aceite | Estado |
|---|---|---|---|---|
| **GF-022** | IA e servidor opcional | Auditar **o repositório do backend real** separadamente: autenticação, permissões, quotas, custos, timeouts, sandbox, execução de ferramentas e fluxo de aprovação. | API verificada em ambiente isolado, com testes de autorização e limite de custos. | PENDENTE |
| **GF-023** | Composição de motores | Manifesto modular de recursos, entidades e regras com compatibilidade entre motores; sistema de plugins/prefabs versionados. | Adicionar mecânica suportada sem editar todos os runtimes; regressões verdes. | PENDENTE |
| **GF-024** | Editor visual | Editor de cenas e campanhas 2D/3D com colisões, posições e rotas, interoperável com o GDD e exportação. | Fase editada visualmente permanece igual após backup, ZIP e reimportação. | PENDENTE |
| **GF-025** | Salvamento interno do jogo | Contrato de savegame por gênero: fase, progresso, itens, moedas, equipamento, checkpoints, opções. Diferente do backup do Studio. | Fechar e reabrir jogo exportado retoma estado válido sem duplicar recompensas. | PENDENTE |
| **GF-026** | Som e apresentação | Pipeline de áudio/SFX, mixagem, legenda, opções de acessibilidade e recursos próprios/licenciados. | Funciona offline, respeita gesto do usuário, suporta volume/mute e não expõe conteúdo sem direitos. | PENDENTE |
| **GF-027** | Métricas de criação | Painel opt-in de qualidade: requisitos reconhecidos, implementados, incompatíveis, status de CI/QA e métricas de jogo gerado. | Painel mostra fatos rastreáveis sem marcar um recurso como pronto por descrição textual. | PENDENTE |

## 6. Critérios mínimos globais para uma atualização

| Verificação | Onde | Regra |
|---|---|---|
| Sintaxe do Studio | `node --check js/*.js` | Obrigatória |
| Regressões | `npm test` | Obrigatória e verde **no último commit** |
| Exportações | `generator.js`, `new vm.Script(game.js)`, testes de boot | Obrigatória para qualquer alteração no parser, compilador ou runtime |
| Benchmark | `npm run bench:arena` + perfil de browser quando aplicável | Não transformar speedup de microbenchmark em promessa de FPS |
| Gêneros adjacentes | Matriz de `parseGdd` e runtimes | Mudança em um gênero não quebra os outros |
| UI e gráficos | Chrome desktop/celular, logs, foco, screenshot e WebGL real | Obrigatória antes de declarar QA visual concluído |
| Publicação | CI verde + Pages verde no mesmo SHA | Não usar Pages verde como prova de código válido |
| Checkpoint | `docs/CHECKPOINT_DIVERSIDADE_JOGOS.md` | ID, commits, testes, resultado, próximo item |

## 7. Registro de decisões e próximo passo único

- **Decisão:** priorizar estabilidade da criação/exportação e medição real antes de adicionar muitos sistemas/efeitos. Não quebrar motores já funcionais; preservar fluxo de edição e backup.
- **Decisão:** não confundir *classificação do GDD* com *implementação automática das mecânicas*. Reportar limites honestamente.
- **GF-001 em revisão:** validação/rota GitHub Actions implementadas e testes negativos adicionados; **faltam migrar a fonte do Pages e confirmar proteção sem caminho alternativo**. Detalhes em [PUBLICACAO_VERIFICADA.md](./PUBLICACAO_VERIFICADA.md).
- **Após GF-001:** GF-002 (matriz export/boot), GF-003 (corpus de GDDs), GF-004 (contrato de implementação) e GF-005 (backup e QA de navegador).
- **Nota de auditoria:** o incidente de exportação observado foi resolvido em `5130453` com a CI verde, mas a possibilidade de publicar com CI falhando permaneceu demonstrada. Este plano é backlog, não promessa de recursos implementados.

- **GF-028 — GDD urbano 3D:** URB-01 já possui **primeiro bairro 3D jogável, testado em Chromium** (ver [skill atualizada](./GAMEFORGE_URBAN_ACTION_THREEJS.md)). Não confundir um bairro e uma missão com a conversão total das cidades, sistemas e campanha. **Próxima etapa urbana: URB-02**, câmera com oclusão e IA de guardas/combate mais elaboradas.

### Marco URB-01 — 16/11/2026

- **Status:** VALIDADO como *vertical slice* de um bairro, uma arma, um guarda e um estabelecimento, não como versão 3D completa do Godfather.
- **Código:** `js/urban-rules.js`, `js/urban-runtime.js`, `js/parser.js`, `js/generator.js`, `js/app.js` e `index.html`.
- **Testes:** `tests/urban-slice.test.js`, `tests/urban-design.test.js`, `tests/export-boot-matrix.test.js`, `tests/browser-export-matrix.py`; CI 43887382720 com 261 Node e 17 cenários Chromium aprovados, além de GF-005.
- **Próximo ID:** URB-02. A fila de P0 (GF-001 pendente de configuração de Pages, e outros itens do plano) permanece registrada.


## 8. Auditoria estrutural atualizada — diagnóstico e ordem (16/11/2026)

Leia [AUDITORIA_ESTRUTURAL_GAMEFORGE_2026-11-16.md](./AUDITORIA_ESTRUTURAL_GAMEFORGE_2026-11-16.md) antes de iniciar uma nova etapa. O relatório contém **14 achados** com evidências, impacto, prioridade, testes e aceite. No ensaio exploratório, **3 de 10 pedidos com gênero esperado** (todos ação urbana curta em português) foram classificados como `arena/3d`, indicando problema de fidelidade mesmo com o URB-01 jogável.

**Ordem operacional:** GF-001 (dependência administrativa de Pages) → GF-003/004 (IR semântico + benchmark de briefs infantis, negativos e híbridos) → GF-028/GF-010 (LevelSpec e missões derivadas do GDD) → GF-007/008/009 (refatoração, diff e salvamento isolado) → GF-015/016/017/019 (GLB animado, performance e QA). GF-006 simplifica o fluxo visual, mas não deve substituir a implementação dos sistemas de jogo.

**Auditoria não é implementação:** itens permanecem PENDENTE/EM REVISÃO até código, testes de gameplay e CI do SHA publicado. CI verde do protótipo urbano confirma apenas o vertical slice existente.

### Marco — Ações e missões vinculadas ao GDD (16/11/2026)

- **Pipeline:** texto livre/GDD → `GameForgeMissionSemantics.parse` (ações, objetos, quantidade, origem, fase, condições e relações) → `GameForgeMissionSemantics.executable` → `GAME_SPEC.urbanMissions` → runtime de missões com estado, requisitos e save versionado.
- **Realmente implementado:** até 3 missões com guardas e provas (até 3 cada), entrega e captura no armazém; recompensa única; avanço e reabertura de campanha; ZIP preserva o modelo e o GDD original.
- **Não implementado:** dirigir, polícia, interiores, objetivos temporizados, condições numéricas livres, vários estabelecimentos, missões ramificadas e geração aberta de novas classes de mecânicas. Exigir indicação clara no Studio e no relatório.
- **Validação de referência:** CI [43896601850](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43896601850), 277 Node + 18 Chromium. Para commits posteriores, usar a CI do SHA correspondente, não esta validação histórica.
- **Próximas melhorias:** GF-004 v3 — condições temporais/numerais com execução real e corpus de avaliação; GF-028 URB-02 — IA de guardas, câmera com oclusão e mira avançada, mantendo compatibilidade do save antigo.
