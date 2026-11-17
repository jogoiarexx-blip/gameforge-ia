# GF-TRAIN-06 — Aquário com cuidado contínuo e valor por crescimento

Data: 17/11/2026. Versão: 0.24.0. Base: `3df733fce9f76979f8875babcd06bd053b51f569`.

## Resultado

A partir do estudo do Abyss Garden documentado em `docs/ESTUDO_REPOSITORIOS_GF_STUDY_05.md`, foi escrito um módulo autoral de cuidado para o motor de aquário 2D. Não foram copiados códigos ou assets do projeto de referência. O app agora transforma pedidos simples sobre fome, água, crescimento e venda em regras executáveis no jogo exportado.

### Ciclo jogável

Comprar peixe → alimentar → crescer enquanto cuidado está disponível → alimentar novamente e/ou trocar água quando necessário → vender pelo valor da idade atual → alcançar a meta de receita.

- Cada tanque contém **um peixe**, com saciedade própria. Alimentar um tanque não alimenta o vizinho.
- A saciedade começa em zero quando a primeira alimentação é exigida. Alimentar restaura a 100%; uma nova alimentação é habilitada quando cai a 75% ou menos.
- A duração padrão da saciedade é 45 segundos de simulação. Ao chegar a zero, o crescimento para. Alimentar permite retomar do ponto em que estava.
- A necessidade de água é **opcional**, ativada por pedidos como “água suja” ou “trocar água”. A água pertence ao tanque e perde qualidade enquanto houver peixe; ao chegar a zero, o crescimento para. Trocar água restaura a 100%.
- A pausa suspende crescimento, saciedade e qualidade da água. O tempo de crescimento é tempo efetivamente alimentado e com água disponível, não uma promessa de tempo de relógio quando o cuidado está interrompido.
- A cotação cresce de um preço de filhote a um intermediário de jovem e ao preço adulto. Os pontos de preço são 0%, 50% e 100% do crescimento; a cotação continua variando dentro dos estágios. A interpolação usa a idade, sem diminuir por fome; é um modelo econômico simples, não uma simulação biológica realista.
- Por padrão, só é possível vender adulto. “Vender filhotes” ou “vender em qualquer idade” libera venda antecipada, inclusive antes do primeiro cuidado, pelo valor da idade atual.
- A venda remove o peixe e concede receita uma única vez. A meta continua sendo receita bruta de vendas, não lucro.

## Pedidos reconhecidos

| Pedido | Configuração |
|---|---|
| “fome em 10 segundos” | Saciedade completa dura 10 s |
| “alimentar a cada 12 segundos” | Duração de saciedade de 12 s |
| “comer de 15 em 15 segundos” | Duração de saciedade de 15 s |
| “água suja em 20 segundos” | Ativa água com duração de 20 s |
| “trocar água a cada 25 segundos” | Ativa água com duração de 25 s |
| “filhote vale 4, jovem vale 12, adulto vale 30” | Três pontos de cotação por idade |
| “vender filhotes” | Venda antecipada permitida |
| “vender somente adultos” | Venda antecipada desativada |
| “sem fome” | Desliga a queda contínua de saciedade; a primeira alimentação ainda ativa o crescimento |
| “sem precisar alimentar” | Desliga fome e primeira alimentação obrigatória |
| “sem água suja” | Desliga o requisito de água |
| “sem cuidados” | Desliga os requisitos de alimentação e água |

A ordem mais recente prevalece nos parâmetros reconhecidos, inclusive entre GDD e comando posterior. Há normalização conservadora de “qro”, “aquariu”, “peixinho” e “n quero”. A expressão “60 FPS” é tratada como desempenho e não muda um aquário para o gênero FPS.

Exemplo completo:

> Quero cuidar de aquário 2D com 2 tanques. Crescer em 30 segundos, fome em 10 segundos e água suja em 20 segundos. Filhote vale 4, jovem vale 15, adulto vale 35. Quero vender filhotes e alcançar 100 moedas em vendas.

## Interface e controles

- Botões para comprar, alimentar, vender e, quando ativada, trocar água.
- Teclas 1/2/3 para comprar/alimentar/vender; 4 troca água no aquário. Setas ou botões touch selecionam o tanque.
- O tanque selecionado mostra estágio, crescimento, cotação, saciedade e água em texto no rodapé, além das barras no canvas. Isso mantém a informação disponível em telas pequenas.
- A aparência e o tamanho do peixe acompanham o progresso. Não há várias criaturas dentro de um único tanque nem personagem caminhando pela loja.

## Limites e compatibilidade

- Alimentação e troca de água são gratuitas. Se o pedido exigir comprar ração ou cobrar pela comida, o comércio de alimentação é registrado como pendente.
- Reprodução, genética, raridade, doença, morte, caminhada no cenário e salvamento do progresso do jogo ainda não são implementados por este módulo.
- O backup do projeto e a exportação preservam as regras, mas isso não significa salvar o estado vivo da partida. O protótipo continua indicando a ausência de salvamento.
- Configurações de aquário v1, sem `aquariumCare`, mantêm a regra anterior de cuidado único e venda ao amadurecer. Fazenda e loja preservam seus ciclos.
- Há limites de 5–600 s para duração de saciedade/água, até 12 tanques e preços de até 2.000 moedas. Preços contraditórios são ajustados com alerta para manter a ordem filhote ≤ jovem ≤ adulto e possibilidade de lucro na venda adulta.
- O crescimento usa cálculo contínuo limitado pelo tempo restante de cuidado. Comparações entre passos de 1 s e 1/60 s são feitas com tolerância numérica, sem usar relógio do sistema para avançar o estado.

## Arquivos e contrato

- `js/simulation-design.js`: pedidos → `GAME_SPEC.simulation.aquariumCare`.
- `js/simulation-rules.js`: cuidado, cotação, crescimento, água e venda.
- `js/simulation-runtime.js`: controles, texto acessível, barras e cotação no jogo.
- `js/game-capabilities.js`: contrato `aquarium-care` com evidência de código e testes.
- `js/repository-lessons.js`: atualiza a aplicação dos três estudos do Abyss Garden, preservando os limites do restante do projeto.
- `training/aquarium-care-ptbr-v6.json`: 40 pedidos novos de regressão.

## Verificação

- A base de geração passa de 400 para **440 instruções de regressão**; as 34 consultas de recuperação de fontes são uma avaliação separada.
- **402 testes Node aprovados** e 17 variantes de exportação verificadas localmente.
- Os testes cobrem isolamento entre tanques, alimentação repetida, pausa por fome/água, retomada, preços crescentes, venda de filhote, venda única, negativas, precedência, limites e compatibilidade v1.
- Um teste executa o `game.js` exportado até vitória, incluindo dois tanques, pausa, retorno ao cuidado e venda antecipada.
- A matriz Chromium inclui cenário de aquário em 390 px com compra, cuidado, fome, água, pausa, retomada e venda até vitória. Confirmar a execução no Actions do commit entregue. Não há garantia de FPS em hardware físico.

Próximo avanço recomendado: identidade e salvamento versionado para as simulações, com restauração do estado dos tanques e isolamento entre projetos homônimos.
