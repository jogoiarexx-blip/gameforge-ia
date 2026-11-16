# GF-003 — Auditoria do acervo de jogos e melhoria do entendimento de GDD

Data: 16/11/2026. Repositórios do proprietário: `jogoiarexx-blip`.

## Escopo comprovado

- A listagem do GitHub retornou **94 repositórios acessíveis**. Isto **não** significa que todos os 94 foram auditados profundamente ou que todos são jogos.
- Foram examinadas as árvores de 15 repositórios e tentada a leitura de Operacao-eden, que apresentou timeout nessa consulta. O código existente do GameForge já contém registros de uma inspeção anterior desse projeto; isso não substitui a leitura indisponível nesta rodada.
- Nesta auditoria foram abertas fontes concretas de GoldenEye, Neon Sky Force, Dragon Fury, Folclorevania, Brumária, Godfather, Carga Pesada, Brinquedos vs. Pesadelos, Grim Grove e Madruga Survival. As fontes de outros jogos, como Driver 2 e Iron Barricade, também tiveram suas árvores verificadas, mas não recebem aqui um parecer aprofundado.
- O catálogo `js/game-corpus.js` **não contém os GDDs completos, sprites, modelos nem código transplantado**. Inclui metadados, caminhos verificáveis, gênero esperado, interpretação de engenharia e limites de implementação.

## Resultados com GDDs/documentos reais

Antes/depois = execução de `GameForgeParser.parseGdd()` com o **texto completo dos arquivos recuperados** e detecção automática, comparando o resultado com o próprio projeto. Não são métricas de gameplay nem teste de navegador.

| Origem | Documento testado | Antes | Após correção | Estado do motor |
|---|---|---|---|---|
| GoldenEye 007 | `goldeneye-077/GOLDENEYE_007_REMASTER_GDD_COMPLETO_v1_0.md` | FPS 3D | FPS 3D | O gênero está certo, mas missões de dispositivos/alarme continuam pendentes |
| Brinquedos vs. Pesadelos | `Brinquedo-x-pesadelos-/GDD.md` | Identificou defesa por linhas, porém tentou 3D por causa de “sem câmera 3D” | Defesa por linhas 2D | Motor de defesa por linhas existente; conteúdo completo ainda não |
| Godfather | `Godfather/GDD_GODFATHER_COMPLETO.md` | Sinal falso de FPS por metas de desempenho | Ação/arena 2D | Motor de ação existente; cidade e economia territorial específicas não são geradas |
| Carga Pesada | `Carga-pesada/source/docs/CARGA_PESADA_GDD_AUDITORIA_v1.0.md` | Sinal falso de FPS pela palavra FPS em desempenho | Direção/corrida 3D | Motor de corrida disponível; fretes, garagem e frota são sistemas pendentes |
| Folclorevania | `Folclorevania/README-v3.0.md` | Aventura/arena 2D genérica | Plataforma 2D | Plataforma disponível; árvore de habilidades própria não importada |
| Brumária | `Asas-de-Brumaria/README.md` | Proximidade indevida com nave/shooter | Aventura/arena 3D | Base de aventura 3D; voo de dragão e GLB animado específicos ainda pendentes |

Esses **6 de 6 documentos avaliados** ficaram classificados conforme gênero/dimensão-base após o ajuste. A amostra é deliberadamente limitada; não prova acurácia global em todos os 94 repositórios ou em qualquer GDD futuro. Um arquivo isolado de configuração, como `Neon-Sky-Force/stages/stage10.js`, não precisa conter gênero identificável: é metadado de fase, não um GDD. Para isso o corpus mantém a identidade do projeto e o sistema de referências exibe a fonte.

## Padrões úteis dos jogos e como reutilizar corretamente

