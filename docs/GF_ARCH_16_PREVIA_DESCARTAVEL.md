# GF-ARCH-16 — QA avançado em prévia descartável

## Objetivo

Executar observações adicionais (salvamento, missões, inimigos, chefes) **sem mover nem reiniciar a partida que estiver aberta no Studio**. Criado em 19/11/2026 com testes Node e Chromium. O novo botão fica no painel *Testes e diagnóstico visual → Rastreabilidade do código e requisitos*.

## Implementação

- `js/advanced-scenario-qa.js`: planeja roteiros tipados e executa uma sessão efêmera em um `iframe sandbox="allow-scripts"` separado da prévia principal, **sem `allow-same-origin`**, sem cookies ou armazenamento local da origem do editor. O iframe é retirado do DOM em `finally`, inclusive quando um comando falha. O canal QA possui ações limitadas a ping, start, press, release e inspect, já definidas no bridge do preview.
- Roteiros com medidas: **save** (somente sinal de checkpoint observado; NÃO comprova restore), **mission** (transição de fase/etapa), **enemy** (deslocamento de IDs estáveis) e **boss** (HP reduzido). Ações são limitadas a setas e espaço no clone, sem edição do código ou injeção de estado. Quando o evento não ocorre ou não há instrumentação, o resultado é `INCONCLUSIVE` — ausência de evento não vira falha presumida.
- `js/runtime-template.js`, `js/shooter-runtime.js` e `js/three-runtime.js`: pequenas extensões **somente-leitura** no retorno de `__gameforgeTelemetry`, expondo amostras de até oito inimigos com IDs estáveis, HP e presença de chefe. As regras e os movimentos de cada jogo continuam iguais.
- `js/app.js`: materializa assets GLB existentes, cria uma cópia jogável com `GameForgeGenerator.shell(..., true)`, invoca o QA isolado e só aceita a observação se fingerprints do código/GDD ainda corresponderem à execução. Revoga evidências antigas no projeto/ZIP e associa observações positivas à matriz da GF-ARCH-14 como `OBSERVED_PARTIAL`, nunca `VERIFIED`.
- Novos arquivos: `RESULTADOS_AVANCADOS_GF16.json`, `RELATORIO_AVANCADO_GF16.md`, ambos permitidos em backups JSON e ZIP.

## Limitações e segurança

O iframe descartável executa JavaScript do jogo conforme a prévia já existente. Isso **não** é uma sandbox de agentes de IA com ferramentas, e não garante ausência de impacto de alto custo na CPU/GPU. Isolamento de origem impede acesso ao localStorage do site principal; por isso **não é possível atestar salvar→fechar→abrir** com a técnica atual. Mesmo um resultado `PASS` significa somente um sinal de checkpoint, avanço de missão, movimento medido ou HP reduzido. Nenhum teste atribui aprovação completa de missões, combate, IA, animações 3D, recuperação de save ou desempenho FPS.

Os códigos e IDs de IA do jogo não são exibidos em logs nem enviados a provedores externos. Nenhum novo recurso requer autenticação, novo servidor ou serviço de IA. Amostras de telemetria são limitadas em tamanho.

Se a prévia não responder, se o processo registrar erros ou se faltar telemetria, o teste precisa deixar isso explícito. Checksum local serve para identificar mudanças acidentais, **não como prova criptográfica de integridade**.

## Critérios de aceite

1. `npm test` + sintaxe de todos os módulos JS e benchmark existente.
2. Chromium: gerar arena 2D; executar GF16; verificar ausência de iframe descartável ao final e estado inalterado do iframe principal; ler JSON de resultados; exportar ZIP contendo os dois novos relatórios; mudar instrução e verificar a exclusão das evidências obsoletas em novo ZIP.
3. Regressões da GF-ARCH-15, GF-ARCH-14, exportações e continuidade de projetos/GLB existentes continuam exigidas antes do merge.

## Próxima evolução possível

GF-ARCH-17: protocolo explícito de checkpoints com testes end-to-end em origem separada, autorizada e persistente; roteiros por gênero que validem objetivos completos em partidas instrumentadas, com orçamento de CPU/tempo e prevenção de interrupções. Somente após comprovar segurança introduzir execução de agentes reais.
