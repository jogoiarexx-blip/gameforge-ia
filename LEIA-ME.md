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
