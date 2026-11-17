# GF-GFX-01 — Gráficos e interpretação visual em todos os modelos

Data: 17/11/2026. Base: `a56c13d52c8e6accccb39a0fced36a4831f48026`. Versão: 0.22.0.

Esta entrega modifica o compilador e a renderização dos jogos. Não é fine-tuning de um modelo externo e não gera automaticamente sprites desenhados por artistas, texturas fotográficas ou modelos 3D detalhados. A base continua procedural, local e exportável offline.

## O que mudou

Uma camada gráfica compartilhada, serializada em cada `game.js`, recebe `GAME_SPEC.renderProfile`. Cada motor chama seus desenhos ou prepara sua cena. A telemetria informa o perfil e contabiliza os passes efetivamente usados. O perfil acompanha o backup, ZIP e HTML offline; `PERFIL_VISUAL.json` documenta os parâmetros ativos no código, não é carregado como configuração independente.

### Cobertura dos modelos

| Modelo | Mudança aplicada |
|---|---|
| Arena 2D | Fundo com relevo em camadas, sol/lua, personagens com corpo, roupa, rosto, acessórios e passada; inimigos deixam de ser apenas círculos |
| Plataforma 2D | Plataformas com bordas, espessura e textura; detalhes no personagem; perfil de acabamento/pixelização |
| Corrida 2D | Acabamento e pixelização opcionais sobre os carros, estrada e vegetação existentes; a carroceria já possuía detalhes próprios |
| Navinha 2D | Detalhes nas fuselagens, cenário espacial complementar e qualidade escolhida preservada sem ser anulada pelo ajuste automático |
| RPG 2D | Paleta de terreno e vegetação coerente com o tema; detalhes nos atores; custo reduzido da pintura de terreno em qualidade leve |
| Defesa de torres 2D | Acabamento comum ao terreno, unidades e HUD existentes, com estilo pixel opcional |
| Defesa por linhas 2D | Fundo em camadas e detalhes nos personagens e unidades |
| Defesa em blocos 2D | Fundo em camadas e detalhes em torres, inimigos e alturas existentes |
| Simulação 2D | Aquários com vidro, água, areia, plantas e bolhas; peixes com cauda e olhos; canteiros com sulcos e plantas; prateleiras com produtos e embalagens |
| Arena, FPS, RPG e plataforma 3D | Iluminação e materiais por perfil; roupas, cabelo/capacete, cinto, bolsos e mochila nos humanoides procedurais; sombras conforme orçamento |
| Corrida 3D | Iluminação/materiais e detalhes adicionais nos veículos, incluindo para-choques e carroceria |
| Navinha 3D | Estabilizadores e detalhes de fuselagem em qualidade equilibrada/alta; iluminação/materiais comuns |
| Ação urbana 3D, incluindo missões estruturadas | Materiais físicos nos objetos procedurais, luz/sombras por perfil, roupas/cintos/bolsos/botas nos personagens |

Não há alteração intencional de colisões, objetivos, dinheiro ou regras de combate. Os detalhes adicionados são visuais; itens decorativos não criam obstáculos invisíveis.

## Linguagem visual reconhecida

| Pedido | Efeito executável | Limite |
|---|---|---|
| “pixel art”, “pixelado”, “16 bits”, “estilo SNES” | 2D usa composição em resolução reduzida e ampliação sem suavização; novos atores usam formas retangulares. 3D reduz resolução e mantém bordas nítidas | Não recria sprites comerciais nem converte meshes em sprites |
| “cartoon”, “desenho animado”, “cel shading” | Paleta e contornos nos desenhos compartilhados; materiais com faces marcadas no 3D | Não inclui shader de contorno 3D nem toon shading em múltiplas bandas |
| “ilustrado”, “pintura digital” | Gradientes, paletas, vegetação e texturas procedurais, detalhes e acabamento suave | Não produz pinturas manuais ou ilustrações externas |
| “naturalista”, “realista” | Paleta mais contida em desenhos compartilhados; materiais menos metálicos, iluminação e suavização de superfícies 3D compatíveis | Não é fotorrealismo; a geometria continua procedural |
| “low poly” | Silhuetas angulares nos novos atores 2D e faces marcadas em materiais 3D | Não substitui todos os modelos por novas malhas artísticas |
| “pôr do sol”, “luz dourada” | Atmosfera quente, céu/fog e luz direcionais no 3D; cor de ambiente no 2D | Não muda o relógio nem implementa ciclo dia/noite |
| “cenário noturno”, “à noite” | Céu/fog mais escuros e luz fria no 3D; atmosfera noturna no 2D | Não cria postes com luz dinâmica individual |
| “qualidade alta”, “equilibrada”, “celular fraco” | Orçamento de detalhes, resolução, antialiasing e sombras | Não garante FPS em aparelho físico específico |
| “sem sombras” | Desliga sombras dinâmicas 3D e sombras dos novos atores compartilhados | Sombras pintadas/baked nos desenhos antigos podem permanecer |
| “sem partículas” | Desliga partículas decorativas compartilhadas e partículas de impacto nos motores 2D integrados | Projéteis, raios de ataque e indicadores de gameplay permanecem visíveis |
| “fotorrealista”, “ray tracing”, “texturas 4K” | Registra exigência avançada como pendente e utiliza apenas o perfil procedural disponível | Não declara ray tracing ou assets 4K implementados |

