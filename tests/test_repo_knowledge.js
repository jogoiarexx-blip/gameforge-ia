const assert=require('node:assert/strict');
const knowledge=require('../js/repository-knowledge.js');
assert.equal(knowledge.entries.length,29);
for(const [query,expected] of [
 ['personagem andando de ré camera e WASD','character-facing'],
 ['o caminhão fica cortado no notebook na oficina','workshop-framing'],
 ['comprei buzinas e a loja não aparece','horn-shop'],
 ['LOD vegetação ilha muito pesada','visibility-budget'],
 ['animação T pose bones GLB','bone-aliases'],
 ['pé atravessando chão animação','goblin-foot-plant'],
 ['criar jogo de navinha com armas power up','shmup-weapon-levels'],
 ['jogo shoot em up vertical com fases ondas','shmup-wave-config'],
 ['o chefe recebe dois tiros e paga recompensa duplicada','dragon-boss-state'],
 ['otimizar explosoes e fps do shmup','dragon-performance-budget'],
]){
 const refs=knowledge.rank(query,5);
 assert(refs.some(r=>r.id===expected),query+' -> '+refs.map(r=>r.id).join(','));
 console.log('OK:',query,'->',refs.map(r=>r.id).join(','));
}
const fixed=knowledge.rank('jogo',3,['horn-shop','not-a-pattern','horn-shop']);
assert.equal(fixed[0].id,'horn-shop');
assert.equal(new Set(fixed.map(r=>r.id)).size,fixed.length);
assert(knowledge.report(fixed).includes('https://github.com/jogoiarexx-blip/'));
console.log('OK: catálogo local, score, filtro de IDs, referências verificáveis.');
