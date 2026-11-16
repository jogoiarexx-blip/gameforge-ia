# Auditoria estrutural do GameForge IA — 16/11/2026

**Natureza:** auditoria de código e arquitetura, observação de execuções reais do GitHub Actions e ensaio exploratório de 12 instruções em português. **Não é uma certificação de segurança, nem uma sessão manual em Android/iOS.**

**Escopo:** repositório `jogoiarexx-blip/gameforge-ia`, branch `main` durante a revisão de 16/11/2026. A árvore consultada continha **112 arquivos rastreados**, incluindo `js/app.js` (~87 KB), `js/three-runtime.js` (~40 KB), compilador, importador GLB, testes Chromium e documentação. A área urbana recebeu commits simultâneos entre `ce92b705` e `a6ba7384`; os resultados dessa área dependem do SHA e devem ser rechecados no HEAD. Consulte o histórico da CI antes de concluir uma etapa.

## Resumo executivo

A principal restrição deixou de ser a ausência de uma tela de criação. O Studio já transforma parte do GDD em `GAME_SPEC`, possui motores 2D/3D, exportação ZIP/HTML offline, prévia isolada, economia FPS, histórico de alterações e backup de GLBs com SHA-256. O gargalo agora é **fidelidade semântica**: um pedido casual não deve ser reduzido à categoria mais parecida quando a fantasia de jogo e as mecânicas centrais não serão reproduzidas.

Os três riscos sistêmicos mais importantes são:
1. **Publicação fora da CI**: a rota antiga `pages build and deployment` ainda executa junto do workflow `Publicar GameForge verificado`.
2. **GDD → jogo divergente**: detecção baseada em expressões fixas, integração ainda parcial entre os conceitos reconhecidos e mecânicas implementáveis, e fallback para `arena` mesmo em gêneros não atendidos.
3. **Dívida de arquitetura/QA**: orquestração concentrada em `js/app.js`, exportação por serialização de funções, e teste de browser que predominantemente comprova inicialização/movimento/pausa, não uma campanha completa.

**O que já funciona e não deve ser perdido:** código offline exportável, 14 motores básicos na matriz anterior + protótipo urbano em integração, rollback de edição, rastreabilidade de requisitos `implementada/configurada/pendente/incompatível`, ensaios Chromium e backup com integridade de GLB. Cada melhoria nova deve preservar esses contratos.

## Como a auditoria foi feita

- Inspeção da árvore `main`, `package.json`, workflows, checkpoint, plano mestre, `js/parser.js`, `js/intent-compiler.js`, `js/game-capabilities.js`, `js/generator.js`, `js/development-engine.js`, `js/urban-design.js`, `js/urban-rules.js`, `js/urban-runtime.js`, `js/three-runtime.js`, `js/glb-runtime.js`, `js/asset-library.js`, `js/project-backup.js`, `js/app.js`, `js/qa-bridge.js` e testes.
- Checagem de execuções do Actions. A CI anterior no commit `7ca72df8` comprovou **256 testes Node e continuidade Chromium**, mas esses resultados **não são automaticamente aplicáveis a qualquer commit posterior**. Quando a auditoria começou, novos commits urbanos ainda estavam sendo validados.
- Execução do interpretador atual, em isolamento JS, com **12 comandos curtos parafraseados** (nada foi publicado nessa parte). Foram identificados **3 desencontros de gênero/dimensão nos 10 exemplos com expectativa específica**: pedidos de ação urbana 3D classificados como `arena/3d`. Dois exemplos exploratórios adicionais, farming e navegação viking, não tinham gênero esperado definido; ambos caíram em `arena`. Os 12 casos **não formam benchmark estatístico representativo**.

## Matriz de achados e ações priorizadas

