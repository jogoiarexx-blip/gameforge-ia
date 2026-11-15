# Auditoria de reutilização dos jogos — 15/11/2026

## Escopo verificado
A conta conectada apresentou 99 repositórios na primeira listagem (filtro de proprietário). Foram inspecionadas as árvores de raiz de 11 projetos e os arquivos de código de quatro fontes específicas. Isso **não** constitui revisão integral dos 99 repositórios.

## Técnicas confirmadas no código
| Fonte | Arquivo examinado | Técnica | Destino no GameForge | Estado |
|---|---|---|---|---|
| Operacao-eden | src/core/GameLoop.js | Simulação fixa 1/60, até 5 substeps, pausa sem acumular | Loop do runtime 2D/3D | Referência catalogada; não portada |
| navinha-arcade | js/save-manager.js | Save com validação de campos, checkpoint sem entidades temporárias | Persistência por gênero | Referência catalogada; não portada |
| Neon-Sky-Force | js/performance-renderer.js | Cache de sprite por arma e efeitos dinâmicos separados | Cache de render 2D | Referência catalogada; não portada |
| Dragon-Fury | collision-system.js | AABB/círculo e despachante de categorias de colisão | Física e combate | Referência catalogada; não portada |

As quatro referências foram adicionadas a `js/repository-knowledge.js`, consumido pelo mecanismo de referências do Studio. A inclusão de referência **não** significa que a implementação de origem foi copiada para o motor.

## Outros projetos identificados para investigação
- `Snes-engine-Studio`: arquitetura de runtime e técnicas 2D com orçamento limitado
- `Driver-2-Three-js`: mundo aberto, carregamento setorial, veículos e colisões
- `goldeneye-077`: FPS, inimigos, assets e progressão
- `medalha-de-honra`: missões, controles e cenários
- `Asas-de-Brumaria`: dragões, combate, navegação e assets 3D
- `ARKHOS-coliseu-primordial`: regras e combate por cartas
- `Neon-Sky-Force` e `navinha-arcade`: ondas, chefes, otimização e progressão

## Licenciamento e segurança
Repositório publicamente visível não equivale a licença open source. Antes de copiar código ou assets, verificar `LICENSE`, autoria, dependências, marcas, personagens e arquivos de terceiros. Até esta etapa, apenas **conceitos e técnicas** foram descritos em referências, sem importação de código/arte. Não usar assets de franquias comerciais sem autorização.

## Prioridades de implementação
1. Adaptar passo fixo com teste de determinismo e benchmark de simulação, sem quebrar pausa nem motores existentes.
2. Extrair colisões geométricas puras e criar testes dinâmicos por gênero.
3. Cache de sprites com invalidação e medição de tempo de quadro.
4. Persistência versionada com validação de saves e testes de recuperação.
5. Evoluir biblioteca de mecânicas componíveis por gênero e validar exportação offline.

## Critérios de aceite
Cada port exige testes Node e CI, teste de integração de exportação, comparação de comportamento antes/depois, e, para gráficos/controle, QA em navegador e celular. Nenhum item é considerado integrado apenas por estar neste relatório.
