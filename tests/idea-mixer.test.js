const {test}=require('node:test');
const assert=require('node:assert/strict');
const mixer=require('../js/idea-mixer');
test('mistura RPG com exploração, enigmas e combate e informa pendências',()=>{
 const result=mixer.mix({genre:'rpg',dimension:'2d',ideas:['rpg-exploration','adventure-puzzle','arcade-combat']});
 assert(result.available.includes('inventory'));
 assert(result.available.includes('combat'));
 assert(result.pending.includes('puzzles'));
 assert.equal(result.status,'prototipo-parcial');
});
test('rejeita motor incompatível e ideia desconhecida',()=>{
 assert.throws(()=>mixer.mix({genre:'fps',dimension:'2d'}),/incompatível/);
 assert.throws(()=>mixer.mix({ideas:['nao-existe']}),/desconhecida/);
});
test('remove ideias repetidas e não altera catálogo',()=>{
 const result=mixer.mix({ideas:['arcade-combat','arcade-combat']});
 assert.deepEqual(result.ideas,['arcade-combat']);
});
