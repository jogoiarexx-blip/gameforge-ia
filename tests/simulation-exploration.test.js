'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Parser=require('../js/parser.js'),Generator=require('../js/generator.js');
const Capabilities=require('../js/game-capabilities.js');
const cases=require('../training/exploration-ptbr-v11.json').cases;
test('GF-TRAIN-11: 18 pedidos de exploração com negativas, reativação e modos antigos',()=>{
 assert.equal(cases.length,18);const failures=[];
 for(const row of cases){
  const spec=Parser.parseGdd('',row.instruction);
  if(spec.genre!=='simulation'||spec.simulation?.domain!==row.domain)failures.push(row.instruction+' domínio '+spec.genre+'/'+spec.simulation?.domain);
  const enabled=spec.simulation?.exploration?.enabled===true;
  if(enabled!==row.enabled)failures.push(row.instruction+' exploração '+enabled);
  if(row.enabled){
   if(spec.implementation.pending.some(x=>x.id==='simulation-walk'))failures.push(row.instruction+' pendência incorreta');
   if(!spec.implementation.audit.items.some(x=>x.id==='simulation-walk'&&x.status==='implementada'))failures.push(row.instruction+' faltou contrato implementado');
  }
 }
 assert.deepEqual(failures,[]);
});
test('GF-TRAIN-11: exploração é opcional e não altera economia, cuidado ou automação',()=>{
 const old=Parser.parseGdd('','Quero cuidar de aquário, dois tanques. Produção automática.');
 const newer=Parser.parseGdd('','Quero cuidar de aquário, dois tanques. Produção automática. Personagem andando pela loja.');
 assert.equal(old.simulation.exploration,undefined);
 assert.equal(newer.simulation.exploration.enabled,true);
 for(const field of ['slots','cost','price','seconds','target','domain'])assert.equal(newer.simulation[field],old.simulation[field]);
 assert.deepEqual(newer.simulation.automation,old.simulation.automation);
 assert.deepEqual(newer.simulation.aquariumCare,old.simulation.aquariumCare);
});
test('GF-TRAIN-11: contrato limita a exploração ao motor de simulação 2D',()=>{
 const aquarium=Parser.parseGdd('','Cuidar de aquário. Personagem andando entre tanques.');
 assert.equal(Capabilities.capability('simulation-walk',aquarium).allowed,true);
 assert.equal(Capabilities.capability('simulation-walk',aquarium).implemented,true);
 assert.equal(Capabilities.capability('simulation-walk',{genre:'fps',dimension:'3d'}).allowed,false);
});
test('GF-TRAIN-11: gera jogo offline com caminhada e relatório consistente',()=>{
 const spec=Parser.parseGdd('','Cuidar de aquário. Personagem andando entre tanques. Dois tanques.');
 const files=Generator.generate(spec,'');
 assert.match(files['game.js'],/const exploring=c.exploration\?\.enabled===true/);
 assert.match(files['game.js'],/Aproxime-se da estação/);
 assert.match(files['RELATORIO_GERACAO.md'],/Ciclo econômico/);
 new (require('node:vm').Script)(files['game.js']);
});
