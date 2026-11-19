# GF-ARCH-18 — Contratos de salvamento 3D e recuperação em prévia isolada

## Evolução realizada

A GF-ARCH-18 amplia o laboratório de QA com o botão **Testar salvamento RPG/urbano 3D**. O novo módulo `js/qa-3d-persistence.js` distingue os contratos de dois grupos de jogos:

**Urbano 3D (`urban-action`), tanto legado v1 quanto missões v2.** Reconhece as chaves `gameforge-urban-v1-*` e `gameforge-urban-missions-v2-*`. No motor de missões v2, também compara fase, recompensas e contadores de objetivos. Executa um jogo em `iframe sandbox="allow-scripts"` com `localStorage` virtual, inicia a missão, controla movimento real durante um intervalo limitado, verifica que uma posição diferente da inicial foi **de fato persistida**, remove o iframe e cria outro com o registro virtual. Em seguida, compara posição, dinheiro, munição, vida e estado da missão entre o registro salvo e a segunda instância. A gravação urbana é periódica; um pequeno atraso entre posição atual e snapshot não significa corrupção. Ao terminar o movimento, o QA aciona **Pausa**, que é o botão real dos dois motores urbanos e grava o estado atual; essa ação é permitida pelo bridge somente em clones GF18 com storage virtual. Resultado `PASS` exige persistência e recuperação do registro.

**RPG/arena/FPS 3D com checkpoint habilitado.** Os motores já têm a chave `gameforge-campaign-v1:<gênero>:<projectId>` e persistem somente depois de concluir uma fase; o checkpoint deve ser produzido pelo jogo durante o teste, não fabricado pelo laboratório. O cenário curto **retorna INCONCLUSIVE** quando não ocorrer uma transição de fase, pois não seria correto declarar que o salvamento foi testado. Caso um checkpoint legítimo surja, cria uma segunda instância e verifica os campos persistentes (fase, vida, pontuação, munição e dados RPG). O contrato de validação também é coberto por testes unitários de `world-rules.js`.

O armazenamento virtual aceita somente as chaves de save urbano e de campanha, com tamanho máximo limitado, sem acesso aos dados reais do editor. O clone GF18 fica dentro do viewport com opacidade mínima, atrás do Studio, com `pointer-events:none`, `aria-hidden`, `tabindex=-1` e bloqueio de pedidos de foco: isso permite o avanço dos frames 3D sem enviar eventos ao jogo ativo. Ele continua descartável e é removido no término. O canal `qa-storage` só disponibiliza esse armazenamento injetado em clones GF17/GF18, nunca o `localStorage` original. Não há `eval` de instruções do usuário, APIs remotas nem agentes de IA executados.

## Mudanças de arquivo

- `js/qa-3d-persistence.js`: novo contrato, executor isolado com dois iframes, comparação de campos estáveis e decisão `PASS/FAIL/INCONCLUSIVE/UNSUPPORTED`.
- `js/qa-bridge.js`: suporte a armazenamento estritamente virtual GF18, preservando GF17.
- `index.html` e `js/app.js`: painel de QA 3D, geração de resultados e ligação à matriz de evidências. Apenas `OBSERVED_PARTIAL` é permitido; não há declaração de requisito plenamente aprovado.
- `js/project-backup.js`: backup/export de `RESULTADOS_3D_GF18.json` e `RELATORIO_3D_GF18.md`, invalidados quando código, assets ou GDD muda.
- `tests/gf18-3d-persistence.test.js`: contratos de mundo, chaves restritas, fluxo de dois clones, resultados honestos, backup e versionamento.
- `tests/browser-gf18-3d-persistence.py`: joga urbano Three.js real no Chromium, mede recuperação em novo iframe, garante que a partida principal e o armazenamento do Studio não mudaram, confirma ZIP e descarte de evidências antigas.

## Limitações explícitas

Um `PASS` significa **restauração concreta de um registro na sessão de QA usando armazenamento virtual**, não durabilidade no dispositivo do usuário. O RPG 3D continua sem roteiro automático para eliminar todos os chefes e concluir cada fase; não inventamos transições de fase ou salvamentos. Inimigos e chefes são acompanhados pela telemetria e pelos cenários da GF-ARCH-16, mas **a conclusão completa de campanhas e chefes ainda não é atestada automaticamente**. O transporte dos testes pode gerar custo de CPU/GPU adicional, embora não interaja com a prévia ativa.

## Gates de publicação

- `npm test`, sintaxe JS e benchmarks existentes.
- Chromium: cenário urbano real, GF17–GF13 e matriz de exportações 2D/3D, continuidade dos backups e recuperação GLB.
- Merge somente se toda a CI passar.

## Próxima evolução — GF-ARCH-19

Testes end-to-end de objetivos por gênero com telemetria instrumentada de eventos, chefes, missões e critérios de vitória, além de orçamentos de execução explícitos (tempo, memória e número de ações). Preservar isolamento e validação humana.
