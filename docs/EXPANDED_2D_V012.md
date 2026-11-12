# Motores Canvas 2D expandidos — v0.12

## Integração independente

`js/strategy-rules.js` fornece `gameForgeStrategyRulesFactory()` e o objeto de regras puras `GameForgeStrategyRules`. `js/expanded-2d-runtime.js` fornece `gameForgeExpanded2DBoot()`. Os gêneros aceitos são `rpg` e `tower-defense`. Ambos usam o shell padrão do gerador e o mesmo `GAME_SPEC`.

O jogo exportado precisa conter, nesta ordem:

```js
const GAME_SPEC = /* especificação serializada */;
const GameForgeStrategyRules = (/* gameForgeStrategyRulesFactory.toString() */)();
(/* gameForgeExpanded2DBoot.toString() */)();
```

Não há CDN, requisição de rede, imagens externas nem dependência de IA. Cada fábrica é autocontida e serializável. Os arquivos de origem também publicam suas funções em `globalThis` para o gerador em Node. `require('./js/strategy-rules.js')` retorna o objeto de regras para testes.

## RPG de exploração

- Mundo de 2400 × 1600, câmera com acompanhamento suave, caminhos, lago sólido, árvores, rochas, vila com casas, poço, três santuários e portal.
- Desenho procedural em camadas: terreno pré-renderizado, sombras, personagens e árvores ordenados por profundidade, vegetação, partículas e luz ambiente. O personagem apresenta direção do olhar, passos e arma orientada.
- WASD/setas movem com normalização diagonal; a colisão é subdividida para impedir atravessar obstáculos em passos grandes. Espaço/Enter ou AÇÃO dispara magia com mira no inimigo próximo e golpeia em curta distância. Clique/toque no mundo também ataca.
- Slimes perseguem, brutos têm mais vida, arqueiros mantêm distância e atiram, guardião dispara leques. Inimigos distantes não perseguem o jogador através de todo o mapa.
- Coletar três relíquias **e** vencer o guardião libera o portal. Entrar no portal conclui a fase. O minimapa marca jogador, santuários, guardião, portal e área visível.
- Derrotas concedem XP e ouro; vários níveis podem ser concedidos numa recompensa. Níveis aumentam vida e ataque. `E` usa poção apenas quando existe vida para recuperar. `I` abre inventário e melhorias de lâmina, armadura e poções.
- Cada entrada de fase cria um checkpoint da progressão. Reiniciar ou tentar novamente restaura os atributos e recursos de entrada e recria os inimigos e relíquias. A transição conserva melhorias, cura o jogador e concede uma poção. O checkpoint é mantido em memória durante a sessão, sem prometer salvamento após fechar a página.

## Defesa de torres

- Campo tático distinto de 16 × 8 células. Inimigos percorrem uma rota ordenada com várias curvas até a base. Construções não podem ocupar a rota nem uma torre existente.
- Clique/toque constrói ou seleciona. Setas/WASD deslocam o cursor e Espaço/Enter constrói ou melhora a torre da célula. `U`/Melhorar evolui a torre selecionada. O raio de alcance fica visível.
- Torre de raio custa 60 ouro e atira rápido; torre de gelo custa 75 e desacelera. Cada torre pode chegar ao nível 3, aumentando dano e alcance e reduzindo intervalo de disparo. Custos são verificados antes de descontar recursos.
- `N`/Próxima onda inicia uma onda por vez. Construção e melhorias permanecem disponíveis durante o combate. Ondas contêm unidades comuns, corredores, blindados e um chefe final. Eliminações e conclusão de ondas concedem ouro.
- A base perde vida com inimigos que escapam. Vida zero encerra a fase em derrota. Sobreviver à última onda conclui a fase. Cada nova fase recria o tabuleiro e os recursos de preparação.

## Ciclo de vida, orçamento e telemetria

Ambos oferecem menu, pausa, reinício, derrota, transição entre fases e vitória final. Campanhas usam até 30 nomes de `spec.stages`. Modificadores existentes de dificuldade, inimigos, chefes, velocidade do jogador, cadência e partículas são limitados a uma faixa numérica segura.

O delta de simulação é limitado a 50 ms. RPG usa até 37 inimigos, 100 projéteis e 480 partículas; defesa usa até 70 inimigos simultâneos, 90 torres e 160 rastros de disparo. As listas são limpas por fase. Perder foco ou ocultar a página libera as teclas e pausa. Eventos de cancelamento e perda de captura liberam controles touch.

`window.__gameforgeTelemetry()` retorna uma fotografia nova com `genre`, `runtime`, `state`, `paused`, `frames`, `stage`, `stageCount`, `time`, `stageTime`, `player`, `camera`, `health`, `enemies`, `bullets`, `particles`, `resources`, `towers`, `wave`, `collectibles`, `bossDefeated`, `level` e `objective`. `player` contém coordenadas do mundo e `screenX`/`screenY`; em defesa representa o cursor tático. As propriedades também existem na função para consumidores antigos que leem o objeto diretamente.

## Verificação e limites

`node --test tests/expanded-2d.test.js` cobre movimento e obstáculos, diagonal, XP, checkpoint, dano e invulnerabilidade, consumo de poções, bloqueio do portal, colocação válida e inválida, custos, melhorias, percurso, recompensas, derrota, chefe final e vitória. Executa também os boots serializados numa fronteira DOM/Canvas sem renderização para conferir os eventos reais de movimento, pausa, reinício, construção por teclado, melhoria, início de onda e contrato de telemetria.

A validação visual e touch em navegador deve ser executada pelo fluxo gerenciado de QA. Os desenhos são procedurais; não há sprites importados, quests narrativas, editor de mapas, malha de navegação, inventário com drag-and-drop ou persistência de checkpoint entre sessões. As campanhas variam escala e nome das fases sobre a geografia procedural estabelecida.