| ID | Prioridade | Achado baseado em código/teste | Impacto para o criador leigo | Ação verificável | Como considerar concluído |
|---|---|---|---|---|---|
| **AUD-01 / GF-001** | **P0** | `pages build and deployment` continua a aparecer e aprovar deploys enquanto `Validar GameForge Studio` ainda está em execução. O gate `publish-verified.yml` existe, mas não é a única rota. | Uma atualização defeituosa pode ser publicada antes de passar nos testes. | Administrador: em Settings → Pages → Build and deployment → Source, usar **GitHub Actions**, não branch; conferir ambientes/proteções. | Commits com CI vermelha não aparecem no Pages; apenas o SHA aprovado é publicado, testado em execução negativa por PR sem mexer na main. |
| **AUD-02 / GF-003+004** | **P0** | `urban-design.inspect` exige tema urbano, frase explícita de terceira pessoa, referência 3D e três sinais de sistemas urbanos. Três pedidos simples foram classificados erroneamente como arena 3D. | Usuário pede GTA/mafia e recebe o motor errado. | Reconhecimento por intenção do verbo, câmera implícita, exemplo de jogo, requisitos dominantes e negações; classificar com margem e bloqueio honesto quando não houver motor compatível. | Benchmark versionado >=100 briefs, incluindo curtos, infantis, erros ortográficos, negativos e híbridos; nenhuma amostra urbana vira arena sem alerta. |
| **AUD-03 / GF-004+028** | **P0** | O contrato de capacidades existe, mas o compilador genérico aplica só um conjunto limitado de parâmetros (`stageConfig`, loja FPS etc.). Muitos sistemas pedidos não recebem entidade executável ou pendência: ex. "terror em primeira pessoa, sem tiros" vira FPS que mantém combate, e "RPG 3D com inventário, diálogos, quests e skills" marcou apenas inventário pendente. | O programa pode parecer ter entendido tudo sem representar as mecânicas que definem o jogo. | Criar uma representação intermediária `GameDesignIR` com objeto, ação, alvo, condição, quantidade, fase, prioridade, câmera, restrição negativa, dependência e prova de implementação. | Cada requisito do brief ganha estado e origem; nenhum "sem tiros" ativa disparos por padrão; UI apresenta diferença entre protótipo e jogo descrito. |
| **AUD-04 / GF-028 URB-01** | **P1** | O novo `urban-runtime.js` produz um bairro/protótipo com prédios, um guarda, um negócio e uma missão **codificados no runtime**. A integração do motor urbano ao gerador e à matriz estava em andamento durante a auditoria. | Dois GDDs urbanos diferentes tendem a produzir a mesma missão e mesmo mapa apesar do texto distinto. | Separar `UrbanLevelSpec` dos meshes; gerar ao menos duas missões, posições e variantes a partir dos requisitos; não fingir campanha grande. | Duas entradas urbanas diferentes resultam em objetivos, spawn e mundo verificavelmente distintos, com início→objetivo→recompensa→save e rollback comprovados no Chromium. |
| **AUD-05 / GF-009+025** | **P1** | `urban-runtime.js` cria chave de salvamento apenas com o **título normalizado** (`gameforge-urban-v1-<title>`); há save v1 local, sem identidade robusta de projeto e sem migração de versões. | Dois jogos/projetos com mesmo nome na mesma origem podem compartilhar estado, dificultando continuidade segura. | Identidade de projeto estável e exclusiva, versão/migração de saves, namespace diferente entre Studio e jogo exportado; casos de rollback em interrupção. | Dois jogos com mesmo título não compartilham progresso; mudança de versão migra de forma validada e não duplica dinheiro/recompensas. |
| **AUD-06 / GF-007** | **P1** | `js/app.js` tem cerca de **87 KB** e trata UI, geração, backup, IndexedDB, QA, exportação, edições e comunicação opcional com API. | Alteração numa área pode quebrar funções não relacionadas, além de deixar o projeto difícil de manter. | Extrair controladores de `ProjectStore`, `AssetController`, `GenerationController`, `PreviewController` e `EditorController`; eventos com contratos explícitos. | Mais de 70% dos fluxos críticos de UI passam pelos controladores isolados; CI e Chromium continuam verdes; undo/restore não mutam estado inesperado. |
| **AUD-07 / GF-008** | **P1** | `development-engine.js` modifica `GAME_SPEC` via busca/substituição textual no `game.js`, exigindo declaração com formato conhecido. Runtime é empacotado com `.toString()` em `generator.js`. | Ajustes de código manual ou mudanças de formato podem tornar a evolução incremental frágil. | Guardar `GAME_SPEC.json` como fonte canônica, validar esquema e gerar `game.js` como artefato; comparar diff estruturado, transação candidata e botão reverter. | Editar fase N não altera N±1; falha preserva projeto; GDD/código/ZIP/preview usam a mesma versão de spec. |
| **AUD-08 / GF-015+016** | **P1** | `glb-runtime.js` aceita geometria estática e materiais básicos; `asset-library.js` limita a **quatro modelos de cenário**, 25 MB cada/50 MB totais. Modelos de personagens com rig e estados não são o pipeline de jogo. | Importar médico, inimigo ou protagonista GLB não resulta automaticamente em jogador animado. | GLTFLoader/AnimationMixer ou pipeline equivalente testado, papéis scene/player/enemy/vehicle, escala, pivot, estados idle/run/attack/hit/death e fallback; política de procedência dos assets. | 1 GLB animado do jogador e 1 de inimigo funcionam em fases distintas, após backup/ZIP/reabertura, sem T-pose ou perda de FPS alvo. |
| **AUD-09 / GF-010+011+014** | **P1** | Os 2D/3D genéricos ainda são motores por arquétipos, com etapas que não representam integralmente objetivos, economia e chefes do GDD. | "20 fases" pode significar 20 títulos, não 20 fases criadas com conteúdo próprio. | Modelo de fase parametrizável, objetivos por eventos, spawn/tabelas de inimigos, recompensa única, IA e interações por gênero. | Concluir campanha de ponta a ponta e validar diversidade entre fases adjacentes. |
| **AUD-10 / GF-019** | **P1** | A matriz Chromium anterior confere boot/menu, movimento breve, pausa e ausência de erro. Os testes GF-005 cobrem persistência e ZIP. Um boot verde não comprova chefe ou vitória/derrota. | Bugs só surgem nas fases avançadas, após horas de jogo ou em aparelhos específicos. | E2E por gênero incluindo vitória/derrota, boss, objetivos, vida, compras, save/reload, ZIP reimportado; capturas e orçamento gráfico. | Checkpoints de gameplay real, screenshots e telemetria anexados ao CI, com falha bloqueante quando jogo não termina ou trava. |
| **AUD-11 / GF-017** | **P1** | `three-runtime.js` cria renderer com `preserveDrawingBuffer:true` e gráficos procedurais com meshes próprios; sem relatório de 1% lows/memória/GPU por classe de aparelho. | Desempenho pode cair ao expandir mapas, GLBs, inimigos e efeitos. | Medição real por aparelho, orçamento de triângulos/draw calls/texturas, reciclagem de objetos, LOD, culling e materiais compartilhados. | Capturar FPS médio, 1% lows, memória, draw calls e tempo de carregamento no PC e Android, sem degradação relevante dos jogos existentes. |
| **AUD-12 / GF-020+021** | **P1** | Existe prévia sandboxed com CSP e validação de ZIP/GLB. Há também integração opcional com backend IA em `engineering-workbench.js` e `app.js`. A árvore auditada não continha servidor/backend desse fluxo. | Usuário pode supor que código IA gerado, URLs, tokens e assets foram auditados, quando o servidor real não foi examinado. | Threat model para importações, CSP, mensagens, tokens e API; revisar backend separado após fornecimento/conexão, validar licenças e permissões de assets. | Nenhum token em backup/export/log; importações adversariais e sugestões IA não podem comprometer origem do Studio; licenças documentadas. |
| **AUD-13 / GF-006+027** | **P2** | O Studio expõe três painéis, muitos `details` e opções avançadas. `app.js` exibe estados de capacidade e progresso, mas a experiência ainda dispersa ações de criar, planejar, testar e publicar. | Usuário leigo não sabe qual botão dá origem a uma mecânica real. | Fluxo guiado **Ideia/GDD → Entender → Criar → Testar → Melhorar**, com contagem de requisitos, progresso, avisos contextuais e modo avançado recolhido. | Teste com teclado/touch em 375/768/1366px; sem rolagem horizontal e com prévia acessível em todas as etapas. |
| **AUD-14 / governança** | **P2** | `package.json` e backup declaram versão `0.21.0` enquanto o checkpoint documenta etapas posteriores. Há commits paralelos com mudanças grandes no mesmo dia. | Difícil saber qual versão do código e do site foi realmente testada. | Gerar `BUILD_INFO` a partir do SHA/CI, changelog a cada checkpoint, e atualizar versão semântica somente após QA. | UI mostra SHA e status de testes publicado, com checkpoint correspondente, evitando "aprovado" de um commit anterior. |

