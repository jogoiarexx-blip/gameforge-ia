# GameForge — Skill técnica: caminhos alternativos e atores GLB (GF-010 + GF-015)

**Data:** 16/11/2026. Fonte de referência: ZIP `Asas_do_Ultimo_Ninho_v0.4.0_Caminhos_dos_Esquecidos.zip` para ramificações de fases e `Quebra-no-tempo-v0.15.0.zip` para reprodução de animações existentes. Os módulos criados no GameForge são originais; nenhum asset/campanha/trecho literal dos ZIPs foi incorporado.

## 1. Linguagem que o compilador entende de verdade

Exemplos de instruções para criar um **shooter 3D** com a mecânica atualmente executável:
- `Crie uma navinha 3D com 3 caminhos alternativos e recompensas diferentes por fase.`
- `Quero três caminhos: superior, central e inferior, com uma passagem secreta.`
- `Faça dois caminhos diferentes para cada fase.`

`js/stage-branches.js` é o contrato puro: `parse(text)` cria `stageBranches.version=1`, `options` lista até três escolhas e uma secreta quando desbloqueada, `choose` retorna fatores, `validateCheckpoint` valida o save. `js/parser.js` inclui `stageBranches` quando o gênero é `shooter` e a dimensão é `3d`. Não ativar em gêneros incompatíveis nem prometer suporte a nomes arbitrários ou mapas criados por texto. A versão atual usa perfis predefinidos: alto (menos inimigos e menor bônus), central (intermediário), baixo (mais difícil e maior bônus). A rota secreta exige ao menos 10 eliminações.

`js/shooter-3d-runtime.js` mostra botões de rota no overlay e aceita as teclas 1–4. O jogo só entra na fase quando a escolha é feita; onda inicial, HP/velocidade de inimigos e prêmio de conclusão variam no próprio código. A mesma escolha reaparece nas fases seguintes. Save em `localStorage` via `GameForgeUrbanSave`, chave própria `gameforge-shooter-branches-v1-<titulo>`; salva fase, rota selecionada (ou pendente), vida, pontos, arma e eliminações. Retomar reinicia a fase do checkpoint, não a posição exata de cada tiro ou NPC. Dados inválidos são rejeitados. Não duplicar bônus ao recuperar uma gravação antiga.

**Não implementado:** rotas geográficas físicas diferentes, biomas exclusivos por caminho, eventos condicionais complexos, mapas secretos gerados por prompt, ramificações em RPG/plataforma/urbano. Essas mudanças exigem outro incremento. Um GDD mais elaborado não deve aparecer como `concluído` se pedir tais regras.

## 2. GLB animado: fluxo real no GameForge

Na biblioteca GLB, o Studio aceita até quatro modelos de 25 MB cada, 50 MB no projeto. O usuário seleciona o papel `scene` / `player` / `enemy`. O manifesto conserva `role` em `ASSET_LIBRARY.json`, e `js/generator.js` envia `role` junto dos bytes para exportação HTML/ZIP sem rede.

`js/glb-runtime.js` decodifica a geometria GLB e agora:
- aceita skinning com `JOINTS_0`/`WEIGHTS_0`, `skins.joints` e matrizes `inverseBindMatrices`;
- constrói `THREE.Bone`, `THREE.SkinnedMesh` e `THREE.Skeleton`;
- interpreta clipes de `animations[]` para translação, rotação e escala dos nós, usando interpolação `LINEAR` ou `STEP` e gerando `THREE.AnimationClip`;
- aceita `EXT_texture_webp` exigida, se a textura estiver embutida; outras extensões obrigatórias continuam rejeitadas;
- conserva guardrails: máximo de 25 MB, limites de nós, meshes, rigs e canais; sem fetch externo.

`js/actor-animations.js` cria `THREE.AnimationMixer`, localiza clips por nomes como Idle, Walk/Walking, Run/Running, Aim, Attack/Fire, Hit/Damage e Death/Fall e alterna com transição. Não inventa clipes ausentes ou faz rigging automático; usa fallback para clipe existente. No `js/urban-runtime.js` (protótipo) o jogador e guarda recebem modelos com papéis pertinentes; o morto só continua visível temporariamente se possuir um clipe de morte. No `js/urban-mission-runtime.js` (missões compiladas), o personagem e guardas podem executar clipes; a animação de morte do guarda pode ser interrompida quando a missão remove o ator imediatamente, uma limitação a resolver. Sem GLB válido, o jogo mantém os bonecos procedurais.

**Não implementado:** catálogo completo de movimentos para qualquer modelo, retargeting de rigs, combinação de clipes entre esqueletos, blend trees com tempo de pé no solo, suporte a Draco/KTX2 e testes em celulares com todas as variantes Mixamo. Aquele GLB que tenha só `Idle` continuará sem `Attack` verdadeiro; não anunciar animação sintetizada. Os papéis `player`/`enemy` são usados nos dois motores urbanos 3D; outros motores não substituem seus protagonistas automaticamente nesta etapa.

## 3. Testes e critérios de aceite

- `tests/stage-branches.test.js`: prompt leigo, dois/três caminhos, segredo, escolha e checkpoint inválido.
- `tests/shooter-3d.test.js`: aciona a escolha de rota na simulação 3D, compara quantidade de inimigos e valida save.
- `tests/glb-animations.test.js`: constrói um GLB sintético com skin e sete clipes, roda o `THREE.AnimationMixer` e verifica papéis no manifesto.
- `tests/asset-library.test.js`, `tests/export-boot-matrix.test.js`, `tests/browser-export-matrix.py`: regressões de importações, ZIP offline e compatibilidade dos demais motores.

**VALIDADO somente quando o GitHub Actions do commit exato terminar com Node e Chromium verdes e o fluxo de publicação verificada concluir.** O teste sintético de GLB é verificável, mas não substitui testes com modelos reais autorizados e aparelhos físicos. Não chamar de suporte universal a todos os GLBs.

## 4. Próximos avanços

1. GF-010 v2: eventos espacialmente ligados a rotas, cenários/desafios únicos, checkpoints no meio da fase, recompensas exclusivas com IDs e navegação visual.
2. GF-015 v2: clipes de golpe/dano/morte com transições temporizadas mesmo quando a missão termina, SkeletonUtils para clonar rigs sem recarregar GLB, retargeting opcional e fallback procedural para clips ausentes.
3. GF-018/GF-017: controles mobile de escolha de rota, benchmarks de skinning e otimização do custo de dezenas de NPCs animados.
4. Estender o contrato de `stageBranches` a novos gêneros só depois de validar um sistema realmente executável em cada runtime.
