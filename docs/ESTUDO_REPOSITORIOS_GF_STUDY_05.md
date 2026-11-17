# Estudo de repositórios para evolução do GameForge — GF-STUDY-05

Data: 17/11/2026. Base do GameForge: `0db979176b3539164108385f092ee77ca12caacf`. Entrega: versão 0.23.0.

## Escopo e resultado

Foram localizados 20 repositórios públicos na busca da conta `luispauloalves500`, além dos projetos disponíveis da conta `jogoiarexx-blip`. Este estudo **não auditou integralmente todos os jogos**: fez uma leitura seletiva de trechos representativos de **22 arquivos em nove projetos**, incluindo seis projetos da primeira conta e três da segunda.

O resultado são **17 técnicas novas no catálogo**, agora com 56 referências em 25 repositórios considerando as referências anteriores. A leitura foi estática: não foram executados os jogos externos nem confirmadas suas próprias alegações de QA/desempenho. Os hashes de blobs permitem verificar exatamente quais arquivos foram consultados.

Não houve fine-tuning de um modelo externo, cópia de histórias, sprites, músicas ou arquivos de código dos jogos para os runtimes do GameForge. O treinamento aplicado consiste em curadoria de referências, interpretação de pedidos, testes de recuperação e uma implementação autoral de cache de renderização.

## Aproveitamento concreto nesta entrega

1. **Catálogo pesquisável:** as técnicas novas entram na busca existente, incluindo formas coloquiais e flexões como “peixinho”, “guardar quadros do boneco” e “save quebrado”.
2. **Plano por pedido:** o parser seleciona até quatro referências e grava fonte, evidência, técnica, testes e limites no `GAME_SPEC.learningPlan`.
3. **Exportação e backup:** `PLANO_APRENDIZADO.json` e `FONTES_ESTUDADAS.md` acompanham o jogo; a instrução para IA opcional também inclui resumos técnicos, sem importar fontes automaticamente.
4. **Interface:** apresenta a conta/repositório completos, distingue código de documento e mostra as técnicas selecionadas.
5. **Cache procedural autoral:** inspirado na técnica estudada em Brasa de Aço, rasteriza quadros finitos dos atores compartilhados e superfícies 2D uma vez e reutiliza os desenhos. Usa LRU, limite de 64 itens e orçamento estimado de pixels RGBA de 1/2/4 MiB conforme qualidade; não é medição da memória total do navegador ou GPU. Descarta a memória dos canvases removidos, evita repetição de pintura e mantém os estados de gameplay separados.

O cache é usado nos atores/superfícies compartilhados, alcançando diretamente arena 2D, plataformas e superfícies de simulação. **Não converte automaticamente todos os desenhos legados em sprites nem otimiza todos os motores 3D.** Os demais modelos continuam usando sua própria renderização e recebem as referências/plano. Não foi medido ganho de FPS em aparelhos físicos; os testes comprovam reutilização e limites, não um percentual de aceleração.

## Técnicas estudadas

