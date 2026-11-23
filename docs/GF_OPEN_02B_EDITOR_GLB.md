# GF-OPEN-02b — Modelos GLB na cena 3D e ferramentas de transformação

Data: 23/11/2026.

## Entregue
- Modelos GLB já importados no Studio como Cenário podem ser selecionados no Editor 3D (até 4 modelos/50 MB por projeto).
- O editor acessa o GLB original pelo IndexedDB usando projeto/ID/hash SHA-256, sem copiar arquivos grandes para localStorage nem depender de servidor.
- Nova entrada kind=glb no SCENE3D_LAYOUT.json, com assetId obrigatório. O contrato verifica existência e papel do modelo no manifesto ao receber/aplicar/gerar cena.
- Visualização real do GLB no editor em WebGL; enquanto carrega, caixa substituta. Caso arquivo esteja indisponível, relatório de erro sem bloquear a edição dos outros objetos.
- Três modos para arrastar objetos no editor: W mover, E girar, R escalar. Também há ajustes numéricos e indicadores visuais de transformação; não é TransformControls oficial.
- Cada instância GLB recebe posição X/Z, rotação Y, escala e opção de colisão. Um mesmo modelo pode ser reutilizado em múltiplas posições da mesma fase ou em fases diferentes.
- No jogo, modelos configurados por fase não duplicam a instância global de importação. GLBs sem vínculo com o editor preservam seu posicionamento antigo.
- Colisão opcional do GLB por AABB derivado da geometria real transformada (Box3.setFromObject). É uma aproximação, sem colisão per-triangle nem navmesh.
- O Studio impede trocar o papel/remover um GLB que ainda esteja em uso em uma cena salva.
- Testes Node e um novo teste Chromium de upload, renderização, transformação, transferência, exportação ZIP e restauração.

## Uso
1. Gere um jogo Arena, FPS ou RPG 3D no modo Sem IA.
2. Em Inserir modelo 3D (GLB), importe arquivo .glb e escolha uso Cenário.
3. Em Cenários 3D, clique Abrir editor de cena 3D; o navegador compartilha o índice dos modelos entre as duas abas.
4. Escolha Modelo GLB da biblioteca, selecione o asset e adicione ao mapa.
5. Selecione na lista ou clique no modelo; arraste para mover (W), girar (E) ou ajustar escala (R). Opção colisão cria AABB.
6. Clique Enviar ao Studio, depois Receber cena do editor e Aplicar ao jogo gerado. Teste no modo Jogar e exporte ZIP para guardar o GLB e a configuração.

## Limitações
- Os GLBs devem existir no mesmo projeto/origem. Importar apenas o JSON em outro computador não transfere os GLBs; use backup ZIP completo.
- O editor visualiza pose estática; não edita esqueleto, animações ou malhas. A clonagem de modelos esqueléticos pode requerer SkeletonUtils no futuro.
- Colisão aproximada AABB pode ser maior que o contorno do modelo rotacionado. Objetos grandes podem bloquear rotas; ainda não há teste automático de alcançabilidade, NPC navmesh nem gizmos profissionais.
- Transformações do editor atuam no plano do chão, rotação Y e escala uniforme. Não edita eixos independentes, pivôs ou altura Y.
- Imagens/texturas do GLB dependem do suporte já existente no leitor GameForge, não adiciona Draco/KTX2/Meshopt.
- Não altera o modo urbano, FPS fora do motor padrão, SNES 2D, corrida ou shooter 3D.

## Portão de qualidade
Requer npm test, validação de exportação, Chromium existente, GF-OPEN-02b Chromium e smoke de otimização GLB aprovados no commit do PR antes de fazer merge e publicar.
