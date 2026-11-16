# Skill aplicada — Ação urbana 3D em terceira pessoa (GameForge)

**Origem:** arquivos fornecidos pelo usuário em 16/11/2026: `GDD_GODFATHER_COMPLETO(1).md` (legado 2D v1.2), `GDD_GODFATHER_THREEJS_3D_COMPLETO(1).md` (alvo de conversão 3D v2.0) e `SKILL_GAMEFORGE_URBAN_THREEJS(1).md` (regras de desenvolvimento). Os GDDs são referências do projeto, **não são o runtime 3D**.

## 1. Roteamento inteligente

- Reconhecer `urban-action` + `3d` + `third-person` quando o **gênero principal** do documento for ação urbana com protagonista a pé, cidade, negócios, missões, veículos e polícia.
- Não classificar uma perseguição de carro como jogo de corrida, nem um tiroteio como FPS. `60 FPS` é desempenho, não câmera.
- Não confundir o **Godfather Web Edition existente**, descrito como Canvas 2D em visão superior/oblíqua, com o **Godfather Web 3D**, que é um projeto **não implementado**.
- Não converter GDDs de espionagem em primeira pessoa, naves, plataforma ou corrida para ação urbana sem evidências do gênero predominante.
- `urban-action` integra agora os **15 pares de motores exportáveis** como **URB-01: um bairro 3D jogável**, sem usar FPS ou arena como substitutos. O GameForge continua gerando o contrato e o plano do GDD, mas o runtime urbano cobre apenas o primeiro bairro e uma missão; o restante da campanha ainda precisa ser desenvolvido.

**Código implementado:** `js/urban-design.js` (identificação e matriz de requisitos), `js/parser.js` (classificação), `js/app.js` (baixar plano), `js/urban-rules.js` (colisões, tiros, captura, save), `js/urban-runtime.js` (bairro, jogador, missão e câmera), `js/generator.js` (exportar o slice), `tests/urban-slice.test.js`, `tests/urban-design.test.js` (regressões) e `tests/browser-export-matrix.py` (uso do Studio no Chromium).

## 2. Contrato inicial

Ao carregar um GDD urbano 3D, o Studio identifica:

| Campo | Valor | Estado no GameForge |
|---|---|---|
| Gênero | `urban-action` | Protótipo jogável URB-01, uma missão, não um mundo aberto completo |
| Dimensão | `3d` | Reconhecida |
| Câmera principal | `third-person` | Executável no protótipo; câmera por trás do personagem, oclusão avançada pendente |
| Plano de sistemas | `urbanProfile.requirements` com origem de cada linha | Exportável como ZIP |
| Conteúdo e quantidades | `contentCounts` **somente se aparecem no documento** | Planejamento, não objetos instanciados |
| Salvamento | Save 3D versionado, sem sobrescrever save 2D | Implementação básica `gameforge-urban-v1-<titulo>` em localStorage |
| Prova de jogabilidade | Testes unitários, integração e Chromium; movimento, combate, captura, save | URB-01 validado em browser de CI; hardware real e campanha pendentes |

A classificação de capacidades usa `partial` nos oito sistemas básicos do slice e `planned` para os demais; **parcial não equivale a implementação integral do GDD**. O ZIP de planejamento contém `GAME_DESIGN_CONTRACT.json`, `PLANO_URBAN_ACTION.md` e o `GDD_original.md` integral; o ZIP jogável gerado pelo Studio contém `game.js`, `engine-3d.js`, `SLICE_URBAN_3D.md` e o GDD original. São exportações diferentes.

## 3. Plano de implementação do motor

### URB-01 · Vertical slice jogável — VALIDADO no escopo Chromium

**Cena mínima:** um bairro com ruas e colisores, jogador 3D em terceira pessoa, mira, combate com um inimigo, um negócio capturável, uma missão com recompensa, HUD, pausa, save/load.

**Concluído no slice:** personagem low-poly em câmera sobre o ombro, rua e edifícios com colisores XZ, tiros direcionais com bloqueio por edifício, guarda que se aproxima e ataca, pistola com recarga, um armazém capturável, recompensa única de exemplo ($450), HUD, pausa, teclas e touch básicos, save local com versão isolada. A missão pode ser concluída e o dinheiro permanece igual após recarregar. Este gameplay é genérico e **não recria a campanha do Godfather**.

