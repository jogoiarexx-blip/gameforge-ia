# GF-OPEN-01 — Pré-análise de GLB antes da importação

Data: 23/11/2026. Entrega incremental, sem substituir Three.js nem os motores existentes.

## Objetivo
Mostrar a compatibilidade estrutural de um GLB antes de gravá-lo no IndexedDB. Os arquivos continuam locais no navegador; nenhum modelo é enviado para serviço externo.

## Implementação
- js/glb-readiness.js: análise somente-leitura do JSON glTF 2.0. Informa contagem estimada de triângulos, malhas, primitivas, imagens, materiais, skins, clipes e detecção por nomes de estados idle/walk/run/aim/attack/hit/death.
- Detecta extensões obrigatórias não aceitas pelo leitor offline atual (EXT_texture_webp é a única extensão required aceita), imagens com URI externa, múltiplos buffers e topologias não triangulares.
- Exibe recomendações informativas para GLBs maiores que 14 MiB, malhas maiores que 150 mil triângulos e rigs com muitos ossos. Não reduz polígonos automaticamente nem garante FPS.
- index.html apresenta o painel de diagnóstico e js/app.js bloqueia importação marcada como incompatível. A validação real de malhas, ossos, bytes e hierarquia continua em GameForgeGLB.decode(null,data) antes de salvar, com as verificações SHA-256 existentes.
- tests/glb-readiness.test.js: testes de contagem, aliases de clipes, extensões, texturas e custos estimados.
- Nenhuma mudança nos manifestos existentes, backups, ZIPs, controles, fases ou formatos de exportação.

## Uso
1. No Studio, gere um jogo 3D e abra Inserir modelo 3D (GLB).
2. Escolha papel (cenário, jogador ou inimigo) e arquivo GLB de até 25 MB.
3. Observe o relatório. ESTRUTURA OK e REVISAR ainda exigem validação completa do runtime e prévia; INCOMPATIVEL bloqueia o arquivo.
4. Confira em navegador desktop e celular reais antes de publicar.

## Não implementado
- Não integra glTF-Transform nem Draco/Meshopt/KTX2.
- Não há redução automática de malhas, compressão de texturas, retargeting de rigs ou animações inventadas.
- Triângulos são estimados dos accessors, não por benchmark de GPU.
- Não detecta visualmente modelos invertidos, T-pose, deformações ou colisões.

## Qualidade
Executar npm test, npm run verify:exports e a matriz Chromium no GitHub Actions para o SHA exato. Não promover à main ou Pages sem CI verde e revisão.

## Próxima etapa — GF-OPEN-01b
Ferramenta opcional de otimização GLB com glTF-Transform, com testes de importação antes/depois e orçamento mobile; depois GF-OPEN-02 para editor de cena 3D.
