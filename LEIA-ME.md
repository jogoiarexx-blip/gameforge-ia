# GameForge Studio v0.15 — Dois novos motores de Tower Defense

## Jardim — defesa por linhas

Modo `lane-defense`: cinco linhas e nove casas por linha, com **vigias que disparam**, **geradores de recursos**, **barreiras resistentes** e **unidades que congelam**. Os invasores têm classes normal, veloz, blindada e chefe; atacam as unidades da linha, podem ser interceptados por um dispositivo de emergência de uso único, e tiram vida da base quando passam. Os recursos da partida crescem por geradores, eliminações e bônus de ondas. Todas as ondas precisam terminar para concluir a fase. Controles pelo mouse, toque, teclas 1–4/N/U/X ou D-pad.

## Torres — defesa por blocos

Modo `block-td`: tabuleiro de **12×8** casas, estrada sinuosa protegida contra construções, colocação de blocos em células livres, **três níveis de altura**, sentinelas, congelantes, canhões de área e extratores de recursos. A altura aumenta dano e alcance; as torres sobem de nível e podem ser vendidas. Após cada onda, escolha **dano, alcance, economia ou reparo** (conforme o estado da base). Inimigos rápidos, blindados e chefes fazem parte das rodadas.

## Como usar

Abra o Studio, escolha o exemplo **Jardim · Defesa por linhas** ou **Torres · Blocos e altura**, depois clique em **Criar novo jogo** no modo **Sem IA**. Alternativamente, selecione os estilos no seletor 2D ou use um GDD que mencione `Plantas vs. Zumbis/defesa por linhas` ou `Block Tower TD/torres em blocos`.

O código é **gerado integralmente no navegador**, sem API, servidor ou CDN, e exportado como HTML único ou ZIP contendo `game.js` e GDD original. As fases e ondas podem ser editadas pelo painel 11; os sistemas implementados são específicos, não um gerador irrestrito de GDD.

Este projeto não inclui nem copia personagens, nomes ou assets das franquias citadas como referência de mecânicas.

---
# GameForge Studio v0.14 — Missões com regras reais

## Novo nesta versão

Para **aventura 3D e FPS 3D criados com o motor v0.14**, o painel **11 / Campanha** passa a oferecer:
- **Padrão:** derrotar todos os inimigos **e** recolher 3 cristais;
- **Eliminar:** derrotar todos os inimigos; cristais opcionais;
- **Coletar:** recolher 3 cristais; inimigos opcionais;
- **Sobreviver:** permanecer vivo durante 5 a 180 segundos; inimigos e cristais opcionais.

Em todos os modos, o jogador ainda precisa chegar ao **portal** depois que a condição for cumprida. Os estados são calculados no loop de jogo, usando `gameForgeWorldRules.missionReady()`. A telemetria informa `missionMode`, `missionReady` e `surviveRemaining`.

O **motor incremental sem IA** reconhece alguns comandos naturais, por exemplo:
- `Na fase 2, sobreviver por 45 segundos.`
- `Na fase 1, eliminar todos os inimigos.`
- `Na fase 3, coletar os cristais.`

Use **Planejar alteração** e **Aplicar melhoria**. Cada alteração é salva no `game.js`, pode ser desfeita e acompanha o backup. O relatório `CAMPANHA_EDITOR.md` registra os modos executáveis. A aplicação continua limitada a esses comandos reconhecidos e não cria roteiros/mecânicas inéditas em linguagem livre.

**Compatibilidade:** projetos 3D gerados antes da v0.14 não contêm a lógica `missionReady` serializada. O editor impede configurar missões que não teriam efeito nesses arquivos. Continue usando as configurações antigas ou gere um novo protótipo 3D com o motor atualizado. A atualização do Studio não modifica automaticamente jogos já exportados.

**Validação:** testes adicionados para as condições de vitória, planejamento de comandos, limites, geração de jogos exportados e preservação de configurações por fase. O QA no navegador continua necessário para confirmar comportamento visual e jogabilidade.

---

# GameForge Studio v0.13 — Editor de campanhas por fase

