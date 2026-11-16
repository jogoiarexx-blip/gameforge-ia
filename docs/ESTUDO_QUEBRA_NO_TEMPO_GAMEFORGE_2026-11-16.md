# Estudo técnico — Quebra no Tempo v0.15.0 → GameForge

Data: 16/11/2026. Fonte: ZIP Quebra-no-tempo-v0.15.0.zip enviado nesta conversa.
Trabalho: estudar arquitetura e reimplementar práticas gerais em código original do GameForge. Não foram importados GLBs, texturas, sons, fontes nem trechos literais do jogo. O arquivo não apresenta licença própria explícita do código; as licenças de Three.js e fontes são separadas.

## 1. Sistemas observados no projeto enviado

| Sistema no Quebra no Tempo | Evidência examinada | Adaptação para GameForge |
|---|---|---|
| Controles de teclado/mouse/gamepad | src/input.js e tests/input.test.js | GF-018: módulo urbano com deadzone, bordas e desligamento seguro |
| Toque com dedos independentes | src/touch.js e tests/touch.test.js | GF-018: propriedade por pointerId, captura e cancelamento no urbano |
| Escrita temporária de saves | src/save.js, tests/save-v07.test.js | GF-025: confirmar escrita e preservar leitura de saves antigos |
| Física 3D com caixas/degraus | src/physics.js | Referência para futuros motores com salto e altura, não implementada aqui |
| Animações em GLB/Mixamo | src/actor-animations.js, tests/actor-animations.test.js | GF-015 pendente: AnimationMixer, rig, clips e fallback |
| Campanhas, chefes e checkpoints | src/missions/a1m1.js a a3m4.js e testes das missões | GF-010/GF-028 pendentes: LevelSpec e estados por fase |
| Aberturas e carregamento | src/cinema.js e src/loading.js | GF-006/GF-026 pendentes: briefing e progresso real |
| Cenário de desempenho | src/world.js e geradores de fases | GF-017: avaliar instancing e merge de geometria após benchmark |

## 2. Melhorias realmente programadas nesta integração

### GF-018 — Controle de gamepad e touch urbano

- js/urban-input.js: leitura independente de gamepad standard, analógicos com deadzone reescalada, D-pad, ações de borda, desconexão e controle contínuo de disparo.
- js/urban-runtime.js e js/urban-mission-runtime.js: analógico esquerdo move, direito mira, RT atira, A interage/inicia, X recarrega e Start/Menu pausa. No touch, cada botão tem seu próprio pointerId, cancelamento seguro e limpeza ao pausar, perder foco ou reiniciar.
- js/generator.js embute o módulo no jogo exportado, independente de API ou rede. index.html também o carrega.
- Limite: gamepad somente nos dois modos urbanos 3D. Os demais motores ainda não ganharam esse controle; ainda não há joystick touch contínuo nem remapeamento.

### GF-025 — Gravação verificada

- js/urban-save.js salva numa chave temporária, confere se o armazenamento aceitou a informação, promove para a chave principal e verifica a promoção.
- Os dois runtimes urbanos utilizam o contrato sem mudar schemas (URB-01 v1 e missões v2) nem as chaves existentes. A restauração continua passando por validação de dados.
- Falha de quota, armazenamento indisponível ou escrita rejeitada deixam saveEnabled falso; a interface não pode chamar a gravação de concluída.
- Limite: não é uma transação ACID de banco de dados nem substitui backup fora do dispositivo. Temporário não confirmado nunca vira save válido.

## 3. Critérios de aceite

- tests/urban-input.test.js: deadzone, D-pad, botões por borda, controle desconectado, exportação offline e touch multiponteiro nos dois runtimes.
- tests/urban-save.test.js: readback, quota, save antigo, schema inválido, progressão e recompensa única.
- Testar npm test, verify:exports e Chromium no SHA final. O resultado de CI anterior não valida novos commits.
- QA físico (Android, iOS, Bluetooth/USB) pendente; não afirmar compatibilidade de hardware testada.

## 4. Evolução futura

1. GF-015: pipeline GLTFLoader/AnimationMixer para jogador e inimigos, clips idle/walk/run/aim/fire/hit/death, fallback e validação de rig com assets de uso autorizado.
2. GF-018 v2: controles por gênero, remapeamento, joystick e área de mira touch com dedos independentes.
3. GF-010/GF-028: missões e checkpoints por LevelSpec derivados do GDD, chefes reais e diversidade verificável entre fases.
4. GF-017/GF-019: medir FPS, memória e draw calls, testar desempenho em aparelhos reais; melhorar instancing/mesclagem de cenários apenas com medidas.
5. GF-006/GF-026: tela de missão, briefings e carregamento por etapas mensuráveis, sem barra fictícia.

Estudar um jogo completo não significa que o GameForge já gera a mesma campanha. Só marcar sistemas como implementados quando os arquivos exportados possuírem regras jogáveis verificadas.
