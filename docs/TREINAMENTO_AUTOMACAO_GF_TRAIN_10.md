# GF-TRAIN-10 — Automação de ciclos de simulação

Versão 0.28.0 — 18/11/2026.

## Resultado executável

Aquário, fazenda e loja 2D podem executar etapas sem cliques repetidos. A automação é opcional: projetos sem pedido reconhecido mantêm os ciclos manuais. O código fica incluído no `game.js` exportado e funciona sem rede.

`simulation.automation` contém versão, intervalo de verificação e flags de início, cuidado, finalização, venda da colheita e limpeza. O estado mantém o relógio parcial, o botão ligado/desligado e a contagem de ações bem-sucedidas. A auditoria marca o módulo como implementado somente nos motores de simulação 2D.

## Pedidos aceitos

| Pedido | Resultado |
| --- | --- |
| Produção automática, automação, modo idle | Automatiza o ciclo do domínio |
| Plantio automático ou plantar automaticamente | Compra sementes e planta em espaços vazios |
| Comprar peixes automaticamente | Compra peixes em tanques vazios |
| Reposição automática | Repõe estoque em prateleiras vazias |
| Irrigação, alimentação ou atendimento automático | Executa o cuidado correspondente quando necessário |
| Colheita automática | Guarda a produção madura no inventário da fazenda |
| Venda automática | Vende colheita da fazenda ou unidades maduras do aquário/loja |
| Limpeza automática ou trocar água automaticamente | Ativa o cuidado de água do aquário e executa limpeza quando necessária |
| Alimentação manual, venda manual, colheita manual | Desativa apenas a etapa correspondente |
| Sem automação ou modo manual | Desativa o ciclo automático no pedido |
| Automação a cada dois segundos | Verifica as etapas a cada dois segundos de jogo ativo |

A última menção prevalece. “Produção automática, mas venda manual” mantém outras etapas e deixa a venda sob controle do jogador. Salvamento automático continua sendo um recurso separado. Reprodução e funcionários continuam pendentes mesmo se pedidos junto da automação.

## Regras econômicas e temporais

- Compras e reposições usam as mesmas regras manuais; não iniciam sem saldo nem ocupam um espaço já preenchido.
- Alimentação e limpeza continuam gratuitas. Automação não cria salários, funcionários, upgrades ou custos adicionais.
- Colheita/finalização aguarda maturidade. A venda automática do aquário espera o peixe adulto, mesmo que a venda manual de filhotes esteja permitida.
- Limpeza só integra o ciclo se a necessidade de água estiver habilitada. Pedir somente produção automática não habilita água suja por conta própria.
- Em cada verificação: finaliza unidades maduras, vende estoque da fazenda, inicia novas unidades e executa cuidados. A venda de estoque é limitada ao número de espaços por verificação.
- A meta encerra o jogo imediatamente; passos posteriores não repetem recompensas.
- Intervalo padrão de um segundo, limitado a 1–60 segundos. É um intervalo de verificação; os cuidados só ocorrem quando as regras permitem.
- Desligar **só a automação** mantém crescimento e necessidades em andamento. **Pausar** congela tudo.
- Não há produção enquanto o jogo estiver fechado. O estado da automação e seu relógio parcial são recuperados pelo save local existente.

## Verificação

48 cenários novos de instruções, com ciclos completos/parciais nos três domínios, exclusões, reativação, frequência, pedidos idle, salvamento e requisitos ainda pendentes. Os corpora de geração passam a 664 cenários; as 34 consultas de recuperação de referências permanecem separadas.

Testes puros verificam custos, saldo insuficiente, maturidade, estoque sem receita fictícia, meta sem duplicação, cuidado/limpeza, desligamento parcial, equivalência entre passos de 1 segundo e 60 FPS, save e validação do contrato. O teste do arquivo exportado verifica automação até vitória, pausa global e recuperação da vitória nos três domínios.

Três cenários novos no Chromium mobile verificam ligar/desligar, pausa, recarga com automação desligada, retorno à automação, conclusão e recuperação da vitória. A matriz total passa a 27 cenários.

## Limites

Sem funcionários com IA, caminhada, expansão/construção, loja de ração, reprodução, doenças ou simulação 3D. É automação do ciclo econômico básico, sem economia complexa, servidor ou evolução offline. O treinamento amplia o interpretador determinístico e os motores; não ajusta pesos de modelos externos.

Para receber a mecânica, gere o jogo novamente. Configurações diferentes continuam usando espaços de save diferentes, sem migração automática de progresso.
