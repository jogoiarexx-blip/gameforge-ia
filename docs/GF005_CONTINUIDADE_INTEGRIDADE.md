# GF-005 — Continuidade de projetos e integridade de GLBs

**Data:** 16/11/2026 · **Estado:** EM REVISÃO até CI/Chromium do último commit.

## Diagnóstico encontrado no código

1. Em `js/app.js`, `loadProject()` calculava `GameForgeParser.parseGdd(snap.gdd)` antes de verificar se já existia um `GAME_SPEC` válido. Como `parseGdd('')` rejeita GDD vazio, um jogo criado **somente por comando** podia falhar ao recarregar/restaurar, mesmo contendo código completo.
2. A biblioteca de GLBs guardava no manifesto apenas ID, nome, bytes e posição. Na restauração ZIP, CRC e tamanho confirmavam que o arquivo não sofreu erro casual de transferência, mas um GLB diferente de mesmo tamanho com CRC recalculado poderia ser aceito como se fosse o original.
3. Uma falha ao persistir asset em IndexedDB durante a restauração mantinha corretamente os dados atuais, mas não encerrava o diálogo, deixando a ação de restauração pendente e dando aparência de operação travada.
4. Existia `tests/browser-project-continuity.py` fora da CI, usando um caminho fixo `/usr/bin/chromium` que não é o navegador Playwright instalado no runner.

## Código efetivamente implementado

- `js/app.js` — restauração usa `GameForgeProject.activeSpec(files,null)` quando há `GAME_SPEC` válido; só interpreta texto como alternativa. GDD vazio agora usa comando original. O fluxo de importação adiciona SHA-256 ao manifesto de GLBs e valida o hash do ZIP **antes** de oferecer a confirmação. Quando a escrita dos binários falha, remove a nova transação, fecha o diálogo e preserva o projeto atual.
- `js/asset-library.js` — `sha256(bytes)`, `verify(bytes,sha)`, extensão opcional `sha256` em `ASSET_LIBRARY.json` e comparação na recuperação de IndexedDB e materialização de ZIP. A validação também rejeita hash inválido. Manifestos legados sem hash seguem permitidos, com proteção anterior de CRC/tamanho, mas **não** recebem confirmação criptográfica retroativa.
- `tests/asset-library.test.js` — testes unitários comparando SHA com o `node:crypto`, detectando GLB de mesmo tamanho alterado e reempacotado em ZIP com CRC válido, e compatibilidade do manifesto legado.
- `tests/browser-project-continuity-gf005.py` — novo fluxo em Chromium Playwright: criação apenas pelo comando, edição persistente de `game.js`, upload de GLB triangular válido para IndexedDB, reload local, backup ZIP, exportação de jogo completo, restauração em outro contexto sem armazenamento compartilhado, comparação dos bytes e hash, alteração incremental e desfazer, rejeição de ZIP adversarial, falha simulada de gravação IndexedDB, aviso de `QuotaExceededError` e viewport mobile.
- `.github/workflows/verify.yml` — roda o teste GF-005 com Playwright após a matriz de 14 motores + Studio da GF-002. A CI não pode ser aprovada só pelo Node quando o teste de continuidade falha.

## Garantias e limites

- Hash SHA-256 é **verificação de integridade de uma cópia**: serve para detectar arquivos trocados/adulterados em relação ao manifesto originalmente produzido. Não autentica a identidade do autor nem torna um arquivo de fonte desconhecida seguro.
- O GameForge continua a aceitar só GLBs válidos do tipo **cenário estático**; animações de personagens, rig e otimização de assets ainda não estão implementados (GF-015/016).
- O backup JSON **não inclui os binários do IndexedDB**. Para projetos com GLB, use sempre o backup `.gameforge.zip` completo.
- O Studio exige `https:` ou `localhost` para Web Crypto `SubtleCrypto` quando importar GLB novo. Não mantém GLBs enormes em `localStorage`.
- O armazenamento local pode esgotar a quota; o projeto avisa e continua oferecendo backup. Não é armazenamento em nuvem.
- A restauração requer confirmação. Operações binárias tentam gravar primeiro em um **novo namespace de projeto**, para não sobrescrever modelos existentes.
- As verificações de Chromium usam um GLB triangular mínimo sintético e dados do navegador de CI. É necessário avaliar GLBs reais grandes, dispositivos Android/iOS, encerramento abrupto do processo e limites de memória antes de declarar continuidade universal.

## Checklist da revisão

1. Conferir a execução CI e Chromium para o mesmo SHA da main após concluir todas as mudanças.
2. No navegador, gerar um FPS 3D sem GDD, importar um GLB, baixar `.gameforge.zip`, recarregar e abrir em um perfil limpo.
3. Confirmar que o `ASSET_LIBRARY.json` possui `sha256` e que o GLB materializado tem os mesmos bytes.
4. Em ZIP inválido ou falha simulada no IndexedDB, o projeto anterior não deve ser substituído.
5. Testar edição, melhoria, desfazer, quota e reexportação, mantendo o token de servidor fora do backup.
6. **GF-001 continua pendente**: desativar a rota de publicação por branch selecionando GitHub Actions em Settings → Pages; caso contrário commits falhos ainda podem ser servidos por outra rota.

**Próxima ação do plano:** GF-006 (simplificação do fluxo visual) ou GF-009 (versionamento de save e migração) após a aprovação final da GF-005.
