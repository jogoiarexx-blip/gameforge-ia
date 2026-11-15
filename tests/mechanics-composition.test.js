const {test}=require('node:test');
const assert=require('node:assert/strict');
const parser=require('../js/parser');
test('GDD combina mecanicas e separa as pendentes',()=>{
 const spec=parser.parseGdd('# Aventura\nRPG com combate, exploracao, puzzles, economia e inventario');
 assert.equal(spec.genre,'rpg');
 assert.deepEqual(spec.mechanics.requested.sort(),['combat','economy','exploration','inventory','puzzles']);
 assert.deepEqual(spec.mechanics.pending,['puzzles']);
 assert.match(spec.limitations.join(' '),/Puzzles/);
});
test('mecanicas nao suportadas nao sao anunciadas como prontas',()=>{
 const spec=parser.parseGdd('# Plataforma\nPlataforma com crafting, furtividade e inventario');
 assert.equal(spec.genre,'platform');
 assert.deepEqual(spec.mechanics.available,[]);
 assert.equal(spec.mechanics.pending.length,3);
});
test('na ausencia de pedido nao inventa mecanicas',()=>{
 const spec=parser.parseGdd('# Jogo simples','',{genre:'racing',dimension:'2d'});
 assert.deepEqual(spec.mechanics.requested,[]);
});