| Técnica | Projeto | Evidência | Aplicação recomendada |
|---|---|---|---|
| Atributos, equipamento e custos de evolução separados da interface | luispauloalves500/Nexo-Ascensao | Trecho de código inspecionado | Criar regras puras para XP, limites, slots e custos; testar gasto e equipamento antes de alterar o estado. |
| Objetivos por contadores e recompensa resgatável uma vez | luispauloalves500/Nexo-Ascensao | Trecho de código inspecionado | Associar eventos a objetivos por dados; separar completar de resgatar e usar identificador persistente de recompensa. |
| Validar e limitar o conteúdo do save antes de restaurar | luispauloalves500/Nexo-Ascensao | Trecho de código inspecionado | Validar esquema e IDs conhecidos; rejeitar inventário inválido e manter erro de armazenamento visível. |
| Texturas procedurais reproduzíveis de terra, metal e desgaste | luispauloalves500/sucata-zero | Trecho de código inspecionado | Gerar uma vez por material/paleta; guardar por chave, limitar resolução e descartar recursos próprios. |
| Carregamento com fallback visível e distinção entre modelo real e emergência | luispauloalves500/sucata-zero | Trecho de código inspecionado | Preservar clipes, separar posse de recursos e expor erros; não assumir que o progresso em bytes do exemplo está completo. |
| Transações, receitas e peças essenciais sem duplicar concessões | luispauloalves500/sucata-zero | Trecho de código inspecionado | Validar todos os custos antes de debitar; proteger peças essenciais e tornar concessões idempotentes. |
| Reservatório de projéteis com capacidade limitada | luispauloalves500/asas-do-eclipse | Trecho de código inspecionado | Resetar todos os campos na reutilização e definir política explícita de saturação; não copiar a exceção fatal do exemplo sem avaliar o jogo. |
| Cenário em blocos repetíveis e lotes instanciados | luispauloalves500/asas-do-eclipse | Trecho de código inspecionado | Agrupar decoração estática, repetir blocos sem saltos e manter colisões e objetivos independentes do visual. |
| Frames procedurais em cache por pose e direção | luispauloalves500/brasa-de-aco | Trecho de código inspecionado | Separar desenho e simulação; rasterizar quadros finitos e usar cache limitado por memória e quantidade. |
| Recuperação de save e preferências de acessibilidade | luispauloalves500/brasa-de-aco | Trecho de código inspecionado | Tratar checksum como integridade acidental, não autenticação; preservar o save inválido antes de restaurar backup. |
| Visibilidade decorativa com histerese e frequência controlada | luispauloalves500/madrugacraft-3d | Trecho de código inspecionado | Alterar só renderização de decoração; manter colisores e reduzir oscilação perto dos limites. |
| Alimentação isolada por aquário e alimento reservado | jogoiarexx-blip/Abyss-Garden | Trecho de código inspecionado | Modelar alimento, fome e recipiente; garantir consumo único e impedir alimentar tanques vizinhos. |
| Crescimento condicionado ao cuidado e estimativa de tempo | jogoiarexx-blip/Abyss-Garden | Trecho de código inspecionado | Separar idade e velocidade de crescimento; calcular previsão a partir do estado atual, sem avançar durante pausa. |
| Valor de venda depende da evolução e consumo é único | jogoiarexx-blip/Abyss-Garden | Trecho de código inspecionado | Usar funções puras de preço e transação única; registrar claramente fatores de valor. |
| Reparo com fases visuais coerentes com o progresso | jogoiarexx-blip/Mecanica-do-ze | Trecho de código inspecionado | Derivar a fase visual do progresso validado; efeitos não podem conceder progresso ou pagamento. |
| Evolução por escolhas que alteram a ação principal | luispauloalves500/nidara | Documento, fonte modular não auditada | Transformar cada escolha em contrato de ação/condição/efeito e declarar o motor naval/evolutivo pendente. |
| Estratégia por turnos exige regras próprias de tabuleiro | jogoiarexx-blip/ARKHOS-coliseu-primordial | Documento, fonte modular não auditada | Planejar estado de turno, validação de movimento/alcance e fim da partida; não mapear para arena em tempo real. |

## O que merece implementação em seguida

| Prioridade | Módulo | Fontes úteis | Critério de aceite |
|---|---|---|---|
| Alta | Crescimento e necessidades de criaturas | Abyss Garden | Fome/água alteram crescimento; pausa para o relógio; alimento não atende dois tanques; valor de venda aumenta conforme estágio |
| Alta | Texturas procedurais com ciclo de vida | Sucata Zero | Mesma semente gera mesma textura; criação fora do frame; memória libera ao descartar fase sem destruir assets compartilhados |
| Alta | Objetivos e recompensas por eventos | Nexo Ascensão | Contador correto, resgate único e restauração sem duplicar recompensas |
| Média | Inventário/oficina por transações | Sucata Zero + Mecânica do Zé | Não fabricar sem receita/insumos; não desmontar peça essencial; fases visuais refletem progresso real |
| Média | Decoração instanciada e visibilidade | Asas do Eclipse + Madrugacraft | Medir draw calls; decoração distante some com histerese; colisores e missões continuam válidos |
| Média | Pool de projéteis | Asas do Eclipse | Reset completo de estado e comportamento definido quando o pool lota; nenhuma falha fatal em combate |
| Planejamento | Evolução morfológica e estratégia por turnos | Nídara + ARKHOS | Obter/reconstruir fonte modular e criar motores específicos; não substituir por arena em tempo real |

Esses módulos não são declarados prontos apenas porque suas referências foram selecionadas. Crafting, regras de evolução, turnos e outros sistemas ainda não implementados continuam pendentes no contrato do jogo.

## Cuidados encontrados na leitura