## Ensaio reproduzível de linguagem natural

Chamadas executadas via `GameForgeParser.parseGdd('', texto)` em JS, detecção automática. Resultado observado **durante a revisão**, não representação de todos os GDDs:

| Pedido resumido | Intenção humana esperada | Saída observada | Avaliação |
|---|---|---|---|
| "Crie um jogo tipo GTA com mundo aberto 3D, carros, polícia, negócios e missões" | Ação urbana 3D | `arena/3d` | **Falha**: gênero principal errado |
| "Jogo de máfia 3D, câmera por trás do personagem, carros, lojas e tiroteio" | Ação urbana 3D | `arena/3d` | **Falha**: contexto equivalente não reconhecido |
| "Jogo do padrinho com câmera em terceira pessoa, cidade, negócios e 3D" | Ação urbana 3D | `arena/3d` | **Falha**: descrição leiga não alcança os requisitos rígidos |
| "GoldenEye 077, em primeira pessoa, guardas, alarmes" | FPS 3D | `fps/3d` | Gênero correto, objetivos de alarme não comprovados |
| "Corrida 3D, 3 voltas, tuning" | Corrida 3D | `racing/3d` | Gênero correto; tuning avançado não validado |
| "Donkey Kong Country 3 com pulos e chefes 2D" | Plataforma 2D | `platform/2d` | Gênero correto |
| "Terror 3D em primeira pessoa, esconder, fugir, sem tiros" | Terror/stealth em primeira pessoa | `fps/3d`; sem pendências especiais | **Cobertura semântica insuficiente**, mesmo com câmera identificada |
| "RPG 3D com inventário, diálogos, quests e habilidades" | RPG 3D com sistemas próprios | `rpg/3d`; só inventário sinalizado como pendente | **Cobertura insuficiente** de diálogos, quests e skills |
| "Farming Simulator 3D, dirigir, plantar, vender, construir" | Simulação agrícola | `arena/3d` | Fora do catálogo; deveria apresentar incompatibilidade, não parecer suficiente |
| "Vikings, navegar barcos, roubar tesouro, evoluir navio" | Aventura naval | `arena/2d` | Sem gênero esperado explícito na amostra; falta detectar núcleo naval e explicar a aproximação |

