# GF-VOXEL-08 — Equipamentos avançados

Opção nova no Criador Voxel: modo Coleta e fabricação + Equipamentos avançados. Habilita floresta e ferramentas duráveis. Para armadura reduzir dano, marque também Sobrevivência. Saves anteriores permanecem separados.

| Equipamento | Receita na bancada | Durabilidade | Benefício |
|---|---|---:|---|
| Machado de cobre | 2 lingotes de cobre + madeira | 80 | madeira/folhas em 0,35 s |
| Pá de cobre | 1 lingote de cobre + madeira | 80 | terra/grama em 0,22 s |
| Espada de ferro | 2 lingotes de ferro + madeira | 160 | dano 4 |
| Armadura de ferro | 4 lingotes de ferro | sem desgaste nesta etapa | reduz dano de criaturas em 40% |

F alterna equipamentos; R repara ferramenta equipada na bancada. H equipa/guarda armadura. Mão, picaretas, machado, pá e espada têm modelos low-poly. Equipamentos duráveis e armadura não podem ser transferidos para baús nesta versão.

## Mineração
E inicia uma ação temporizada; mantenha E pressionado para continuar. Barra mostra progresso. Trocar alvo/ferramenta reinicia progresso, pausa cancela ação. Ações concluídas aplicam as regras de inventário/colisão e desgaste. Minérios exigem picaretas adequadas.

## Materiais e forno
Cobre e carvão aparecem deterministicamente na faixa de 4–14 blocos sob a superfície. Carvão pode ser extraído com madeira/pedra/ferro; cobre exige pedra/ferro. Forno reserva insumos + um combustível (prioriza carvão, senão madeira), um trabalho por forno, até 32 trabalhos no mundo.
- 2 terras => 2 tijolos: 4 s ativos.
- 1 minério de ferro => 1 lingote: 6 s ativos.
- 1 minério de cobre => 1 lingote: 5 s ativos.
J retira produto do forno mais próximo, quando terminado e com espaço na mochila. Forno em processamento ou com saída pendente não pode ser quebrado. O save inclui trabalhos, tempo restante, combustível consumido e estado da armadura. Não há produção offline ou fila automática.

## Testes e limites
Teste Node: mineração, requisitos, minério determinístico, reserva/consumo de combustível, saída única, restauração de forno e defesa. Chromium: jogo exportado, mineração temporizada, bancada/forno, tijolos processados após reload. Verificação isolada confirmou fabricação, coleta sem duplicação e save restaurado. CI completa pendente. Armadura não possui visual próprio em primeira pessoa nem durabilidade nesta etapa; defesa só contra criaturas, não inanição. Minérios são blocos de cor, sem texturas externas. Não há multijogador nem fusão de saves.
