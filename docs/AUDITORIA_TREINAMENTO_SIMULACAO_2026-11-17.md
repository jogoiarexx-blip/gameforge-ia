# Auditoria e evolução da compreensão — GameForge IA

Data: 17/11/2026. Base inspecionada: `2ca183ff3305365356b96d4064b7d0c52eb4b3de`, com as mudanças GF-TRAIN-03 deste commit. Escopo: análise de código, testes Node e exportações. A URL informada corresponde ao repositório `jogoiarexx-blip/gameforge-ia`. Não foi possível abrir o site pelo serviço de consulta pública. A execução Chromium local foi impedida pelo ambiente (`socket() failed: Operation not permitted`); a suíte real de navegador deve ser comprovada no Actions do commit final.

## Diagnóstico

O modo offline é um compilador determinístico de texto com expressões regulares, normalização, IR de requisitos e motores escritos previamente. Adicionar frases ao JSON de testes **não treina pesos de uma rede neural**. Nesta etapa foram modificados o reconhecimento, a compilação, os contratos e o motor que executa os ciclos. O backend opcional de IA não está neste repositório e não foi treinado ou auditado.

O maior limitador não é a quantidade de palavras aceitas. O app precisa preservar a relação entre personagem, ação, objeto, condição, consequência e objetivo. Reconhecer “alimentar peixe” não basta se o jogo exportado só oferecer atirar em inimigos. Também não é correto declarar suporte a um gênero inteiro com base em um protótipo pequeno.

## Achados atuais

| Prioridade | Evidência | Efeito | Tratamento |
|---|---|---|---|
| Alta | `parser.js` escolhia arena para pedidos simples de aquário/loja | Fantasia e ação principal perdidas | Novo perfil de simulação 2D, anterior à pontuação genérica; preserva gêneros vizinhos explícitos |
| Alta | Faltava runtime econômico fora da loja FPS | “Entendido” sem produção, cuidado e venda executáveis | Regras puras + motor Canvas exportável com três ciclos |
| Alta | Ausência de núcleo de hospital/cidade/vida/ônibus/avião/restaurante | Simulação pode virar combate genérico | Bloqueio explícito dos núcleos catalogados, com explicação de incompatibilidade |
| Alta | Não existe interpretação universal de instruções novas | Regras fora do catálogo ainda podem passar despercebidas | Próxima etapa: cobertura de ações desconhecidas e perguntas específicas antes da geração |
| Média | Classificação urbana exigia três sistemas até para referência GTA | “GTA 3D com lojas e carros” virava arena | Referência urbana forte com dois sistemas pode usar o slice urbano; limitações mantidas |
| Média | Documento e comando recente podem descrever domínios diferentes | Jogo novo herda a ideia anterior | Domínio reconhecido no comando recente prevalece na simulação |
| Média | Quantidades e preços podem inviabilizar primeira compra/lucro | Ciclo impossível de concluir | Limites, saldo mínimo para primeira produção e preço acima de custo; ajustes aparecem como alertas |
| Média | `app.js` centraliza 1.171 linhas; `generator.js` serializa funções | Mudanças e integrações têm risco de regressão | Manter export-boot por motor; próxima extração: geração e projeto |
| Média | A simulação inicial não salva progresso e não tem personagem caminhando | Não atende integralmente ao jogo de aquário explorável | Limite visível; caminhada, save, reprodução e construção continuam pendentes |
| A conferir | Workflow `publish-verified.yml` valida SHA, mas não comprova a configuração administrativa de Pages | Fonte de publicação pode diferir do workflow | Conferir configuração/execuções atuais; não transferir automaticamente falhas de auditorias antigas |

## Implementação entregue

| Domínio | Ciclo jogável | Diferença verificável |
|---|---|---|
| Fazenda | Comprar semente → plantar → regar → crescer → colher → vender | Colheita entra no inventário; dinheiro só vem ao vender |
| Aquário | Comprar peixe → alimentar → crescer → vender | Peixe cresce visualmente e só pode ser vendido quando pronto |
| Loja | Repor estoque → atender cliente → aguardar atendimento → vender | Unidade de estoque é consumida na venda, com custo e margem |

Todos têm seleção de espaços por toque/setas, ações por botões/teclas, pausa, reinício, meta de **receita bruta de vendas**, validação de dinheiro e venda de uso único. Não há morte de peixes, necessidades contínuas, clientes andando ou simulação econômica profunda. Aquário e loja compartilham regras de produção com estados e apresentação próprios; ainda não são simuladores independentes complexos.

Parâmetros reconhecidos: 1–12 espaços, saldo inicial, custo, preço, 2–300 segundos de crescimento/atendimento, meta de vendas. O saldo/preço podem ser ajustados com alerta para manter o ciclo viável. Uma única sessão econômica: pedir várias fases registra a campanha pendente, sem criar fases fictícias. Combinar fazenda e aquário registra integração pendente e explicita o domínio escolhido.

Arquivos principais:

