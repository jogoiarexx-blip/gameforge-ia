# Skill aplicada — Ação urbana 3D em terceira pessoa (GameForge)

**Origem:** arquivos fornecidos pelo usuário em 16/11/2026: `GDD_GODFATHER_COMPLETO(1).md` (legado 2D v1.2), `GDD_GODFATHER_THREEJS_3D_COMPLETO(1).md` (alvo de conversão 3D v2.0) e `SKILL_GAMEFORGE_URBAN_THREEJS(1).md` (regras de desenvolvimento). Os GDDs são referências do projeto, **não são o runtime 3D**.

## 1. Roteamento inteligente

- Reconhecer `urban-action` + `3d` + `third-person` quando o **gênero principal** do documento for ação urbana com protagonista a pé, cidade, negócios, missões, veículos e polícia.
- Não classificar uma perseguição de carro como jogo de corrida, nem um tiroteio como FPS. `60 FPS` é desempenho, não câmera.
- Não confundir o **Godfather Web Edition existente**, descrito como Canvas 2D em visão superior/oblíqua, com o **Godfather Web 3D**, que é um projeto **não implementado**.
- Não converter GDDs de espionagem em primeira pessoa, naves, plataforma ou corrida para ação urbana sem evidências do gênero predominante.
- `urban-action` ainda não figura entre os 14 motores executáveis da versão atual. O GameForge gera **contrato + plano**, com os requisitos pendentes, sem exportar um falso jogo `arena`/FPS.

**Código implementado:** `js/urban-design.js` (identificação e matriz de requisitos), `js/parser.js` (classificação), `js/app.js` (baixar plano), `js/generator.js` (rejeitar motor não existente), `tests/urban-design.test.js` (regressões) e `tests/browser-export-matrix.py` (uso do Studio no Chromium).

## 2. Contrato inicial

Ao carregar um GDD urbano 3D, o Studio identifica:

| Campo | Valor | Estado no GameForge |
|---|---|---|
| Gênero | `urban-action` | Reconhecido; motor novo pendente |
| Dimensão | `3d` | Reconhecida |
| Câmera principal | `third-person` | Exigência reconhecida, não executável |
| Plano de sistemas | `urbanProfile.requirements` com origem de cada linha | Exportável como ZIP |
| Conteúdo e quantidades | `contentCounts` **somente se aparecem no documento** | Planejamento, não objetos instanciados |
| Salvamento | Save 3D versionado, sem sobrescrever save 2D | Alvo técnico |
| Prova de jogabilidade | Testes unitários, integração, Chromium/WebGL, progressão e save | Pendente para o novo motor |

A classificação de capacidades usa `planned`, não confundir com `implementada`. O ZIP contém `GAME_DESIGN_CONTRACT.json`, `PLANO_URBAN_ACTION.md` e o `GDD_original.md` integral enviado ao Studio; **não contém `game.js`**, pois não existe um motor urbano completo.

## 3. Plano de implementação do motor

### URB-01 · Vertical slice jogável, prioridade 1

**Cena mínima:** um bairro com ruas e colisores, jogador 3D em terceira pessoa, mira, combate com um inimigo, um negócio capturável, uma missão com recompensa, HUD, pausa, save/load.

**Aceite:** iniciar, caminhar sem atravessar paredes, mirar e disparar, derrotar inimigo, interagir com negócio e concluir missão, salvar e recarregar sem recompensa duplicada. Testes de motor, navegador real e compatibilidade de teclado.

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

**Próximo desenvolvimento de motor recomendado:** URB-01, separado das tarefas GF-001/GF-005 ainda pendentes.