A versão 0.13 adiciona o painel **11 / Campanha**. Depois de criar um jogo, escolha qualquer uma das até 30 fases e altere título, quantidade de inimigos (onde o motor permite), chefe, ondas de defesa de torres, voltas de corridas 3D, ambiente 3D e o texto da missão no HUD.

As opções compatíveis são aplicadas ao próprio `GAME_SPEC.stageConfig` dentro do código exportável `game.js`. O ZIP inclui `CAMPANHA_EDITOR.md` com o resumo. Salvar uma fase cria um ponto de **Desfazer** (histórico de quatro versões) e acompanha o backup `.gameforge.json`. Recarregue a prévia após salvar, jogue e execute QA: texto da missão **não** programa objetivos inéditos.

Os limites de inimigos dependem do motor e o painel desativa opções que não funcionam naquele gênero. A campanha não é reescrita nem o GDD original perdido.

## Verificação técnica

Teste local de sintaxe dos módulos e das alterações de configuração. O HTML GitHub Pages permanece estático e sem dependência externa para motores procedurais. Os testes automatizados de Node cobrem persistência de fase, limites, exportação de código preservado e rejeição de projetos sem `GAME_SPEC`.

---

# GameForge Studio v0.12 — Jogos maiores em 2D e 3D

Escolha um exemplo no painel **Como será seu jogo?**, use **Sem IA** e clique em **Criar novo jogo**.

| Dimensão | Estilos disponíveis |
|---|---|
| 2D | Aventura/ação, nave, corrida, plataforma, RPG de ação, defesa de torres |
| 3D | Aventura em terceira pessoa, FPS, corrida, plataforma |

- Campanhas de até **30 fases** reconhecidas nos títulos do GDD; fases além do limite são informadas, com GDD original preservado.
- **RPG 2D:** mapa de 2400 × 1600, câmera, combate, arquétipos de inimigos, guardião, relíquias, XP, poções, inventário e melhorias.
- **Defesa de torres:** construção em grade, torres de raio/gelo, melhorias, ondas, recursos e proteção da base.
- **3D local:** personagens articulados e cenários low poly, temas floresta/deserto/neon/ruínas, luz, neblina, sombras no WebGL, colisões e objetivos. Carrega apenas a fase atual e libera os recursos ao trocar.
- **Compatibilidade:** WebGL2 oferece a melhor qualidade. Sem WebGL, o jogo mantém geometria/câmera/regras 3D e projeta triângulos por CPU, com iluminação simplificada, sem sombras e limite de 4.500 triângulos. O modo é identificado no rodapé. FPS real depende do dispositivo; o limite de desenho desse modo é 30 imagens/s.
- **Evolução:** novos jogos suportam adicionar fases até30, e ajustes compatíveis com o gênero. No 3D, ampliar mundo, mudar tema e qualidade. Pedidos sem efeito naquele motor permanecem pendentes.
- **Arquivos:** o ZIP 3D inclui engine-3d.js e a licença MIT completa; o HTML único inclui tudo. Não há CDN ou backend obrigatório para esses modelos. Backup preserva dependências e opções. O navegador compartilha arquivos iguais entre snapshots, evitando gravar cinco cópias do Three no histórico.

## Controles dos novos motores

RPG: WASD/setas, espaço/clique para atacar, I inventário, H poção, Esc pausa. Defesa: clique no terreno ou setas+espaço para construir/melhorar; botão para alternar raio/gelo; N inicia onda; U melhora torre. Aventura 3D: WASD/setas, espaço/clique para atacar. FPS: WASD/setas, Q/E ou arrastar para mirar, espaço/clique para atirar. Corrida 3D: W/↑ acelera, S/↓ freia, A/D vira, espaço dá turbo. Plataforma 3D: A/D ou ←/→ move, W/↑/espaço salta, Q/S controla profundidade. P/Esc pausa nos motores 3D. Controles touch acompanham os jogos.

## Limites e validação