- `js/simulation-design.js`: reconhecer intenção, normalizar alguns erros, compilar parâmetros e pendências.
- `js/simulation-rules.js`: estado econômico puro, transições e validações.
- `js/simulation-runtime.js`: Canvas, teclado/toque, interface e telemetria exportáveis offline.
- `js/parser.js`, `js/design-ir.js`, `js/game-capabilities.js`, `js/generator.js`: integração com interpretação, contratos e exportação.
- `training/simulation-ptbr-v3.json`: 76 pedidos rotulados manualmente para regressão.
- `tests/simulation*.test.js`, `tests/export-boot-matrix.test.js`: entendimento e jogo exportado até vitória.

## Evidência de verificação

- Resultado final local: **379 testes aprovados**, zero falhas.
- `npm run verify:exports`: **17 variantes verificadas** (16 combinações gênero/dimensão e uma variante FPS com loja).
- Corpus: **144 pedidos gerais + 100 de mecânicas + 76 de simulação/limites = 320 casos**. Todos passam nas expectativas codificadas nas suítes. Isso mede regressão neste conjunto, não acerto de 100% para qualquer pessoa.
- Testes da nova simulação: três domínios chegam à vitória no `game.js` exportado; pausa não avança produção; venda não duplica renda; fazenda exige inventário e venda separada; compra sem dinheiro e ações fora de ordem falham sem alterar estado.
- Matriz Chromium ampliada de 15 para 16 motores, com cenário fazenda que planta, rega, colhe e vende até vitória. Confirmar execução no Actions do SHA final. Não há validação física Android/iOS.

## Como treinar para criar jogos realmente diferentes

### 1. Separar interpretação e execução

Manter `texto original → intenção/IR → plano de mecânicas → validação → runtime → prova de gameplay`. O interpretador pode sugerir mecânicas, mas somente contratos com código e teste recebem estado de implementação. Uma frase nova não autoriza marcar um sistema pronto.

Cada ação deve ter: sujeito, verbo, alvo, quantidade, condição, custo, tempo, consequência, escopo de fase e origem. Exemplo: “Quando alimentar o peixe, ele cresce e vale mais” exige alimentar → crescimento → valor derivado do tamanho. O protótipo atual oferece cuidado e maturação com preço final fixo; valorização contínua é uma tarefa futura.

### 2. Banco de linguagem separado por finalidade

- Desenvolvimento: frases que orientam novas regras.
- Validação: paráfrases escritas sem consultar as expressões regulares.
- Reserva de avaliação: pedidos reais autorizados que não orientaram a implementação.
- Regressão: toda falha corrigida vira exemplo permanente.

O corpus atual é principalmente desenvolvimento/regressão. Não chamar seus resultados de avaliação independente. Incluir pedidos infantis, abreviações, voz transcrita, erros, pontuação ausente, negações, revisões e ideias híbridas. Não gravar prompts pessoais ou chaves automaticamente; coletar somente exemplos autorizados e revisar antes de incorporar.

### 3. Biblioteca de módulos combináveis

| Próximo módulo | Jogos beneficiados | Aceite |
|---|---|---|
| Necessidades e crescimento contínuos | Aquário, pets, fazenda | Fome altera crescimento; custo de cuidado e valor por tamanho são configuráveis e testados |
| Caminhada e interações por proximidade | Loja, aquário, fazenda, oficina | Personagem anda até objeto; ações só aparecem ao interagir; toque e teclado |
| Estoque, receitas e produção encadeada | Restaurante, fábrica, sobrevivência | Insumo → receita → produto; impossível duplicar insumos ou produzir sem estoque |
| Clientes com demanda e filas | Loja, restaurante, hospital | Cada cliente faz pedido e paga uma vez; fila pode falhar sem travar jogo |
| Agenda, tempo e estados | Vida, hospital, cidade | Pausa/salvamento preservam relógio e eventos; NPCs não duplicam ações |
| Construção por grade | Fazenda, cidade, gerenciamento | Ocupação, custo, caminho e remoção validados |
| Save versionado | Todos os simuladores | ID de projeto estável, restauração, migração e isolamento de jogos homônimos |
| Editor de regras limitado | Híbridos e ideias novas | Triggers/condições/ações conhecidos; ciclos ilimitados e ações não suportadas são recusados |

### 4. IA opcional para interpretação aberta

Um backend de modelo poderia traduzir linguagem livre para IR validado por schema. Para capacidades existentes, ele escolheria e configuraria módulos. Para uma mecânica inédita, geraria uma proposta de código isolada e passaria por testes de comportamento, exportação e navegador antes de integrar. Não colocar chave de API no GitHub Pages, nem executar código recebido diretamente na origem do Studio.

Fine-tuning não foi feito nesta sessão. Só considerar depois de existir volume de exemplos revisados e um conjunto reservado que mostre erro repetido não resolvido por contexto, schema ou módulos. Priorizar primeiro a execução das mecânicas e a qualidade dos rótulos.

### 5. Critério de próxima evolução

Próximo trabalho recomendado: **aquário explorável com personagem, alimentação por proximidade, crescimento contínuo, valor calculado pelo tamanho e save próprio**. Aceite: gerar dois aquários com parâmetros diferentes, completar compra → alimentação → crescimento → venda, restaurar após fechar, e provar que não compartilham dinheiro entre projetos. Isso aproxima o app do pedido real do usuário sem prometer compreender qualquer instrução.
