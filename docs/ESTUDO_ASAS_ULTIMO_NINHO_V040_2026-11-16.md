# GameForge — Auditoria de reutilização técnica: Asas do Último Ninho v0.4.0

Data: 16/11/2026. Fonte analisada: `Asas_do_Ultimo_Ninho_v0.4.0_Caminhos_dos_Esquecidos.zip`, fornecido pelo usuário nesta conversa. Esta é uma auditoria da versão distribuída no ZIP, não de futuras versões.

## 1. O que o jogo realmente contém

O pacote apresenta 24 fases em `dist/levels/01.json` até `24.json`, com equivalentes `dist/levels-local/NN.js` para execução abrindo `JOGAR.html` sem servidor. O motor `dist/save.js` mantém a fase atual e a promessa de carregamento da próxima; o token `cache.epoch` evita aplicar uma resposta antiga após troca de fase.

A evolução específica da v0.4.0 é a fase 02, **Ponte dos Esquecidos**: duração de aproximadamente 110 s; escolha entre caminho superior, inferior e central; passagem secreta após romper um selo; eventos filtrados por rota; três tesouros com recebimento único; checkpoint contendo o caminho escolhido. **Não se deve dizer que as 24 fases possuem ramificações equivalentes.** Os demais níveis seguem o conteúdo próprio do pacote.

O motor `dist/flight.js` usa eventos programados por tempo, índices estáveis para a retomada, IDs para recompensas, limite de entidades e estados serializáveis. `dist/save.js` grava uma cópia prévia da chave principal `ultimoNinho.save.v1` e tenta ler o backup quando a principal não passa pela validação. O projeto usa malhas procedurais de baixo número de polígonos (módulos `src/mesh.js`, `src/creatures.js`, `src/landscape.js`), modelos/partes reutilizados e liberação de geometria ao trocar cenas (`src/flight-view.js`). Há suíte de testes Node para campanha, rotas e cenas.

O `CHECKPOINT.md` do jogo registra limitações: validação de navegador real e dispositivos físicos pendente na versão enviada. Os testes de cena e medição SVG em Node **não comprovam 60 FPS no celular**.

## 2. O que foi incorporado ao GameForge nesta etapa

### GF-025: recuperação de progresso por backup validado

`js/urban-save.js` preserva a escrita temporária com conferência que já existia e acrescenta `<chave>:backup`:
- antes de substituir o save principal, guarda a versão anterior **somente se passou na mesma validação do motor**;
- ao ler, tenta primeiro a chave principal, depois o backup validado se aquela estiver ausente ou corrompida;
- ao reiniciar uma partida, elimina as chaves principal, temporária e de backup;
- falhas de quota do backup não impedem a tentativa de escrita na chave principal, cuja operação individual do localStorage é atômica; não prometer transação multi-chave/backup garantido sem espaço;
- mantém os formatos v1 e v2 e as chaves originais de URB-01/missões, sem conceder recompensas ou alterar o plano.

`tests/urban-save.test.js` cobre fallback, backup não sobrescrito por dados corrompidos, rejeição de esquema incompatível e limpeza.

### GF-017: menos draw calls no cenário da nave 3D

`js/shooter-3d-runtime.js` substitui **65 estrelas normais ou até 110 no perfil alto, que eram malhas individuais**, por um lote `THREE.InstancedMesh` de geometria/material compartilhados. As instâncias continuam movendo-se em cada frame por matriz. Na troca de fase o lote é descartado com as demais geometrias e materiais.

No renderizador CPU compatível (**que não implementa desenho de InstancedMesh**) o motor mantém as antigas malhas independentes (35 estrelas), protegendo a visualização em aparelhos sem WebGL. A telemetria agora apresenta `starCount` e `starDrawBatches`. Isso reduz a quantidade de lotes de desenho da decoração no WebGL; **não é uma medição comprovada de FPS**.

`tests/shooter-3d.test.js` valida instância, contagem, atualização das matrizes e liberação em reinicialização. Os testes de exportação e Chromium do GameForge devem continuar verdes no mesmo SHA.

## 3. O que é interessante, mas continua pendente

1. **GF-010 — rotas por fase executáveis:** desenvolver um `StageBranchSpec` derivado de GDD, com fases e objetivos explícitos, escolha por interação, eventos filtrados pelo caminho, convergência, caminhos secretos e condições executáveis. Não basta escrever `rota superior` no HUD. Validar dois jogos diferentes e teste completo de campanha. **Não implementado nesta etapa.**
2. **GF-025/GF-009 — checkpoints por evento e carga parcial:** persistir fase/posição/objetivos/itens e recompensas com identificadores estáveis e migração de esquema; não copiar o JSON do jogo de dragões ou reiniciar uma missão já concluída.
3. **GF-017 — lotes reutilizados em outros motores:** medir instancing e merge por tipo de objeto; não aplicar em sprites animados ou ao renderizador CPU sem suporte.
4. **GF-002/GF-005 — dados de nível externos com fallback offline:** só migrar do `GAME_SPEC` embutido para arquivos separados quando houver ganho mensurado. Se implementar, preservar `file://`, importação ZIP, prévia isolada por CSP e testes de atual/próxima/cancelamento.
5. **GF-019 — QA de comportamento:** testar cada bifurcação, retorno de checkpoint, recompensas únicas, expiração de eventos e inícios/términos de fases, com orçamento de entidades.

## 4. Proveniência e direitos

Os arquivos `dist/capa.webp`, `dist/brasa.ttf`, modelos/arte procedurais, nomes, narrativa, criaturas e dados de missões **não foram incorporados** ao GameForge. O ZIP examinado não apresenta uma licença geral clara que autorize redistribuição independente de cada asset. Aproveitamos *padrões técnicos* implementados de forma nova; a licença do pacote Three.js é um componente separado.

## 5. Regras para concluir

- `npm test` e `npm run verify:exports` precisam passar no SHA exato.
- Exigir boot e exportação offline do shooter 3D e dos jogos urbanos em Chromium na mesma CI.
- Não chamar jogos com bifurcação de “prontos” enquanto o `StageBranchSpec` não possuir runtime real.
- Não extrapolar ganhos de draw calls para FPS em celulares físicos sem benchmark.