**Métrica proposta:** manter um conjunto versionado de ao menos 100 pedidos curtos + 30 GDDs reais/derivados com autorização, com `expectedGenre`, `dimension`, `mustHave`, `mustNotHave`, prioridade, status de compilação e evidência de runtime. Meta de aceite inicial: **95% de gênero/dimensão nos casos com suporte**, **100% de bloqueio honesto quando não suportado** e **zero violação explícita de "sem X"**. Esses percentuais são **metas futuras**, não medição atual.

## Sequência recomendada de execução

### Ciclo 0 — fechar riscos de publicação e compatibilidade (P0)
**GF-001.** Migrar Pages para GitHub Actions, verificar deploy único e bloquear CI falha. Garantir execução das suítes Node e Chromium do HEAD. Não desenvolver novas features sem pipeline verde.

### Ciclo 1 — interpretar como um designer de jogos (P0)
**GF-003/004.** Construir o `GameDesignIR`, registrar negações, papéis, câmera, objetivo, estados, fase, assets e limitações. Testar os 3 pedidos urbanos falhos; eliminar fallback silencioso. Distinguir "ambiente 3D" de "jogo de nave 3D", "cidade com carro" de "corrida" e "60 FPS" de "FPS de tiro". Exibir contrato compreensível a um iniciante antes de gerar.

