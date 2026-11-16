# GF-003/004 — Design IR v1: interpretação de comandos leigos

Data: 16/11/2026. Estado: **VALIDADO no escopo Design IR v1**, CI [43892035587](https://github.com/jogoiarexx-blip/gameforge-ia/actions/runs/43892035587), commit `b80b8088` — **270/270 testes Node aprovados**, **16 variantes de exportação verificadas**, **17 cenários Chromium aprovados** e continuidade GF-005 concluída. A meta de benchmark de 100 pedidos e a construção de mecânicas arbitrárias seguem pendentes.

## Por que esta mudança existe

A auditoria `docs/AUDITORIA_ESTRUTURAL_GAMEFORGE_2026-11-16.md` identificou três exemplos que o GameForge confundia com arena 3D:
- "Crie um jogo tipo GTA com mundo aberto 3D, dirigir carros, polícia, negócios e missões".
- "Quero um jogo de máfia 3D com câmera por trás do personagem, carros, lojas e tiroteio".
- "quero criar jogo do padrinho com camera em terceira pessoa e cidade e negocios e 3d".

O classificador exigia o texto exato "3D em terceira pessoa" e ao menos três sistemas urbanos, mesmo quando a referência GTA e a câmera já tornavam a intenção clara. A versão nova amplia pistas de intenção sem confundir corrida, GoldenEye/FPS, shooter de nave, jogo de plataforma ou Godfather original Canvas 2D.

## Alterações publicadas

1. `js/urban-design.js` agora aceita referência a GTA, máfia, Godfather e padrinho com pistas complementares de câmera/cidade/veículos/polícia/negócios. Exclui solicitações realmente negativas ao contar sistemas por cláusula. Continua exigindo 3D e evita confundir com FPS explícito, espionagem ou corrida competitiva. **Não converte um protótipo urbano em campanha completa.**
2. `js/design-ir.js` (novo): `GameForgeDesignIR.inspect(spec,gdd,command)` constrói um registro pequeno e rastreável com mecânicas solicitadas, fonte (GDD ou comando, linha), status conservador (`suportado`, `parcial`, `pendente`) e restrições (`respeitada` ou `incompativel`). `enrich` integra as pendências ao relatório do interpretador, sem afirmar que a descrição executa código.
3. `js/parser.js` agora integra o IR ao `GAME_SPEC` inclusive nos protótipos urbanos. Corrige a dimensão inferida quando o usuário escreve **"sem 3D"**, não confundindo negação com pedido de 3D.
4. `js/generator.js` bloqueia geração quando uma proibição contradiz o motor. Ex.: "FPS 3D sem tiros" não resulta automaticamente em motor com disparos. Também produz `PLANO_REQUISITOS.md` para inspeção no ZIP.
5. `js/app.js` mostra requisitos individuais e restrições, com mensagem compreensível quando a criação violaria uma proibição.
6. `js/project-backup.js` aceita `PLANO_REQUISITOS.md` para não perder o documento ao salvar/reabrir projetos.
7. `tests/design-ir.test.js` inclui 16 comandos curtos, negativos, gêneros vizinhos, contratos e persistência do relatório.

## Exemplos e limites

| Exemplo escrito por leigo | Decisão atual | Observação |
|---|---|---|
| "GTA 3D com carros, polícia, negócios e missões" | `urban-action/3d` | Veículos dirigíveis e polícia são **pendentes**; negócio está **parcial** no URB-01 |
| "Máfia 3D câmera por trás, carros, lojas e tiroteio" | `urban-action/3d` | Só o bairro demonstrativo do URB-01 é jogável |
| "Jogo do padrinho com cidade/negócios/3D" | `urban-action/3d` | Cidade inteira e império econômico do GDD continuam pendentes |
| "Terror 3D em primeira pessoa, sem tiros" | `fps/3d` com proibição incompatível | Não exportar shooter armado como se fosse terror sem armas; stealth continua pendente |
| "RPG 3D com diálogo, inventário, quests e habilidades" | `rpg/3d` | Os quatro sistemas recebem pendências distintas, com origem |
| "Simulador de fazenda com plantação" | `arena/3d` com motor central ausente | Bloquear exportação enganosa e registrar o problema |
| "Aventura naval com barcos" | `arena/2d` com motor central ausente | Bloquear exportação enganosa e registrar o problema |
| "Donkey Kong Country 3, plataformas" | `platform/2d` | Sem copiar arte nem conteúdo protegido |
| "GoldenEye 077, espionagem" | `fps/3d` | Objetivos de alarme ainda não equivalem a missão totalmente implementada |

**Não é um LLM no navegador.** O interpretador é determinístico e orientado por expressões e contratos. Ainda não cria IA de inimigos, animações GLB, veículos, polícia, stealth, cidades procedurais, quests roteirizadas ou simulação agrícola/navegação completas por reconhecer as palavras. A vantagem nova é **mostrar de forma verificável** essas lacunas e impedir respostas enganosas.

**Limitações da v1 do IR:** não faz compreensão profunda de anáforas, todas as variantes do português, ironia, duplas negações ou escopo de vários parágrafos. Restrições são conservadoras: a proibição de tiros conflita com FPS, shooter, arena e URB-01, cuja lógica de combate é embutida; para gerar um jogo pacifista será necessário um perfil/motor com essas mecânicas desativadas e objetivos de fuga/coleta realmente programados.

## Critérios de aceite

- Pelo menos os três falsos negativos urbanos da auditoria passam, mais regressões de corrida, nave, GoldenEye, plataforma, RPG e Godfather Canvas 2D.
- "Sem tiros" não gera FPS armado e "sem 3D" não vira dimensão 3D.
- Mecânicas pedidas sem execução real são `pendentes`, e jogos de nicho não suportados (simulação agrícola e navegação naval) não são representados como arena final.
- Relatório `PLANO_REQUISITOS.md` acompanha backup e ZIP.
- `npm test`, `npm run verify:exports`, Chromium de exportação e continuidade GF-005 passam no SHA efetivo, não em commit antigo.
- Não usar páginas publicadas por branch como evidência suficiente: GF-001 permanece pendente de migração administrativa para GitHub Actions.

## Próxima etapa recomendada

**GF-004 v2 / GameDesignIR estruturado:** evoluir da matriz de palavras para ações, objetos, quantidades, condições e relações entre fases, com um `IR → Motor` verificável. Testes com pelo menos 100 pedidos infantis/casuais e GDDs completos de diferentes gêneros. Depois criar `UrbanLevelSpec` para gerar duas missões realmente diferentes no URB-02 em vez de clonar o único armazém.
