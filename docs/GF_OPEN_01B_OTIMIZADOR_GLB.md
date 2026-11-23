# GF-OPEN-01b — Otimizador GLB conservador, offline

Data: 23/11/2026. Referência: [glTF-Transform](https://github.com/donmccurdy/glTF-Transform), licença MIT. Esta implementação usa a CLI 4.5.1 como dependência de desenvolvimento e **não** adiciona a biblioteca ao runtime dos jogos exportados.

## Objetivo
Preparar GLBs, inclusive modelos gerados no Meshy AI, para importação no GameForge e no GitHub Pages **sem introduzir Draco, Meshopt, KTX2 ou outra extensão não suportada**. Executar localmente com Node.js 20+, fora do navegador. Não depende de Blender, serviços externos, API ou upload dos modelos.

## Como usar (Windows / terminal)
1. Tenha Node.js 20+ instalado.
2. Na pasta clonada do GameForge: `npm install`
3. Executar:
   `npm run optimize:glb -- "C:\\Modelos\\personagem.glb" "C:\\Modelos\\personagem-gameforge.glb"`
4. Para reduzir ainda mais (modifica texturas e pode reduzir detalhes visuais):
   `npm run optimize:glb -- "C:\\Modelos\\personagem.glb" "C:\\Modelos\\personagem-mobile.glb" --webp --resize=1024`
5. Abrir o Studio, criar jogo 3D, importar a versão otimizada, testar clipes e movimentação em navegador e celular. Fazer backup ZIP.

No Linux/macOS, use os caminhos respectivos. Não use o mesmo caminho para origem e destino. Se a saída já existir, é possível usar `--force` por escolha explícita.

## Pipeline
1. Verifica o cabeçalho GLB 2.0 e limita o arquivo de entrada a 100 MB.
2. Executa `gltf-transform dedup` e `gltf-transform prune` com a CLI local, sem conectividade no momento da conversão.
3. Opcionalmente, `resize` (512, 1024 ou 2048) e `webp --slots baseColor`, com mudanças visuais possíveis.
4. Relê o resultado, rejeita alteração de quantidade/nome/canais de animações, estrutura/contagem de joints de skins ou remoção completa das malhas.
5. Valida **todo o GLB de saída** com o leitor atual `GameForgeGLB.decode(null,...)`; exige até 25 MB. A biblioteca do Studio continua limitada a 4 assets e 50 MB por projeto.
6. Se a saída não diminuir, salva uma cópia do original somente se for importável. Nunca edita o original. Não cria saída se houver erro.

## O que NÃO promete
- Não cria animações, não corrige T-pose, não faz retargeting nem garante preservação visual perfeita.
- Não é simplificador de polígonos; `dedup` e `prune` removem redundâncias. Não são sinônimos de compressão de malhas.
- Não converte um arquivo Draco/KTX2/Meshopt incompatível em formato aceito automaticamente.
- WebP e resize exigem inspeção visual porque podem alterar materiais ou texturas.
- CLI deve ser instalada via npm antes do primeiro uso; não executa dentro do site GitHub Pages.
- Testes estruturais não substituem teste com personagens reais animados e aparelhos físicos.

## Verificação
- `npm test`: sintaxe, parsing, preservação de clipes, rollback e falhas simuladas.
- `npm run verify:glb-optimizer`: chama a **CLI verdadeira** com modelo de teste, reabre a saída com leitor GameForge e assegura compatibilidade.
- Workflow GitHub Actions: novo job com instalação das dependências apenas para testes (Node 20). O runtime estático não carrega bibliotecas do glTF-Transform.
- Critério para merge: jobs Node, Chromium e otimizador aprovados no SHA do PR.

## Próximas etapas
- GF-OPEN-01c: modelo real Meshy AI, medição de tempos, qualidade visual, texturas e peso nos perfis desktop/mobile; avaliar LOD.
- GF-OPEN-02: editor visual de cenas 3D no Studio (TransformControls, hierarquia, coordenadas e componentes).
