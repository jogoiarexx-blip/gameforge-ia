# GameForge v0.12 — motores 2D/3D e campanhas maiores

Objetivo autorizado: criar jogos maiores, mais complexos, com gráficos melhores e mais estilos 2D e 3D, preservando melhorias incrementais, QA e backup.

Decisão: manter o Studio estático no GitHub Pages. Incluir Three.js r180 com licença MIT nos jogos 3D exportados, sem CDN ou backend obrigatório. Novas regras e renderizadores em módulos separados. Continuar usando modelos determinísticos honestamente descritos; IA livre permanece opcional no backend.

Escopo: seis gêneros 2D (aventura/ação, nave, corrida, plataforma, RPG e defesa de torres); quatro variações 3D (aventura, FPS, corrida e plataforma). Seletores explícitos e detecção pelo GDD. Campanhas até 30 fases, carregando uma fase 3D por vez. RPG com câmera/mundo maior e evolução; defesa de torres com rotas/ondas/construção; 3D com colisão, objetivos, combate ou corrida/salto, luz, sombras e limites de renderização. Não afirmar criação automática de assets GLB detalhados, narrativa integral ou mecânicas fora das regras.

Plano:
- [x] Reproduzir por testes: estilos ausentes, ausência de dimensão 3D, limite de dez fases.
- [x] Parser de dimensão/gênero, seletores e exemplos. Campanha até30 e diagnóstico explícito de limites.
- [x] Motores independentes 2D/3D com regras testáveis, gráficos procedurais, limites e transição/derrota/vitória.
- [x] Exportação offline: engine Three.js local, prévia isolada sem rede, HTML único, ZIP editável e backup com dependência 3D.
- [x] Ampliar melhoria incremental (campanha/tema/tamanho do mundo) e QA para os novos controles.
- [x] Regressões Node, testes reais dos novos estilos no navegador, revisão e publicação no mesmo GitHub Pages.

Riscos a verificar: limite WebGL2 e falha de inicialização; capturas WebGL; câmera/colisão e rotas alcançáveis; recomeçar/desfazer não perder fases; seleção manual não confundir modo IA; dependência 3D não ficar ausente no backup/HTML/ZIP; novas regras não afetarem jogos existentes.

## Verificação desta entrega

- 55 casos/grupos Node aprovados; inclui cinco suítes legadas, parser/gêneros/campanhas, backup/dependências/armazenamento compartilhado, exportação offline, ações compatíveis, regras e execução serializada dos quatro motores3D e dois novos2D.
- Revisão de código corrigida: opções explícitas enviadas na instrução de IA; licença MIT completa no HTML; descarte das sombras; recarga de emergência no antigo motor arena; ações sem efeito ficam pendentes; mundo3D de plataforma aumenta a rota; botões da defesa se ajustam à largura.
- CUA: gerar e abrir os seis novos exemplos; RPG com inventário; defesa com construção/melhoria e início da onda; cenas e controles/objetivos de aventura/FPS/corrida/plataforma3D; melhoria de plataforma (fase+mundo), QA sem alertas nessa execução, desfazer e recarregar com dependência preservada; restauração visual de backupFPS3D.
- ZIP real exportado: 12 arquivos, CRCs válidos, engine3d local de702486 bytes com licença, backup interno igual à dependência exportada. HTML real de747003 bytes: motor, jogo e licença embutidos, nenhum script externo; aberto em aba separada, com cena3D renderizada e pausa funcional.
- O navegador desta sessão não disponibilizou WebGL2. As cenas foram verificadas no renderizadorCPU. O ambiente apresentou throttling de animação em alguns roteiros de850ms (1quadro/amostra); esses resultados não medem FPS no computador do usuário. A renderizaçãoWebGL continua pendente de verificação em hardware compatível. Não foi completada uma campanha de30fases nem testada IA com chave real nesta sessão.

## Decisões preservadas

Os novos jogos usam assets/regras procedurais e são protótipos editáveis. O aumento de tamanho não implica interpretação integral de requisitos livres. Jogos já gerados permanecem com seu código preservado; criar um novo jogo utiliza os motores desta versão. A bibliotecaThree é empacotada localmente e o histórico do navegador reutiliza arquivos iguais para reduzir o tamanho dos snapshots.