O modo sem IA usa regras e assets **procedurais**. Estes modelos permitem jogar e evoluir protótipos; não implementam automaticamente cada requisito de um GDD extenso, personagens GLB detalhados, narrativa integral, física avançada ou multiplayer. Geração livre com IA continua no backend. A geração inicial com IA é 2D; os novos modelos 3D são criados pelo modo Sem IA. Projetos Three/Vite no backend continuam disponíveis separadamente.

`npm test` usa Node e os arquivos já incluídos; não exige iniciar navegador ou instalar Three. Para regenerar a cópia local do Three: `npm install` e `npm run vendor` (dependências de desenvolvimento fixadas).

Os testes cobrem parser/gêneros, campanhas, geração/exportação, melhoria/rollback, backup com dependências, regras de combate/torres, física/objetivos 3D, execução dos runtimes serializados, renderização por CPU e descarte de sombras. Navegador de QA desta entrega não ofereceu WebGL: avaliação visual feita no modo CPU. Roteiros automáticos no navegador apresentaram throttling de animação; não comprovam FPS em hardware real nem uma campanha completa de 30 fases.

---

# GameForge Studio v0.11 — Continuar projetos com backup

- **Baixar backup** salva um arquivo `.gameforge.json` com código, GDD completo, tarefas, notas, referências fixadas e até quatro versões para desfazer.
- **Abrir backup** valida o arquivo e mostra o projeto antes de pedir confirmação da troca. A prévia só executa o código após confirmar. Abra backups de fontes confiáveis.
- O ZIP jogável agora inclui `PROJETO.gameforge.json`: extraia esse arquivo e abra no Studio para continuar o desenvolvimento.
- Não são incluídos no backup os campos de configuração de token, modelo e endereço do backend. O código e o GDD são exportados como foram escritos; revise informações que você tenha colocado manualmente nesses arquivos.
- O salvamento automático avisa quando o navegador recusa armazenar o projeto ou quando um campo excede os limites. O último registro válido é preservado.
- Tarefas identificam o conteúdo integral de cada seção. Alterar o fim de um capítulo longo exige nova implementação e validação. Quebras de linha Windows (CRLF) têm referências corretas.
- Na primeira atualização de um roteiro v0.10, as tarefas voltam a pendente, porque a identificação antiga não comprovava que todo o capítulo permanecia igual. Exporte seu backup antes de atualizar registros importantes. Os arquivos do jogo são preservados.

Limites: GDD de 1 MB; arquivo individual de 2 MB; backup de 20 MB; quatro versões de histórico. Backups não incluem capturas de QA; relatórios textuais são preservados e a inspeção deve ser refeita após reabrir.

Validação v0.11: `npm test` executa os testes sem dependências externas. O roteiro `python tests/browser-project-continuity.py` requer Playwright e Chromium em um ambiente que permita iniciá-lo. Nesta entrega, os fluxos reais de navegador foram conferidos pela prévia controlada: criar, melhorar, QA, recarregar, baixar/abrir backup, cancelar/confirmar, melhorar novamente, desfazer, rejeitar backup inválido e GDD de 429 KB/300 tarefas com notas preservadas. A IA real e o backend Three.js não foram alterados ou testados nesta atualização.

---

# GameForge Studio v0.10.0 — plano de implementação por GDD

**Novo:** na seção “10 / Roteiro do GDD”, importe até 1 MB de Markdown, transforme capítulos em tarefas rastreáveis, selecione uma, prepare a instrução, melhore o jogo, execute QA e valide manualmente. O ZIP inclui o plano e os estados em Markdown/JSON. [Leia as instruções detalhadas](ROTEIRO_GDD_V010.md).

# GameForge Studio v0.9.1 — GDD grande

**Correção:** importa Markdown de até 1 MB, inclusive GDD de 300 KB. O texto original não é cortado e vai integral no ZIP. O analisador percorre todo o documento; o modo sem IA aplica somente regras que já conhece. Com IA e backend atualizado, um GDD longo é processado por blocos antes da criação do jogo (cada bloco usa uma chamada ao modelo, com custos e duração adicionais). Não publique chaves de IA no GitHub Pages.

# GameForge Studio v0.9 — GitHub Pages

