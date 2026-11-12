# GameForge Studio v0.10 — roteiro de desenvolvimento por GDD

## O que mudou
- O painel **10 / ROTEIRO DO GDD** indexa capítulos de documentos Markdown, inclusive documentos maiores que 300 KB (limite do importador: 1 MB).
- Tarefas classificadas por sistemas: fases, inimigos, menus, personagens, gráficos, áudio, salvamento e performance.
- Filtros, busca, seleção de tarefa e comando de melhoria contextualizado pelo trecho original.
- Integração com geração incremental e QA: alterações aplicadas seguem para **aguardando revisão** apenas após teste concluído.
- O usuário valida explicitamente; gerar código não implica requisito concluído.
- Exporta `PLANO_TAREFAS_GDD.md` e `TAREFAS_GDD.json` junto com o jogo, documentação e código.
- Estados persistidos no navegador e incluídos no mecanismo de desfazer; mudanças no GDD invalidam avaliações antigas pendentes de revisão.

## Como usar
1. Carregue um GDD e clique **Atualizar tarefas do GDD**.
2. Pesquise a tarefa desejada, selecione-a e clique **Usar tarefa como instrução**.
3. Clique **Planejar alteração**, depois **Aplicar melhoria**.
4. Observe o QA. Jogue, confirme os critérios e clique **Validar após QA**.
5. Repita por tarefa; faça backup em **Baixar projeto .ZIP**.

## Limitações
- O modo sem IA implementa somente alterações predefinidas; um comando livre não vira recurso novo magicamente.
- O GitHub Pages é hospedagem estática. GPT/Claude/Gemini, compilação de Three.js e OpenCode exigem backend configurado com segurança.
- Os testes do navegador são de regressão limitada, não evidência de todas as mecânicas do GDD.
- Jogos 3D completos e refatoração multiarquivo autônoma ainda são pendências.