1. **GoldenEye 007** — `src/missions.js`: objetivos tipados de saída, terminais, dispositivos e alarmes variam por dificuldade. Recomendação: sistema de objetivos por eventos e pré-requisitos. **Não implementado automaticamente** no GameForge.
2. **Neon Sky Force** — `js/core/stage-manifest.js`: metadados de fase, nome de boss, cor e script de carregamento por fase. Recomendação: separar configuração de carregamento, validar referências e evitar carregar tudo de uma vez.
3. **Dragon Fury** — `boss-system.js`, `enemy-types.js`: marcar morte de chefe como idempotente para impedir recompensa duplicada por tiros simultâneos; arquétipos de inimigos com movimento e ataque por dados.
4. **Folclorevania** — `js/systems/skillTree.js`: habilidades com `requires`, ranks máximos, limites de bônus e validação de dados salvos. Recomendação: novo subsistema opcional com testes de progressão e save, não mero botão visual.
5. **Brumária** — `src/entities/dragonClipMap.js`: mapear clipes reais para `idle`, `walk`, `fly`, `glide`, `attack` e `hurt`, sem usar ataque como animação de espera. Inspiração para o trabalho futuro de GLB animado.
6. **Godfather** — `js/player-progression.js`: evolução de vida, armadura, estamina e consumíveis com preços e restrição de compra em zona segura. Recomendação: separar compras, limites, efeitos e persistência.
7. **Grim Grove Survivor** — `js/stages/stage-01.js`: bioma, sprites, boss e inimigos ligados por manifesto de fase. Recomendação: assets declarativos e fallback para sprite não encontrado.
8. **Madruga Survival** — `src/characters/player-facing.js`: direção visual do personagem independente da câmera e do movimento WASD; evita inverter comandos ao girar o personagem.

O catálogo de referências do Studio agora inclui **seis padrões adicionais** com URLs de arquivos concretos. Esses padrões alimentam buscas de técnicas e o contrato de orientação do sistema, mas **não clonam nem executam código diretamente de repositórios externos**.

## Alterações no GameForge

- `js/game-corpus.js` (novo): 10 casos com fonte, classificação, técnicas aplicáveis e limitações; só reconhece identidades em contexto adequado, evitando tratar “inspirado em X” como se o jogo fosse X.
- `js/parser.js`: diferencia `FPS` como gênero de `FPS` como taxa de quadros; trata expressões negativas como “sem 3D”; reconhece visão superior, direção de caminhões, metroidvania e aventura de voo; usa identidade corroborada do acervo como evidência complementar. Agora apresenta baixa confiança relativa em gêneros mistos.
- `js/repository-knowledge.js`: seis exemplos auditáveis adicionais, cada um com técnica e teste recomendado.
- `js/intent-compiler.js`: inclui fonte do repositório reconhecido no relatório e deixa explícitas as mecânicas não disponíveis.
- `js/app.js`: mostra origem do exemplo reconhecido, limitações da adaptação e alerta de ambiguidades; seleção manual de gênero continua funcionando.
- `js/parser.js` também adicionou as técnicas e avisos ao contrato da IA opcional, sem prometer copiar código ou fornecer backend não instalado.
- `tests/game-repository-corpus.test.js`: casos inspirados nas fontes examinadas, mas **parafraseados**, com regressões de negação 3D, FPS de desempenho, gênero/visão, fonte de referência e preservação do override manual.
- `tests/test_studio_web.js`: agora carrega também o motor 3D para o caso Carga Pesada (antes o teste importava apenas motores 2D).

## Ações seguintes

**GF-003:** manter corpus versionado, aumentar cobertura gradualmente com GDDs e testes de gêneros híbridos e contraindicações, especialmente veículos em mundo aberto, terror com perspectiva ambígua e cenas narrativas versus objetivos reais. Só marcar VALIDADO com benchmark reproduzível e revisão do resultado da CI no HEAD.

**GF-004:** cada técnica de referência deve ser ligada a uma capacidade realmente implementada, em desenvolvimento ou pendente. Não afirmar que árvores de habilidades, sistemas de trânsito, animações ou IA de inimigos já existem por causa de um documento externo. Para converter padrões em mecânicas, desenvolver módulos próprios, com testes de gameplay e salvamento.
