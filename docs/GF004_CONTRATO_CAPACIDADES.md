# GameForge GF-004 — Contrato executável de GDD e instruções

**Data:** 16/11/2026 · **Estado:** EM REVISÃO até CI do último commit e QA real.

## Objetivo

Parar de confundir **uma linha de texto reconhecida** com **uma mecânica de jogo implementada**. O GameForge já convertia alguns parâmetros para GAME_SPEC, mas chamava tudo de aplicado, sem associar execução real, gênero ou linha do documento.

## Entregas

- `js/game-capabilities.js` — manifesto declarativo por gênero/dimensão, caminhos de configuração, contratos, testes conhecidos e `check(spec)` contra dados incompatíveis; relatório com fonte e linha do GDD.
- `js/intent-compiler.js` — compila `implementation.audit` e mantém os formatos antigos; interpreta exclusões ("sem multiplayer") como **não solicitadas** e deixa o **último comando prevalecer** quando loja é ligada/desligada. Protege duração de sobrevivência diante de rótulos de HUD repetidos.
- `js/generator.js` — recusa GAME_SPEC inválido antes de serializar o runtime; exporta `CONTRATO_CAPACIDADES.md` e `CAPACIDADES.json`.
- `js/project-backup.js` — preserva os dois arquivos novos entre salvamento/restore/undo.
- `js/app.js`, `index.html` — mostra um resumo das quatro situações no editor, com origem e linha quando localizáveis.
- `js/development-engine.js` — exige que um runtime legado contenha o contrato `R.missionReady()` antes de aceitar uma nova missão configurável; não basta injetar um campo JSON.
- `tests/game-capabilities.test.js`, `tests/intent-evolution.test.js` — testes de compatibilidade, evidência, exportação, backups, negações, sobrescrita de loja e legado.

## Os quatro estados

| Estado | Significado exato | Exemplo |
|---|---|---|
| **implementada** | Módulo existente com código executável e teste identificado, ativado no motor compatível | Loja de munição e upgrades em FPS 3D |
| **configurada** | Campo de GAME_SPEC alterado; o motor já conhecia esse mecanismo | 4 ondas por fase no shooter 3D; sobreviver 60 s na arena 3D |
| **pendente** | Requisito ainda sem execução demonstrada | Árvore de habilidades completa no RPG 3D |
| **incompatível** | Parâmetro desejado não é interpretado pelo motor selecionado | 4 ondas no plataforma 3D |

Os estados são **evidências de contrato e suíte**, não substituem jogar todas as fases em WebGL real. A matriz é deliberadamente conservadora: não classifica um módulo inexistente como implementado apenas porque aparece em um GDD ou em um repositório de referência. O corpo completo do GDD **não é embutido** na auditoria; só linhas curtas e relevantes, com tamanho limitado.

## Regras de conflito e fonte

- O valor explícito mais recente prevalece sobre o antigo quando há conflito "sem loja" / "adicione loja" em GDD + comando.
- `Sem multiplayer`, `Sem crafting`, `Sem árvore de habilidades` são restrições de escopo, **não** tarefas pendentes.
- A seção `Fase N` delimita regras e evita contaminar a fase anterior.
- Uma linha `Sobreviver 60 segundos` seguida de `Objetivo: sobreviver...` mantém o temporizador de **60 segundos**; o texto de HUD não substitui a condição.
- Quando a origem não pode ser localizada com segurança, o relatório marca "Não localizada" em vez de inventar uma linha.

## Validação e riscos remanescentes

A execução da suíte CI completa deve ser conferida **no SHA do último commit**. Os testes de compatibilidade do manifesto são automatizados, mas alguns campos antigos do GAME_SPEC podem requerer migração. Não há garantia de IA criando módulos arbitrários offline. O verificador de projeto legado reconhece uma assinatura do runtime existente — não é substituto para um teste de jogabilidade real.

**Dependência anterior:** GF-001 ainda depende de o administrador escolher `Settings → Pages → Build and deployment → Source → GitHub Actions`. A rota antiga por branch foi observada promovendo commits sem aprovação; o fluxo verificado por si só não garante bloqueio exclusivo.

**Próxima etapa do plano:** GF-005 (continuidade/backup/GLB em browser real) e GF-011/GF-015 como possíveis extensões de mecânicas depois de proteger persistência e QA.
