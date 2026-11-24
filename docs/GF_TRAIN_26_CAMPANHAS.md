# GF-TRAIN-26 — Atos e finais por decisões
24/11/2026. Referência conceitual: [Crise no Vale](https://github.com/luispauloalves500/crise-no-vale/blob/main/js/campaign-rules.mjs).

Opt-in em GDD Arena/FPS/RPG 3D sem loja, com 2–30 fases:
```
Atos de campanha: 1-2 | 3-4 | 5-6
Finais alternativos: sim
```
Intervalos contíguos e completos; títulos Ato 1, Ato 2 etc. Sem diretiva de atos, finais alternativos usam um ato. Histórico registra uma entrada por fase concluída; escolhas de NPC já existentes, com efeitos aid/threat, determinam Aliança, Conflito ou Equilíbrio. Epílogo inclui fases, pontuação, decisões e tempo. Não confundir textos de final com cutscenes cinematográficas. Checkpoint e save intermediário guardam histórico e fingerprint, rejeitam decisões inválidas, futuras ou inconsistentes; saves legados sem opção mantêm comportamento anterior. Novo jogo limpa histórico. Ainda não há grafo de fases não linear, cutscenes animadas ou créditos autorais. Testes Node de contrato e runtime adicionados; CI pendente.
