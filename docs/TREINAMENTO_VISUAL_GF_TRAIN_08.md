# GF-TRAIN-08 — Revisões visuais em português

Versão 0.26.0 — 17/11/2026.

## Problemas corrigidos

O interpretador ignorava uma retirada de estilo: GDD com pixel art seguido de “agora sem pixel art” continuava pixel art. “Não ativar sombras” ligava sombras, e verbos como “tira” e “desliga” eram ignorados. Requisitos de ray tracing continuavam pendentes mesmo após sua retirada. Voltar à qualidade automática podia deixar a qualidade explícita antiga em campos auxiliares.

O compilador gráfico agora processa menções na ordem GDD → comando, com decisões por campo e negação local. O renderizador recebe o perfil final; nenhuma imagem, textura ou modelo artístico novo é criado por esta mudança.

## Formas aceitas

- “Sem sombras e partículas” desliga ambos. Uma lista herda a negação.
- “Sem sombras e com partículas” desliga sombras e mantém partículas.
- “Não ativar sombras”, “tira as sombras”, “retire as sombras”, “desliga as partículas” e “n quero sombras” são formas de retirada.
- “Não desativar sombras” mantém sombras habilitadas.
- “Sem pixel art, mas depois quero pixel art” termina em pixel art.
- “Sem ray tracing e sem texturas 4K” revoga essas duas exigências. Se outra exigência avançada continuar ativa, a pendência permanece.
- “Qualidade automática” também atualiza `graphicsQuality` e `worldOptions.quality` para auto.

Pontuação e marcadores como “mas”, “depois”, “agora” e “porém” iniciam outra oração. Dentro dela, um comando positivo explícito (“com”, “quero”, “ativar”, “ligar”, “manter”) encerra a negação anterior. Isso é uma gramática determinística limitada; ironia, referências indiretas e todas as ambiguidades da linguagem não são resolvidas.

## Quando a pessoa só retira uma opção

Se o estilo retirado era o ativo, o app escolhe uma alternativa suportada e informa a escolha em avisos. A ordem inicial é ilustrado, cartoon, low poly, pixel e naturalista, respeitando exclusões acumuladas. Excluir um estilo que não estava ativo preserva o atual. Pedir explicitamente um estilo novamente remove sua exclusão anterior.

Qualidade usa auto como primeira alternativa; atmosfera usa dia; tema usa floresta. Se todas as alternativas de um campo forem proibidas, o app avisa o conflito em vez de prometer resolver uma configuração impossível. Opções manuais da interface continuam com prioridade sobre texto; sua origem fica registrada como “Opções”.

## Rastreabilidade

`INTERPRETACAO_VISUAL.json` acompanha exportação e backup, contendo origem por campo (GDD, comando ou opções), linha/trecho quando disponíveis e exclusões. `PERFIL_VISUAL.json` contém o resultado executável. O arquivo novo foi incluído explicitamente na lista permitida de backups.

## Validação

- 64 cenários novos: quatro revisões compostas aplicadas aos 16 modelos. São cenários de GDD + comando, não 64 frases diferentes nem avaliação independente.
- O total dos corpora de geração passa a 544 cenários; as 34 consultas de recuperação de referências permanecem separadas.
- A matriz verifica gênero, dimensão, perfil visual, requisitos avançados e preservação de fases, configuração das fases, dificuldade, simulação, economia de combate e missões urbanas.
- Testes específicos cobrem listas, negação local, reativação, fallback, exclusão total, qualidade automática, prioridade manual, rastreabilidade e backup.
- Dois cenários gráficos no Chromium agora partem de um perfil anterior e o corrigem por texto: navinha 2D e RPG 3D. Verificam estilo, qualidade, sombras, partículas e renderização.

A alteração vale ao gerar novamente um projeto. Jogos já exportados não recebem código novo automaticamente. Este treinamento aperfeiçoa as regras do GameForge; não modifica pesos de modelos externos nem implementa ray tracing, assets 4K ou fotorrealismo.
