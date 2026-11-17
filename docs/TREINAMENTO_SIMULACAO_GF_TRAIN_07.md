# GF-TRAIN-07 — Progresso local das simulações

Versão 0.25.0 — 17/11/2026.

## Resultado executável

Aquário, fazenda e loja 2D recebem `simulation.persistence = {version: 1, enabled: true}` em novos projetos. O arquivo exportado inclui a implementação completa dentro de `GameForgeSimulationRules.persistence`; não depende de servidor, IA nem biblioteca externa.

- Botão **Salvar progresso**, autosave após cinco segundos de simulação e gravação após ações, pausa, saída ou ocultação da página.
- **Continuar** recupera moedas, receita, vendas, inventário, espaços ocupados, idade, cuidados, saciedade, água e espaço selecionado.
- Recuperação entra em jogo ativo; vitória continua como vitória e não paga novamente. Pausa não é persistida.
- **Novo jogo** substitui o progresso anterior. A descrição inicial informa esse comportamento.
- Ao ocultar a aba, o jogo salva e pausa. Retomar exige o botão Pausar.
- Não há crescimento, fome, sujeira ou renda durante o período fechado.

## Interpretação

“Salvar”, “salvamento”, “save”, “guardar o progresso” e “continuar amanhã” ativam o recurso. “Sem salvar”, “não quero salvar”, “desativar save” e “remover salvamento” desativam. A última menção prevalece, inclusive quando um comando novo altera o GDD.

Exemplo: “Quero cuidar de aquário com 2 tanques, água suja em 20 segundos e salvar meu progresso”.

O novo corpus possui 40 casos de regressão em português, distribuídos entre os três domínios, incluindo exclusões, erros de escrita e comandos posteriores. O conjunto de geração chega a 480 instruções; as 34 consultas de recuperação de referências permanecem separadas. Este treinamento melhora regras e exemplos do app, sem ajustar pesos de modelos externos.

## Validação e isolamento

Chaves `gameforge-simulation-v1-*` são separadas dos saves urbanos, do Studio e de outros motores. Um hash organiza a chave; o conteúdo também exige correspondência exata entre título e configuração completa da simulação. Alterar esses dados inicia outro espaço de progresso. Alterar apenas perfil visual não muda o save.

Leitura exige versão reconhecida, números finitos e limitados, quantidades inteiras, tamanho correto das coleções, estados de cuidado coerentes e limites econômicos. O estado é reconstruído por campos permitidos, sem mesclar propriedades livres. Dados inválidos são recusados; não são executados. A flag de vitória é recalculada pela receita.

Falhas de quota, armazenamento negado e JSON inválido não interrompem a simulação. Uma escrita só anuncia sucesso após releitura idêntica; quota excedida preserva a gravação anterior pelo contrato atômico de `localStorage.setItem`.

## Cobertura

Testes de round-trip dos três domínios, estoque colhido, vitória idempotente, configurações distintas, JSON inválido, versão incompatível, valores impossíveis, storage negado/cheio, exclusões e contrato legado. O arquivo `game.js` exportado também é executado para testar gravação, recarga, continuação, reinício e falha de storage.

Chromium: recarga do aquário mobile com cuidado por tanque, persistência de vitória/reinício, fazenda com colheita armazenada e loja com venda concluída, além da matriz anterior dos motores.

## Limites

- Salvamento só no mesmo navegador, origem e perfil; navegação privada, limpeza do navegador e ambientes de prévia restritos podem impedir ou apagar dados.
- Sem nuvem, contas, sincronização, múltiplos slots, importação/exportação do progresso ou resolução de conflito entre abas. Duas abas do mesmo jogo usam a última gravação.
- `localStorage` é editável pelo proprietário do navegador; estas validações não oferecem proteção contra fraude nem servem como economia de servidor.
- Configurações antigas sem `persistence` mantêm o comportamento sem save até regenerar o jogo.
- Aquário continua sem doenças, reprodução, loja de ração paga ou personagem caminhando.
- Testes de regressão não provam compreensão universal de linguagem livre.
