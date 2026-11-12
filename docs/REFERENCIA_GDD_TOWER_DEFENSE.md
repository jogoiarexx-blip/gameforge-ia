# Referência para o gerador: Tower Defense 2D por linhas

Base de projeto: **Brinquedos vs. Pesadelos** — GDD v1.0, enviado pelo autor em 12/11/2026.
O documento é um plano de pré-produção; seus números não foram comprovados por playtest.

## Padrão aproveitável para outros jogos
- Tabuleiro 5×9, ocupação de uma peça por célula e defesa por faixa
- Recurso inicial de 150; estrelas de +25 caem a cada 9–13 s (primeira aos ~6 s) e expiram em 8 s
- Quatro papéis fundamentais para um protótipo: produtor, atacante, bloqueador, controle
- Compra com custo e recarga individual por carta
- Invasores entram pela direita, HP e dano distintos e lógica de alvo em uma faixa
- Proteção de emergência de uso único, segundo vazamento leva à derrota
- Diretor de ondas com planos reproduzíveis, começo suave, aumento gradual e chefe em fases especiais
- Simulação com passo fixo de 1/30 s, pausa real, suporte a toque e sem rede
- Estrutura de conteúdo: até 5 capítulos de 8 fases = 40 fases de um jogo de defesa por linhas

## O que o GameForge v0.16 implementa de fato
A grade, as quatro unidades genéricas, a economia de Brilhos, a coleta manual, recarga, defesa automática, quatro arquétipos iniciais, proteção por linha, planos reproduzíveis, chefes de fase especial e o limite de 40 fases de campanha.

## O que o GDD pede e ainda não foi implementado
O catálogo completo de 20 brinquedos, 20 inimigos, cinco chefes únicos com ataques específicos, terrenos próprios de cada capítulo, seleção de deck de 6/8 cartas, minigames, enciclopédia, ilustrações e sprites finais, áudio, save e PWA individuais do jogo. Os títulos do GDD são importados, mas **as mecânicas não são deduzidas livremente das descrições de cada fase**.

## Uso
1. No GameForge, importe o arquivo GDD original (até 1 MB).
2. Selecione o gênero **Defesa por linhas / Jardim**, caso necessário.
3. Gere o protótipo 2D; a exportação contém `game.js` executável e GDD integral.
4. Personalize ondas por fase, rode QA e implemente requisitos inéditos por etapas, sem declarar implementação antes de testar.

## Observações
O protótipo continua com arte geométrica original e não reutiliza personagens de outros jogos.
Desempenho móvel, 40 fases realmente vencíveis, conclusão integral e demais critérios do GDD necessitam QA e playtest.
