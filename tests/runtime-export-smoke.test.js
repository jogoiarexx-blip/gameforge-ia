'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
globalThis.gameForgeBoot=require('../js/runtime-template.js');
const generator=require('../js/generator.js');
for(const genre of ['platform','racing','arena']){
  test('exportacao offline valida para '+genre,()=>{
    const spec={title:'Teste '+genre,genre,dimension:'2d',stages:['Fase 1'],features:{timer:false},detected:[],limitations:[],graphicsQuality:'medium',visualStyle:'neon'};
    const files=generator.generate(spec,'# Teste');
    assert.match(files['index.html'],/game\.js/);
    assert.match(files['game.js'],/graphicsQuality/);
    assert.match(files['game.js'],/visualStyle/);
    assert.doesNotThrow(()=>new vm.Script(files['game.js'],{filename:genre+'-game.js'}));
    assert.match(files['RELATORIO_GERACAO.md'],/Relat.rio da gera..o/i);
  });
}