### Ciclo 2 — GDD que produz gameplay diferente (P1)
**GF-028/010.** Expandir o protótipo urbano e modelos existentes por dados, não por clonagem de cena hardcoded. Priorizar uma missão realmente concluível com save robusto e recompensa idempotente em dois projetos diferentes; depois expandir direção/polícia/interiores separadamente, cada qual com teste.

### Ciclo 3 — não quebrar projetos ao evoluir (P1)
**GF-007/008/009.** Fonte única de `GAME_SPEC`, diff transacional, controladores menores e migração de save. Adicionar teste de dois projetos com mesmo título para impedir mistura de progresso urbano.

### Ciclo 4 — modelos e desempenho de nível de jogo (P1)
**GF-015/016/017/019.** Um personagem animado real por vez, atribuição por papel, orçamento de memória/GPU e testes WebGL em hardware. Não anunciar suporte irrestrito a GLB quando só cenário estático está integrado.

### Ciclo 5 — simplicidade da interface e segurança de integração (P2)
**GF-006/020/021/027.** Interface enxuta, feedback de capacidades, auditoria de inputs/importações, backend opcional, licenças de assets, notas de versão verificáveis.

## Critério de "próxima" e disciplina do checkpoint

Cada turno futuro deve selecionar **um ID principal**, com:
1. Estado e SHA de origem, falha reproduzível e hipótese.
2. Código modificado + contrato + teste de regressão no gênero adjacente.
3. Jogo exportado e/ou cenário Chromium executando a mecânica, com comparação antes/depois.
4. CI **do SHA final** verde e publicação verificada; caso contrário status **EM REVISÃO**.
5. Checkpoint atualizado com o que **ficou de fora** e próximo ID claro.

**Decisão recomendada para a próxima execução:** **GF-001 (fechar a rota duplicada de Pages)**, dependente de configuração administrativa. Em paralelo, no código: **GF-003/004 – detector/IR de pedidos curtos com avaliação versionada dos três erros urbanos e das restrições negativas**. Não saltar direto para novos modelos ou mais gêneros antes de tornar as instruções confiáveis.

## Arquivos e evidências

- `js/parser.js`, `js/urban-design.js`, `js/intent-compiler.js`: classificação, interpretação, pendências.
- `js/game-capabilities.js`, `js/generator.js`, `js/development-engine.js`: contrato e geração, evolução incremental.
- `js/urban-runtime.js`, `js/urban-rules.js`, `js/three-runtime.js`: protótipos de gameplay e limites do motor 3D.
- `js/glb-runtime.js`, `js/asset-library.js`, `js/project-backup.js`: geometria estática, integridade e continuidade.
- `js/app.js`, `js/engineering-workbench.js`: composição do Studio e backend opcional.
- `.github/workflows/verify.yml`, `.github/workflows/publish-verified.yml`, `tests/browser-export-matrix.py`, `tests/browser-project-continuity-gf005.py`: verificação e publicação.
- `docs/PLANO_MESTRE_GAMEFORGE.md`, `docs/CHECKPOINT_DIVERSIDADE_JOGOS.md` e relatórios GF-003/GF-004/GF-005: histórico de entregas e dívida anterior.

**Observação de concorrência:** foram observados novos commits de URB-01 enquanto esta auditoria era produzida. Um protótipo integrado pode ser adicionado e passar CI depois da inspeção; nenhuma afirmação de aprovação definitiva deve ser extrapolada de uma execução pendente. Revise o HEAD novamente antes de implementar cada item.