**Evidência:** CI [43887382720](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43887382720), SHA `9ec2995cb8b139f4a12a62cafdfbd82ada7c9a97`: 261 testes Node e 17 cenários Chromium aprovados; Chromium testa o fluxo completo de matar guarda, andar até a porta, capturar, salvar e abrir novamente sem recompensa duplicada. Testes em celulares físicos, gameplay variado e rig GLB continuam pendentes.

### URB-02 · Movimentação, câmera e IA

XZ = chão, Y = vertical; cápsulas lógicas e malhas visuais separadas; câmera com colisão e suavização; IA patrulha/suspeita/perseguição/combate; timestep fixo 60 Hz, máximo 5 passos; pausar e retornar de outra aba sem simular grandes saltos.

### URB-03 · Economia e progressão

Compra de armas/munição e melhorias de HP/armadura/estamina em transações atômicas, custos e tetos validados; a simulação é autoridade do estado, não o HUD. Salvar progresso sem sobrescrever projeto/backup ou save 2D.

### URB-04 · Cidade, veículos, polícia e interiores

Entrar/sair de carros, direção arcade e colisão, polícia com nível de procurado, interiores carregados sob demanda, defesa/recaptura de imóveis e atualização de renda. Usar setor ativo + vizinhos, sem carregar três cidades completas simultaneamente.

### URB-05 · Assets GLB, animações e desempenho

Pipeline de `GLTFLoader` com scale/orientation, rig e clips `idle/walk/run/aim/fire/reload/hit/dead`. Sem clips, proxy identificado como provisório. Perfis de qualidade, culling/LOD e medição de FPS/draw calls/memória.

## 4. Exemplo Godfather — números NÃO são padrão do gênero

O **GDD 2D** documenta três cidades (Nova Corleone, Palermo Oscura e Chicago Noir), 18 distritos, 36 negócios, 24 missões (8 modelos por cidade), três chefes em três fases, HP de 100 a 250 e pistola/shotgun/metralhadora. O **GDD de conversão** preserva esses números como *metas para a implementação 3D*.

O vertical slice recomendado no documento de conversão é **Porto Velho**, Nova Corleone, com dois negócios; isso não prova que a campanha 3D foi criada. Os nomes e contagens não devem ser injetados em outros projetos.

## 5. Critérios de continuidade

1. Ler GDD, skill, este contrato e checkpoint antes de começar uma etapa.
2. Selecionar uma tarefa URB principal por implementação; registrar causa, arquivos, commit, regressões e diferenças entre GDD original/3D.
3. Implementar código **usado pelo jogo**, nunca somente botão, JSON ou personagem em pose T.
4. Testar no Node e no Chromium; registrar limitações de QA visual, mobile, licenças e migração.
5. Somente marcar `implementado` depois de fluxo completo; `validado` requer testes reais; `publicado` requer deploy verificado.
6. Os assets de franquias comerciais exigem direitos de uso para redistribuição; criar arte e identidade próprias quando necessário.

**Próximo desenvolvimento do motor: URB-02.** Priorizar câmera sem atravessar edifícios, mira baseada no retículo, guardas com estados de patrulha/alerta/busca/combate, rotas e mais opções de movimentação. URB-03 a URB-05 permanecem pendentes; GF-001 requer confirmar a proteção da publicação pela configuração do Pages.

## 6. Action Model v2 — interpretar a lógica de uma missão

**Modelo:** GDD ou comando natural → ações, objetos, quantidades, fases, pré-requisitos e efeitos → missões estruturadas. O GameForge preserva a redação original, mas não executa texto do GDD.

**Exemplo reproduzível:**
- Missão 1: “Colete 2 provas no bairro; depois entregue 2 provas no armazém; recompensa 600.”
- Missão 2: “Capture o armazém depois de eliminar 1 guarda; recompensa 850.”
- O compilador gera duas missões realmente diferentes: a primeira coleta objetos até completar 2/2 e só depois habilita entrega; a segunda exige derrotar o guarda antes de capturar. O jogo guarda a etapa e o dinheiro, sem recompensa duplicada.

