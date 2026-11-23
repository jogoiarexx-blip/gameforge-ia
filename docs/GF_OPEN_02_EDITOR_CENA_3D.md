# GF-OPEN-02 — Editor visual de cena 3D integrado ao GameForge

Data: 23/11/2026. MVP sem dependências de rede, usando Three.js r180 já incluído no projeto.

## O que foi implementado
- Editor WebGL dedicado: tools/scene3d-editor.html.
- Adição/seleção/duplicação/remoção de objetos, hierarquia simples, arrastar no plano XZ, orbitar câmera, zoom, edição numérica de posição, rotação e escala, cor e colisão, desfazer/refazer.
- Tipos disponíveis: crate (caixa), wall (parede), pillar (pilar), tree (árvore) e lamp (luminária com PointLight). Objetos são geométricos/procedurais, não modelos externos.
- Até 30 fases, 24 objetos/fase, 2 luzes/fase. Configuração sceneObjects aplicada somente aos motores Arena/FPS/RPG 3D.
- Contrato validado por js/scene3d-layout.js. JSON só contém campos tipados permitidos, sem código executável. Transferência editor → Studio via localStorage de mesma origem (sem serviços externos).
- No Studio há uma seção "Cenários 3D", campo JSON, botão Receber cena e botão Aplicar ao jogo gerado.
- No game.js exportado cada fase pode receber objetos e luzes. Parede/caixa/pilar/árvore fornecem colisores aproximados AABB para movimento; objetos rotacionados usam o AABB envolvente, não colisão OBB precisa.
- Atualização de jogo já criado altera o GAME_SPEC de game.js, registra histórico e regenera HTML preservando os outros arquivos.
- SCENE3D_LAYOUT.json acompanha projetos 3D com cena editada e backups. A configuração também está no GAME_SPEC.
- Sem CDN, editor usa o bundle oficial versionado em vendor/three-source.js.

## Como usar
1. Crie ou selecione projeto Arena, FPS ou RPG 3D no modo Sem IA.
2. Abra Cenários 3D → Editor visual. Em outra aba, crie objetos e edite.
3. Clique em Enviar ao Studio; volte ao Studio e clique em Receber cena do editor.
4. Se ainda não criou o jogo, clique em Criar novo jogo. Se já criou, clique em Aplicar ao jogo gerado.
5. Teste na prévia e exporte ZIP. O SCENE3D_LAYOUT.json e o game.js mantêm as posições por fase.

## Limitações honestas
- Não é um editor de malhas, rigging, pintura, terrain, câmera em trilhos ou edição de GLB via gizmos; modelos GLB continuam na biblioteca existente.
- Luzes PointLight são até duas/fase e omitidas no renderer de software; sem suporte a baked lighting, sombras por luzes dinâmicas ou controles HDR.
- Objetos aparecem sobre o cenário procedural existente: ainda podem cruzar obstáculos ou obstruir objetivos preexistentes. Não existe análise automática de alcançabilidade.
- Colisão AABB é aproximada (inclusive para objetos girados). No editor não há visualização exata de hitbox; navegação de NPCs não utiliza navmesh.
- O editor exige WebGL; jogos exportados mantêm o fallback de renderização que já existia.
- As cenas ficam limitadas aos motores arena/fps/rpg 3D. Não modifica urbano, shooter, plataforma ou corrida.
- Importação arbitrária de código ou assets de terceiros no editor não é suportada.

## Portão de qualidade
- npm test + verify:exports + bench:arena.
- CI Chromium adicional: abre editor WebGL, cria objetos, salva/transferência para Studio, gera jogo, exporta ZIP, aplica nova posição e recarrega projeto.
- Sem merge/publicação sem todos os checks verdes no SHA revisado. Teste visual manual em Android/iOS continua pendente.

## Próximo incremento — GF-OPEN-02b
Ferramentas de seleção e transformação com gizmos Three.js, suporte a GLBs já importados e precisão dos colisores; objetos por fase com verificação de rota até saída.
