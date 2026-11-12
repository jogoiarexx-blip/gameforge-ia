# MODELO REUTILIZÁVEL — DEFESA DO QUARTO
## GDD de protótipo vertical para GameForge 0.16

> Adaptação do padrão de projeto de *Brinquedos vs. Pesadelos*, GDD v1.0, fornecido pelo autor. Este arquivo é um **modelo resumido e editável**; não contém as 40 fases nem substitui o documento original.

## Gênero e identidade
Tower defense 2D por linhas. Cinco faixas horizontais e nove colunas. Defensores originais de brinquedo enfrentam criaturas imaginárias que chegam da direita. Arte cartoon expressiva; nada de copiar elementos visuais ou nomes de franquias comerciais.

## Loop central
1. Começar com **150 Brilhos**. A primeira estrela aparece depois de aproximadamente 6 s.
2. Coletar estrelas no campo: +25 Brilhos; reaparecem a cada 9–13 s e expiram após 8 s.
3. Selecionar uma carta; pagar o custo, esperar recarga e posicionar em casa livre.
4. O inimigo da mesma faixa é atacado pelo primeiro defensor apto. Barreiras bloqueiam a passagem enquanto resistem.
5. Iniciar ou antecipar ondas de ataque; cada faixa tem um trenzinho de emergência de uso único.
6. Se um segundo inimigo atravessar uma faixa sem proteção, perder a partida. Vencer ao derrotar o último inimigo da última onda.

## Catálogo mínimo para o protótipo
| Papel | Custo | Recarga | Comportamento |
|---|---:|---:|---|
| Produtor de Brilhos | 50 | 7 s | +25 a cada 22 s |
| Atacante básico | 100 | 6 s | 20 dano a cada 1,5 s |
| Bloqueador resistente | 50 | 18 s | Até 650 HP |
| Congelante | 125 | 7 s | 14 dano e lentidão |

## Inimigos-base
- Normal: 100 HP; velocidade 0,30 casa/s.
- Veloz: 85 HP; velocidade 0,44 casa/s.
- Blindado: 230 HP; velocidade 0,25 casa/s.
- Chefe: elite final das fases de confronto; desenvolver padrões próprios depois.

## Fase 1 — Primeira Defesa
Tutorial com dois tipos de atacante e faixas anunciadas. Começar devagar. Ensinar colocação e coleta.

## Fase 2 — Energia em Jogo
Introduzir gerador, economia de recursos e duas faixas ameaçadas ao mesmo tempo.

## Fase 3 — Uma Grande Onda
Introduzir bloqueadores, inimigo veloz e aviso da última onda.

## Controles e interface
Toque ou clique para selecionar unidade e casa. Cartas mostram custo e recarga; HUD mostra Brilhos, onda, vida e fase. Botão de pausa e reinício. A vitória depende da eliminação total da última onda.

## Arquitetura e qualidade
Simulação fixa 30 Hz; separar lógica e renderização. RNG reproduzível por fase, limites de partículas, suporte a dispositivos móveis e exportação offline. Testar economia, recarga, colisões, vitória, derrota e pausa.

## Expansão da produção
Planejar 5 capítulos de 8 fases (40) por dados, desbloqueando peças e comportamentos aos poucos. Criar chefes e narrativa próprios; não chamar de campanha completa sem playtest real.

## Escopo no GameForge v0.16
O motor sem IA reconhece o gênero, fases e algumas regras base deste documento. **Não implementa automaticamente quaisquer personagens, poderes, puzzles ou chefes adicionais descritos livremente**; para isso, complemente o código ou use o backend de IA e valide o resultado.
