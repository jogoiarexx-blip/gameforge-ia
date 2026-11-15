const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/runtime-template.js'),'utf8');
test('motor base continua sintaticamente valido e exportavel',()=>{
  assert.equal(typeof require('../js/runtime-template.js'),'function');
});
test('plataforma verifica pisao usando velocidade anterior ao pouso',()=>{
  assert.match(source,/const wasFalling=player\.vy>70/);
  assert.match(source,/if\(wasFalling&&oldBottom<=e\.y-e\.r\*\.15/);
});
test('plataforma limita inimigos a plataformas distintas',()=>{
  assert.match(source,/const count=Math\.min\(22,/);
  assert.match(source,/const p=platforms\[2\+i\]/);
});
test('checkpoint nao compartilha plataforma com espinhos',()=>{
  assert.match(source,/if\(!p\.checkpoint\)platformTraps\.push/);
});
test('particulas de impacto possuem vida limitada',()=>{
  assert.match(source,/platformSparks=platformSparks\.filter\(fx=>fx\.life>0\)/);
});