- Em `sucata-zero/src/engine/assets.ts`, há uma parcela de progresso fracionário multiplicada por `0.0`. O exemplo serve para estudar erro/fallback e organização de assets, mas não comprova progresso preciso por bytes. Esse trecho não foi copiado.
- O pool de projéteis de Asas do Eclipse lança erro quando esgota a capacidade. Antes de aplicar a ideia a um runtime, definir descarte, reserva ou expansão limitada e testar saturação.
- Checksum de save em Brasa de Aço ajuda a detectar corrupção acidental; não é autenticação nem impede alterações intencionais por quem controla o cliente.
- Nídara distribui bundles compilados; nesta etapa só README e GDD foram estudados. ARKHOS também informa distribuir bundle sem os módulos originais. Não foram tratados como código modular auditado.
- O manifesto de assets de Asas do Eclipse descreve recursos originais e licenças de dependências, inclusive Three.js MIT. **Isso não foi interpretado como licença geral para copiar o jogo inteiro.**

## Proveniência e reutilização

Não foi localizada licença geral de código nas árvores consultadas desses nove projetos. Isso não impediu o estudo conceitual e a elaboração dos resumos. A implementação adicionada ao GameForge é autoral; nenhum asset ou arquivo de fonte desses jogos foi redistribuído.

Antes de incorporar código ou arte de terceiros, localizar a licença aplicável, preservar avisos e atribuições e conferir o escopo por arquivo. A licença de uma biblioteca como Three.js não cobre automaticamente o código, a história e os assets do jogo que a utiliza.

## Fontes consultadas

