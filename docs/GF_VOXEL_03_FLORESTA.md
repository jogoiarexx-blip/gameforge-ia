# GF-VOXEL-03 — Floresta renovável

Referência: Prismal Voxel, sistemas de árvores/mudas e edições de chunks. Opção de floresta no modo coleta; mantém o mundo criativo e o modo coleta sem floresta. Chave de save independente; não migra saves antigos.

- Árvores determinísticas por seed, tronco de três blocos e copa de folhas; uma árvore próxima do spawn e distribuição por grade.
- Corte integral ao minerar tronco/folhas: três madeiras e uma muda. Se não houver espaço para ambos os recursos, árvore e inventário não mudam.
- Madeira selecionável com tecla 8; muda com tecla 0 (ou ciclo de material no touch). Plantio consome muda, requer grama/terra e espaço livre.
- Crescimento após 20 segundos de simulação ativa, somente quando volume da árvore está livre de construções e do jogador. Pausa congela crescimento. Solo sob árvore protegido; máximo 64 árvores/mudas.
- Células de árvore pertencem a entidade separada de edições de construção; corte e crescimento reconstroem chunks afetados e vizinhos de borda.
- Save local inclui registro completo de árvores, mudas e tempo restante. Valida registros, sobreposição, inventário e compatibilidade de modo; árvore removida não reaparece ao carregar.
- Folhas são removidas junto com a árvore, sem animação física. Sem árvores de espécies distintas, machado, tábuas, fome, criaturas ou mundo infinito ainda.

## Validação
tests/voxel-forest.test.js cobre seed, corte atômico, inventário cheio, plantio, crescimento bloqueado e save/reload. tests/browser-gf-voxel-03.py testa corte, plantio, pausa e crescimento após recarregar o ZIP real no Chromium. Integrar somente quando Node, GLB e Chromium aprovarem o SHA atual.

## Próximo
GF-VOXEL-04: ciclo dia/noite, vida e fome, alimentação e criaturas simples; manter criativo independente.
