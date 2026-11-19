# GF-TRAIN-18 — Missões em paralelo, dois consumíveis e migração conservadora de save

**Implementação executável:** simulação 2D de aquário, fazenda e loja. `story.version=6` é um contrato novo, opcional, ativado por "missões paralelas", "dependências entre missões", "desbloquear após etapas N" ou recompensa de aceleradores. Versões v1–v5 permanecem disponíveis e não são convertidas automaticamente.

## Grafo de dependências e jogabilidade real

Cada campanha possui **3 ou 4 missões**, com **um ou dois objetivos independentes por missão** (1–5 ações reais por objetivo). Cada missão `i` possui `requiresMissions` com referências inteiras para **missões anteriores a i**; o validador recusa pré-requisitos repetidos, ciclos, autorreferência e referências futuras. Isso permite uma bifurcação real, por exemplo `m1 → (m2 e m3) → m4`, em que m2/m3 são desbloqueadas ao concluir m1 e m4 exige ambas.

O jogador pode escolher a **linha disponível falando com o NPC associado** (missões ímpares NPC1, pares NPC2). Cada linha mantém seu próprio progresso, tempo de jogo, contador e flag de conclusão. Ao trocar de NPC, **somente a missão ativa recebe eventos econômicos**; as demais esperam. O HUD indica a tarefa ativa e os objetivos bloqueados. Não há navegação automática entre salas; os mesmos dois NPCs são reutilizados em uma sala. Missões podem requerer estoque atual e tempo de jogo ativo. Poupança da sessão e pausa permanecem válidas.

## Itens consumíveis diferentes

O prêmio de missão `itemReward: {kind,count}` tem `kind` `kit` ou `boost` e `count` de 0 a 3. Uma missão pode entregar **um tipo de item** por conclusão, além das moedas.

- **Kit:** ao comprar peixe, plantar ou repor uma prateleira, consome automaticamente um kit disponível e **não cobra moedas** pela ação.
- **Acelerador:** ao realizar uma ação válida de alimentar/regar/atender, consome automaticamente um acelerador e **adianta a idade da produção em 50% do tempo de crescimento** (limitado a 100%). Consumo é real; o estado/idade do item muda imediatamente.
- O HUD informa kits e aceleradores disponíveis, e o salvamento conserva `items`, `itemsUsed`, `story.itemsEarned` com verificação da soma de prêmios por missão. Não são inventários de equipamento, mercado de itens ou modelos gráficos GLB.

## Editor visual no GameForge Studio

No passo 2 → **Editor visual de missões**:
1. Escolha tipo de jogo e 3 ou 4 missões.
2. Marque **Missões paralelas com pré-requisitos (v6)**.
3. Em cada missão, escolha eventos, quantidades, condições e as missões anteriores obrigatórias para desbloquear. A interface evita referências ao próprio nível ou a níveis futuros.
4. Escolha prêmios em **kits OU aceleradores** (0–3); não podem ter os dois tipos na mesma missão.
5. Clique em **Conferir objetivos → Adicionar ao meu pedido → Criar jogo**. A prévia gera `game.js` exportável e offline. Todos os dados são validados pelo mesmo contrato do jogo.

### Editar um jogo já gerado

**Carregar missões do jogo criado** lê configurações de projetos locais v4/v5/v6. **Salvar no game.js existente** troca apenas o JSON literal `GAME_SPEC` dentro do `game.js`, preservando demais scripts, HTML, CSS, imagens e GDD. A alteração v6 só é habilitada quando o projeto já foi exportado com motor v6. Não há upgrade implícito de código v4/v5 para v6.

**Migração de save (opt-in):** marque *Tentar migrar save compatível* antes de aplicar uma alteração. O editor guarda a **configuração anterior exata** em `simulation.saveMigration.previous`. Ao abrir o novo jogo **na mesma origem do navegador**, se não houver save atual, o runtime lê e valida **o save antigo com o contrato antigo**, verifica que todo objetivo de missão já iniciada/concluída preservou seus dados de evento, contagem, pré-requisitos e recompensa, valida o estado com a nova configuração e só então cria o novo save. O antigo **não é apagado**. Pode editar missões **futuras, não iniciadas**, enquanto preserva missões já realizadas. Dados inválidos, saves adulterados, mudança econômica, mudança de versão v4↔v5↔v6, mudanças em missão iniciada ou migração encadeada são recusados. **Não há sincronização entre dispositivos**, conversão entre endereços ou migração irrestrita.

Após uma migração solicitada por edição de missão, o projeto contém um vínculo de migração. A interface recusa solicitar uma **segunda migração encadeada**. Faça backup e publique/use o jogo e o novo save antes de uma nova edição. Um save migrado válida e regrava a nova chave de assinatura; se a migração não for segura, o jogador deve iniciar jogo novo. A confirmação do editor é obrigatória.

## Testes

- `training/simulation-quest-graph-ptbr-v18.json`: **30 comandos portugueses rotulados** para regressão determinística, **não retreinamento de pesos**.
- `tests/simulation-quest-graph.test.js`: corpus, validação anti-ciclos, NPCs, bloqueios, progressão isolada por linha, recompensas monetárias/idempotência, consumo, save adulterado, edição do `game.js`, migração permitida/recusada em v5 e v6.
- `tests/browser-export-matrix.py`: teste real móvel do grafo, save e acelerador, e editor de projeto v6 com opção explícita de migração; testes de versões antigas preservados.

## Limitações

Um cenário 2D, dois NPCs, até quatro missões por projeto e até dois objetivos por missão; sem roteiro gerado por IA, cutscenes, mais de quatro missões, grafo com ligações futuras, sistemas de missões 3D, multijogador, sincronização em nuvem ou migração de saves arbitrários. Embora o validador rejeite adulterações estruturais, o código local não oferece proteção criptográfica contra um usuário que edite seu próprio browser.

**Possível GF-TRAIN-19:** ampliar missões por editor, introduzir inventário visual real para itens, escolher missão ativa por menu e migrador de versões de save com pré-visualização controlada. 