| Repositório | Arquivo | Blob consultado | Tipo |
|---|---|---|---|
| luispauloalves500/Nexo-Ascensao | [src/systems/Progression.js](https://github.com/luispauloalves500/Nexo-Ascensao/blob/main/src/systems/Progression.js) | `6ec6ca41301d1108371acf534e3578220e2be987` | Código |
| luispauloalves500/Nexo-Ascensao | [src/systems/Quests.js](https://github.com/luispauloalves500/Nexo-Ascensao/blob/main/src/systems/Quests.js) | `e3507a57508f15e595fcc2a0f650d4dc1e59b123` | Código |
| luispauloalves500/Nexo-Ascensao | [src/systems/SaveSystem.js](https://github.com/luispauloalves500/Nexo-Ascensao/blob/main/src/systems/SaveSystem.js) | `247013921a596db81dc62b6e8c390ca8cfb1e5fb` | Código |
| luispauloalves500/sucata-zero | [src/world/textures.ts](https://github.com/luispauloalves500/sucata-zero/blob/main/src/world/textures.ts) | `ee723fd3321f592a188110b96d3f95525a37b2f2` | Código |
| luispauloalves500/sucata-zero | [src/engine/assets.ts](https://github.com/luispauloalves500/sucata-zero/blob/main/src/engine/assets.ts) | `87d1f63787fc33ac875415b507c0751e519c30bd` | Código |
| luispauloalves500/sucata-zero | [src/items/inventory.ts](https://github.com/luispauloalves500/sucata-zero/blob/main/src/items/inventory.ts) | `85f3b716a7c107a97c14230d86a96f693be01f26` | Código |
| luispauloalves500/asas-do-eclipse | [ASSET_LICENSES.md](https://github.com/luispauloalves500/asas-do-eclipse/blob/main/ASSET_LICENSES.md) | `b9653557a71b95f0694aa69f288bce9fae7b7b00` | Documento |
| luispauloalves500/asas-do-eclipse | [src/gameplay/EntityPool.ts](https://github.com/luispauloalves500/asas-do-eclipse/blob/main/src/gameplay/EntityPool.ts) | `02f99907b29341fcce20c760d14ef9e1ad40b28f` | Código |
| luispauloalves500/asas-do-eclipse | [src/render/Atmosphere.ts](https://github.com/luispauloalves500/asas-do-eclipse/blob/main/src/render/Atmosphere.ts) | `db0b802a5afedba55d9a96ffb39e052274078c05` | Código |
| luispauloalves500/asas-do-eclipse | [src/render/Terrain.ts](https://github.com/luispauloalves500/asas-do-eclipse/blob/main/src/render/Terrain.ts) | `7f9789f49ec36ccf0d46c3ffc408bb899ee3a207` | Código |
| luispauloalves500/brasa-de-aco | [src/sprites.js](https://github.com/luispauloalves500/brasa-de-aco/blob/main/src/sprites.js) | `b0bcc8dea1416e51d28b7be1a49c1170ac4bc152` | Código |
| luispauloalves500/brasa-de-aco | [src/storage.js](https://github.com/luispauloalves500/brasa-de-aco/blob/main/src/storage.js) | `61c6e67305865be05549241ae48f75e981e2901a` | Código |
| luispauloalves500/madrugacraft-3d | [src/render/quality.js](https://github.com/luispauloalves500/madrugacraft-3d/blob/main/src/render/quality.js) | `d7fb44feed5ef3c243b5e2848f175173968ef457` | Código |
| luispauloalves500/madrugacraft-3d | [src/render/visibility.js](https://github.com/luispauloalves500/madrugacraft-3d/blob/main/src/render/visibility.js) | `0ec70c1d9b4f33e66a1cf590a4aa85caad53debf` | Código |
| luispauloalves500/nidara | [README.md](https://github.com/luispauloalves500/nidara/blob/main/README.md) | `489b1f4467f6ca74d1edd420a420742e1b2d4532` | Documento |
| luispauloalves500/nidara | [GDD.md](https://github.com/luispauloalves500/nidara/blob/main/GDD.md) | `6c69b8506a4c9e5129eaf9ebc16d86873b839630` | Documento |
| jogoiarexx-blip/Abyss-Garden | [js/systems/FeedingSystem.js](https://github.com/jogoiarexx-blip/Abyss-Garden/blob/main/js/systems/FeedingSystem.js) | `645d0bfd7c1faf7c13f1f9e733ef020a17d823de` | Código |
| jogoiarexx-blip/Abyss-Garden | [js/systems/GrowthTimer.js](https://github.com/jogoiarexx-blip/Abyss-Garden/blob/main/js/systems/GrowthTimer.js) | `1272383519c1e1086c8aa2e4527e7cead9802b7d` | Código |
| jogoiarexx-blip/Abyss-Garden | [js/systems/SaleSystem.js](https://github.com/jogoiarexx-blip/Abyss-Garden/blob/main/js/systems/SaleSystem.js) | `ce66a524947e19be7438803846234668240d8d56` | Código |
| jogoiarexx-blip/Abyss-Garden | [js/systems/ProductionSystem.js](https://github.com/jogoiarexx-blip/Abyss-Garden/blob/main/js/systems/ProductionSystem.js) | `dfea3a56c0a4773c871d5211b750b933394db118` | Código |
| jogoiarexx-blip/Mecanica-do-ze | [js/repair-systems.js](https://github.com/jogoiarexx-blip/Mecanica-do-ze/blob/main/js/repair-systems.js) | `8107438e0f668ed7bb672f88402f67d4a7da4bb2` | Código |
| jogoiarexx-blip/ARKHOS-coliseu-primordial | [README.md](https://github.com/jogoiarexx-blip/ARKHOS-coliseu-primordial/blob/main/README.md) | `e91f7e636f82803171bdaf60ed2712dae787d8e6` | Documento |

O manifesto legível por máquina está em `training/repository-study-v5.json`. Os resumos do catálogo ficam em `js/repository-lessons.js`; não contêm os códigos originais.

## Verificação

- **393 testes Node aprovados** na árvore local, incluindo sete novos testes de cache/estudo.
- **34 consultas em português** recuperam a técnica esperada entre os oito primeiros resultados. São testes do catálogo, separados dos 400 casos anteriores de geração; não significam 34 novas mecânicas prontas.
- Os testes verificam hashes e tipos de evidência, preservação do gênero e das pendências, instrução para IA e backup dos relatórios.
- O cache tem testes de LRU, orçamento em bytes, item excessivo, descarte com falha e pintura única por chave.
- **17 variantes de exportação** têm sintaxe e dependências locais verificadas.
- A suíte Chromium exige cache ativo/reutilizado e orçamento respeitado em arena, plataforma e simulação 2D, além da matriz existente. Confirmar o resultado no Actions do commit final. Não houve medição física em Android/iOS.

## Limites do aprendizado

A busca é lexical, com aliases revisados; não é entendimento universal de linguagem. A seleção de referência é evidência de estudo, não prova de que a mecânica existe no runtime. Os planos guardam esse estado como `reference`. Para completar uma mecânica nova, são necessários código, teste de comportamento e execução do jogo exportado.