O comando mais recente prevalece nos parâmetros reconhecidos. Opções manuais explícitas do formulário prevalecem sobre o texto. A fonte original permanece intacta.

## Orçamento gráfico

- Qualidade automática: orçamento leve em viewport de até 600 px e equilibrado nas demais telas. É uma heurística, não detecção da potência real da GPU.
- 3D leve: pixel ratio limitado a 1, sem antialiasing e sem sombras dinâmicas. Pixel art 3D limita a razão a 0,5.
- 3D equilibrado: pixel ratio até 1,4 e shadow maps até 1024 px.
- 3D alto: pixel ratio até 1,8 e shadow maps até 2048 px.
- Cenas, luzes e materiais são preparados uma vez por cena, sem criar efeitos/luzes a cada quadro. Novos detalhes nos personagens usam os mecanismos de descarte já existentes nos motores.
- Materiais de GLBs importados são preservados; a iluminação da cena e a opção de sombras ainda se aplicam.
- A nova camada não aumenta a resolução de texturas importadas nem usa downloads/CDNs.

## Exemplos para testar

- `Crie um jogo de plataforma 2D ilustrado, floresta, qualidade alta, pôr do sol.`
- `Quero navinha espacial 2D pixel art estilo SNES, qualidade equilibrada.`
- `Quero RPG 2D cartoon com cenário de deserto e luz do dia.`
- `Crie defesa por linhas 2D ilustrada com qualidade leve para celular fraco.`
- `Quero cuidar de aquário 2D ilustrado, qualidade alta, sem partículas.`
- `Crie FPS 3D naturalista, qualidade equilibrada, cenário noturno.`
- `Quero corrida 3D low poly, luz dourada, qualidade alta.`
- `Crie um jogo tipo GTA 3D com carros, lojas e polícia. Visual cartoon, qualidade leve, sem sombras.`

Os sistemas ainda ausentes nesses pedidos continuam registrados separadamente. Um estilo gráfico não implementa polícia, carros dirigíveis no slice urbano ou campanhas específicas.

## Treinamento e validação

- `training/graphics-ptbr-v4.json`: 80 combinações rotuladas, cobrindo cinco perfis em todos os 16 modelos. É uma matriz de regressão criada para o desenvolvimento, não um conjunto independente de usuários.
- A base de instruções passa de 320 para 400 casos de regressão.
- `tests/graphics.test.js`: interpretação de estilos, qualidade, precedência, negativas, limitações de fotorrealismo, comandos de desenho, materiais/luzes reais do Three.js e backup.
- `tests/export-boot-matrix.test.js`: executa pixel art e cartoon nos 16 modelos exportados e verifica que o pipeline desenha/prepara a cena.
- Suíte Node local: 386 verificações aprovadas. Exportações: 17 variantes com sintaxe e referências locais verificadas.
- Chromium: a matriz exige telemetria da camada gráfica e captura todos os modelos. O resultado de navegador deve ser confirmado no Actions do commit entregue; testes Node com renderer simulado não comprovam aparência nem desempenho de GPU.

## Próximas evoluções

Priorizar sprites/tilesets originais com atlas e animações; materiais/texturas com normal map; LOD e instancing por perfil; sombras de contato; direção de arte por gênero; e avaliação visual com capturas comparáveis. Usar geração de imagens ou modelos autorizados quando houver um briefing artístico específico. Só incorporar assets após verificar licença, dimensões, memória, legibilidade, animação e exportação offline.
