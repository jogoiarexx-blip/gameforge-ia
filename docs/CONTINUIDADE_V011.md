# Continuidade do projeto — v0.11

Objetivo: fechar, reabrir e continuar um jogo preservando GDD integral, código, tarefas e quatro versões para desfazer.

Decisão de implementação: manter HTML/JS estático, sem dependências, com arquivo portátil `.gameforge.json`. O mesmo arquivo acompanha o ZIP do jogo. Uma restauração é preparada e validada antes de substituir o projeto; o usuário confirma a troca. Tokens e endereço do backend não integram o backup. O arquivo contém código que só executa na prévia isolada após a confirmação.

Abordagens: IndexedDB ajudaria o armazenamento local, mas não transfere projetos entre computadores; importar ZIPs antigos exigiria outro leitor e não recuperaria o histórico ausente. O backup JSON cobre primeiro a continuidade completa, preservando o ZIP jogável.

Plano:
- [x] Testes reproduzem deslocamento CRLF e validação indevida após mudança além de 280 caracteres; corrigir referências e identidade integral das seções. Registros antigos sem identidade completa voltam a pendente para evitar aprovação incorreta.
- [x] Módulo `js/project-backup.js`: validar versão, arquivos permitidos, tamanhos e histórico; serializar sem credenciais; restaurar a configuração GAME_SPEC; retornar falha explícita se o navegador recusar salvar.
- [x] Integrar baixar/abrir backup, confirmação, ZIP e salvamento automático com debounce. Limpar QA ao restaurar, sem declarar funcionalidades validadas automaticamente.
- [x] Testar GDD >300 KB, migração do armazenamento existente, duas melhorias/desfazer, restauração em outro navegador, dados inválidos, quota excedida, telas desktop/mobile. Executar regressões existentes e publicar em main pelo GitHub.

Limites: GDD 1 MB; arquivo individual 2 MB; backup total 20 MB; até quatro versões no histórico. Não executar o código durante a validação do arquivo. Validação de tarefa continua manual após aplicação e QA.

## Evidências e revisão

- 16 grupos de testes Node aprovados (11 casos novos e cinco suítes existentes).
- Correções da revisão: migração de arquivos extras em snapshots antigos; impedir salvamento de dados que não poderiam ser reabertos; preservar registro após falha de restauração; bloquear troca de projeto durante revisão visual assíncrona; IDs iguais após normalização CRLF no textarea.
- QA real na prévia controlada: criação de nave; duas melhorias sucessivas; QA automático; backup download/upload; cancelar e confirmar; recarregar; desfazer após reabertura; backup inválido preservando projeto; GDD de 429.104 bytes e 300 tarefas com seleção, status e nota da última seção preservados; instrução acima do limite recusada sem substituir último salvamento.
- O roteiro Playwright local não pôde ser iniciado neste ambiente (Chromium bloqueado ao abrir socket). A mesma interação foi verificada no navegador controlado; o script fica disponível para execução local. Viewport mobile não foi executado nesta sessão.
- IA real e backend não fazem parte da verificação desta mudança.
