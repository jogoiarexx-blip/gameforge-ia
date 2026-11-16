# Publicação verificada do GameForge — GF-001

## Objetivo e estado
A partir desta etapa, existe uma rota de publicação **dependente da CI verde**.
- `.github/workflows/verify.yml`: valida sintaxe, executa `npm test`, pré-valida todas as exportações com `npm run verify:exports` e roda o benchmark informativo.
- `.github/workflows/publish-verified.yml`: só dispara após conclusão de **Validar GameForge Studio** e somente publica eventos de **push em main** verificados com sucesso. Revalida repositório, SHA e se a main ainda aponta para o commit testado, reduzindo risco de republicação atrasada.
- `tools/pages-gate.cjs`: rejeita execução com falha/cancelamento, PR, fork, branch divergente ou SHA inconsistente; `tests/pages-gate.test.js` simula esses casos.
- `tools/verify-exports.cjs`: gera e valida a sintaxe de `game.js` para todos os gêneros 2D/3D da matriz, além de FPS com loja; rejeita scripts remotos e dependências ausentes. Teste negativo prova que JS sintaticamente inválido falha.

**IMPORTANTE — etapa de configuração obrigatória:** a publicação automática antiga `pages build and deployment`, originada da branch, ainda pode publicar mesmo quando a CI falhar. O novo workflow sozinho **não desativa essa rota**. Para completar o bloqueio de verdade, alguém com acesso administrativo deve abrir o repositório → **Settings → Pages → Build and deployment → Source** e selecionar **GitHub Actions**. O Studio não tem acesso à configuração do Pages via ferramentas usadas aqui; não afirmar que a proteção está completa antes dessa mudança.

Depois de alterar a fonte, confirme que a única rota de promoção ativa seja `Publicar GameForge verificado`. Não duplique pipelines de publicação. Idealmente configure o ambiente `github-pages` para aceitar somente main e exija a verificação como proteção de branch, se disponível.

## Verificação e reprodução
1. Execute `npm test` e `npm run verify:exports` localmente; ambos devem passar.
2. Para teste negativo seguro em **arquivo de teste isolado**, `tests/pages-gate.test.js` envia um `game.js` inválido ao validador e exige a rejeição. **Não empurre código quebrado intencionalmente para a main**, pois a antiga rota de Pages pode estar ativa até a migração.
3. No histórico do Actions, confira o mesmo commit em `Validar GameForge Studio` (verde) e `Publicar GameForge verificado` (verde). Se main avançar durante o build, o gate reprova o SHA antigo; isso é uma proteção deliberada, não um erro do site.
4. Teste no navegador que o site e as exportações continuam acessíveis. A suíte Node não substitui QA de WebGL/Android.
5. Após migrar a fonte, um teste negativo em uma **branch de pull request** deve mostrar testes falhando e nenhum deploy promovido. Não usar a main para validar falha de propósito.

## Recuperação (rollback)
- Se a nova publicação falhar, mantenha o último artefato validado; não altere a fonte de volta para **Deploy from a branch** para contornar testes.
- Corrija a falha na main ou reverta o commit defeituoso com `git revert <sha>` e envie um novo commit. Este novo commit deve passar a CI e ser publicado pelo workflow verificado.
- Se o site já estiver quebrado, investigue o último commit aprovado em Actions, crie uma reversão em main, rode testes e aguarde o deploy; não force a publicação de um SHA que não passou pela CI.
- Registre SHA de origem, execução da CI, execução de deploy e evidência visual da recuperação.

## Limites técnicos
- O gate valida sintaxe e dependências locais dos arquivos de saída; não garante a inexistência de bugs de lógica, segurança, desempenho ou visual. Esses riscos exigem testes de navegador e revisão humana.
- PRs e forks não recebem autorização de publicação. O deploy confere que o HEAD de main é igual ao SHA verificado **antes** de empacotar, mas uma main que avance após essa checagem ainda pode requerer conferência no histórico.
- O projeto é GitHub Pages estático; não usa Render nesta rota.
