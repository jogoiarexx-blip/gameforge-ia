# GF-VOXEL-04 — Sobrevivência 3D

Novo modo opcional no Criador Voxel: selecione Coleta e fabricação e marque Sobrevivência. Floresta permanece opcional. Criativo, coleta e floresta antigos preservados com chaves de save independentes.

- Ciclo de 120 s ativos, 80 s dia e 40 s noite, mudança de céu e iluminação por cor.
- Vida e fome de 0 a 100, gasto maior andando, regeneração com fome acima de 80, dano por inanição.
- Três alimentos iniciais; C ou botão Comer consome um alimento, restaura até 35 fome e 8 vida.
- Até quatro ovelhas passivas e três inimigos noturnos simples com movimento por busca de terreno válido. Inimigos atacam por proximidade e desaparecem no amanhecer. Ovelhas podem fornecer dois alimentos. E ataca alvo na mira em até três unidades, bloqueado por terreno; picareta aumenta dano, intervalo de ataque de 0,5 s. Criaturas têm representação por caixas, não modelos animados.
- Renascimento na posição inicial segura, preservando mundo, inventário e tempo. Save separado inclui horário, vida, fome, criaturas e contadores. Sem sincronização entre dispositivos.
- Não inclui dano de queda, reprodução, modelos animados, P2P, biomas adicionais ou iluminação com sombras dinâmicas.

## Testes
Node: regras de fome, alimentação, combate, validação e saves. Chromium: ZIP exportado, alimentação real, pausa, restauração e transição noturna a partir de fixture de save próxima do anoitecer. Testes anteriores permanecem. Merge apenas após aprovação da CI.

## Próximo incremento
Melhorar criaturas, drops e ferramentas visíveis; depois navegação de objetivos, baús e mundo expandido com streaming.
