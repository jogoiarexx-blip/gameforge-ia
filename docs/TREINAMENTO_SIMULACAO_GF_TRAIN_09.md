# GF-TRAIN-09 — Revisões de simulação em linguagem simples

Versão 0.27.0 — 17/11/2026.

## Falhas observadas e corrigidas

- “Dois tanques” mantinha a quantidade padrão. “Não quero 10 tanques” aplicava a quantidade negada.
- “Tirar fome e ativar água suja em 20 segundos” desativava as duas necessidades.
- Repetir preço de filhote, jovem ou adulto na mesma oração usava o primeiro valor.
- “Não quero mais salvar” não desativava o save.
- Um requisito pendente, como reprodução, continuava no plano depois de “sem reprodução”.

## Comportamento novo

O compilador reconhece números escritos de zero a vinte, dezenas, combinações de dezenas e unidades até noventa e nove, e “cem”. Isso vale apenas nos campos numéricos existentes: espaços, saldo inicial, duração, meta, custo, venda e cuidados/preços do aquário. Não converte palavras de títulos, nomes de personagens ou textos fora desses campos. Números em algarismos continuam aceitos.

Durações em minutos viram segundos antes da validação. “Crescer em um minuto” produz `simulation.seconds = 60`; “fome em dois minutos” produz `aquariumCare.hungerSeconds = 120`. Expressões repetidas, como “de dois em dois segundos”, seguem o mesmo fluxo.

Os limites dos motores continuam valendo: 1–12 espaços, crescimento de 2–300 segundos, fome/água de 5–600 segundos, valores econômicos limitados e preço final lucrativo. Pedidos fora desses limites são ajustados e geram avisos.

A última menção positiva de cada parâmetro numérico prevalece. Uma quantidade negada não substitui o valor anterior. Exemplo: “agora dois tanques, não quero dez tanques” termina em dois tanques.

A negação vale na oração local. Pontuação, “mas”, “depois”, “agora”, “porém” e novas ações explícitas encerram o escopo anterior. “Sem fome e sem água suja” desativa ambas; “tirar fome e ativar água suja” desativa fome e habilita água. A primeira alimentação continua necessária quando apenas a fome é desativada; “sem precisar alimentar” dispensa esse cuidado inicial.

O save também aceita retirada e reativação por verbos e por “não quero mais”. Pendências de simulação são recalculadas pelas menções recentes. Saúde distingue doenças, morte e saúde geral: retirar morte não esconde doenças ainda pedidas.

## Preservação

Alterar só quantidade preserva preços, necessidades, meta, persistência e perfil visual. As regras executáveis de simulação não foram substituídas. O resultado novo continua usando `GameForgeSimulationRules` e o salvamento versionado existente.

Como já definido pelo contrato de save, alterar a configuração da simulação cria outro espaço de progresso. Não há migração automática de um save com quatro tanques para um projeto regenerado com dois tanques. Jogos já exportados precisam ser gerados novamente para receber as correções.

## Validação

- 72 cenários novos: 36 revisões de quantidade/economia/duração/save nos três domínios, 24 de cuidados/preços do aquário e 12 de retirada/reativação de pendências.
- Total dos corpora de geração: 616 cenários. As 34 consultas de recuperação de referências continuam separadas.
- Testes adicionais de preservação, execução do ciclo de um minuto, limites econômicos, doenças versus morte, palavras numéricas longas e dezenas compostas.
- Chromium usa agora pedidos por extenso na recuperação de aquário, fazenda e loja. O aquário parte de quatro tanques e crescimento de um minuto e é corrigido para dois tanques e doze segundos pelo comando recente, ignorando dez tanques negados.

## Limites

Estas são regras determinísticas e exemplos de regressão, sem ajuste de pesos de modelos externos. O vocabulário não cobre toda forma de escrever números, frações, horas ou referências indiretas como “o dobro de antes”. Construção livre, caminhada, reprodução, doenças e produção automática continuam exigindo programação. Retirar sua pendência não implementa esses sistemas.