Publique todos os arquivos desta pasta na raiz do repositório. O navegador pode gerar jogos 2D e realizar modificações incrementais **pré-programadas**, com plano e botão **Desfazer**. Use os dois botões distintos **Criar novo jogo** e **Aplicar melhoria**. Para alterações livres por GPT/Claude/Gemini e criação de protótipo 3D Three.js, configure uma URL HTTPS para o **backend completo** em um computador/servidor isolado. O GitHub Pages sozinho não executa esses serviços.

O modo sem IA não implementa novas mecânicas arbitrárias nem cria personagens 3D detalhados por texto.

# GameForge Studio Web v0.8.0 — GDD de navinha

**Novo:** gere navinha espacial, neon ou jogo de dragão a partir de um GDD Markdown. Três botões de exemplo carregam documentos editáveis. O gerador sem IA já produz nave desenhada, combate, ondas, chefes e progressão com power-ups e loja entre fases. Código 100% Canvas 2D independente de bibliotecas.

**Banco de referências:** 29 padrões de 12 projetos, inclusive `navinha-arcade`, `Neon-Sky-Force` e `Dragon-Fury`. As técnicas estão resumidas e verificadas por arquivo; não são uma rede neural treinada com os jogos nem contêm os seus sprites e músicas.

**Teste:** abrir `index.html` e clicar em um botão de exemplo, gerar, jogar, verificar QA, exportar ZIP. Para IA precisa conectar o backend Python; GitHub Pages só hospeda a interface estática.

---

# GameForge Studio Web v0.7.0 (GitHub Pages)

**Novo laboratório 07:** a interface agora pode controlar a telemetria temporal de jogos Three.js quando estiver conectada ao **backend v0.7.0**. A página estática **não** executa o Chromium/Playwright nem instala código nos jogos sozinha; esses recursos exigem backend local com dependências instaladas. Para jogos sem backend, o gerador 2D por GDD e a biblioteca de referências continuam disponíveis.

**Instalação no Windows:** baixe o ZIP completo, instale `requirements-engineer.txt`, execute `python -m playwright install chromium` e abra `start.bat`; depois conecte o projeto e use **Preparar telemetria** / **Testar animações**. É necessário instrumentar explicitamente o ator e o loop, e um novo projeto do template já possui a ponte básica.

---

# GameForge Studio Web v0.6 (GitHub Pages)

Extraia o ZIP e publique todos os arquivos na raiz do repositório GitHub Pages, inclusive `js/repository-knowledge.js`. Pode também abrir `index.html` no navegador local.

## Novo: laboratório de engenharia (backend opcional)

A seção **06 / MOTOR PRÓPRIO DE CÓDIGO** pode analisar jogos existentes, executá-los no Chromium e criar propostas de correção com OpenCode **quando você conectar o backend completo v0.6**. Neste ZIP para GitHub Pages, o modo sem IA continua a funcionar no navegador, mas o OpenCode, Tree-sitter Python e Playwright não estão embutidos no site estático. Use o ZIP completo e `ENGENHEIRO_V06.md` para configurar essas ferramentas.

## Biblioteca de projetos

No painel esquerdo, importe seu GDD .md e consulte a seção **Biblioteca dos seus jogos**. São 21 técnicas curadas de 9 projetos públicos de jogos. As referências são pesquisadas offline, com links que abrem o código original no GitHub quando há internet. Marque **Fixar** para priorizar uma técnica. O ZIP do jogo inclui `RELATORIO_REFERENCIAS.md`.

**Sem IA:** a biblioteca **recomenda** técnicas, mas o gerador continua limitado a protótipos 2D do motor local. Não instala automaticamente sistemas de jogos 3D.

**Com IA:** configure um backend Python separado e suas chaves de API no backend, nunca no navegador ou GitHub Pages. A IA recebe as referências priorizadas. A opção para consultar código atual do GitHub executa a leitura no servidor (arquivos públicos e curtos; até 2 por tarefa) e envia exemplos ao provedor de IA.

Não compartilhe token do servidor em repositórios públicos nem habilite APIs em backend aberto sem autenticação forte, isolamento e limitação de custos.