**Arquivos da execução:** js/mission-semantics.js, js/urban-mission-flow.js, js/urban-mission-runtime.js, tests/mission-semantics.test.js e tests/browser-export-matrix.py. MODELO_ACOES.json e PLANO_ACOES.md são exportados com o jogo, para facilitar auditoria da interpretação.

**Não confundir planejamento com gameplay:** só estão disponíveis no motor atual até 3 fases, 3 guardas ou provas, entrega/captura no armazém e eventos de coleta/combate básicos. Dirigir carros, fugir da polícia, invadir interiores, condições numéricas complexas e ramificações continuam pendentes e devem aparecer no relatório. Se as missões explícitas não tiverem nenhuma etapa viável, o gerador bloqueia o fallback genérico.

**Teste final de referência:** [Actions 43896601850](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43896601850), 277 testes Node e 18 cenários Chromium, incluindo jogo com duas missões por GDD. Confirmar CI dos commits seguintes antes de marcar validado.

## 7. URB-02 — câmera anti-oclusão (16/11/2026)

**Código implementado; CI do HEAD precisa ser confirmada antes de marcar VALIDADO.**

- `js/urban-rules.js` implementa `cameraPosition(eye,wanted,solids,radius)`: colisão por interseção de segmento com caixas 3D (AABB), margem de segurança e retorno `occluded`. A checagem leva em conta X/Z, altura e dimensões dos prédios; sem depender do Three.js para testar.
- `js/urban-runtime.js` e `js/urban-mission-runtime.js` aplicam o cálculo tanto na posição inicial quanto no acompanhamento quadro a quadro, verificando também a posição interpolada para não atravessar uma parede durante a suavização.
- A telemetria local `__gameforgeTelemetry()` inclui `cameraOccluded` para diagnóstico no Chromium.
- `tests/urban-slice.test.js` cobre obstáculo, caminho livre, altura, margem e integração estática nos dois runtimes.
- **Limites:** câmera segue em terceira pessoa com ângulo fixo e só considera os volumes explicitamente fornecidos. Ainda falta câmera orbital, oclusão por objetos móveis, testes de usabilidade em celular real e IA urbana com estados de patrulha/alerta/busca/combate.
- **Próximo passo URB-02:** guardas com patrulha e estados de percepção; preservar saves existentes, interface touch e orçamento gráfico. GF-001 (fonte do Pages via GitHub Actions) continua como ajuste administrativo independente.

## 8. URB-02 — IA de guardas por estados (16/11/2026)

**Código implementado; ainda não equivale a uma IA completa de cidade.**

- `js/urban-rules.js` inclui `guardStep(guard,player,dt,solids)`, máquina determinística com quatro estados: `patrol` (percurso curto ao redor da posição inicial), `alert` (persegue jogador visível), `search` (procura a última posição conhecida após perder linha de visão) e `combat` (perto e com visão livre).
- Obstáculos bloqueiam a detecção por `clearShot`, e a movimentação usa `move` e os mesmos blocos sólidos da cidade. Sem sorteio, dependência de rede ou temporizadores independentes do timestep.
- O guarda do URB-01 e os guardas de fases compostas pelo GDD executam a mesma regra. A telemetria informa `guardMode` (URB-01) ou `guardModes` (missões).
- `tests/urban-slice.test.js` cobre transições, perda de visão, retorno à patrulha, ataque proibido através da parede, colisão e passo de simulação.
- **Limites:** patrulha é local e curta; ainda não há grafo de rotas, campo de visão angular, cobertura tática, comunicação entre guardas, animações GLB ou interiores complexos. Estado momentâneo de guarda não é persistido no save; a progressão da missão continua persistida normalmente. A validação no Chromium do SHA final é necessária antes de marcar a entrega como VALIDADA.
- **Próximo foco:** melhorar navegação por rotas/cobertura e mira em terceira pessoa, depois expandir objetivos e condições executáveis do Action Model, sem inventar funcionalidades do GDD.
