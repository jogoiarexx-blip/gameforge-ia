#!/usr/bin/env node
'use strict';
/* GF-TRAIN-19 — avalia corpus rotulado local sem treinar pesos de IA.
 * Falha em caso de regressão e imprime contagem reprodutível.
 */
const fs=require('node:fs'),path=require('node:path');
const trainer=require('../js/three-training.js');
const corpus=JSON.parse(fs.readFileSync(path.join(__dirname,'../training/threejs-multigenero-ptbr-v19.json'),'utf8'));
let compared=0,correct=0;const failures=[];
const genres={};
for(const test of corpus.cases){
 const plan=trainer.inspect({genre:test.genre,dimension:test.dimension},test.gdd||'',test.command||'');
 const actual=Object.fromEntries(plan.items.map(x=>[x.id,x.status]));
 for(const id of new Set([...Object.keys(test.expect),...Object.keys(actual)])){
  compared++;
  genres[test.genre]??={cases:0,checks:0,correct:0};
  genres[test.genre].checks++;
  if(actual[id]===test.expect[id]){correct++;genres[test.genre].correct++;}
  else failures.push({id:test.id,genre:test.genre,field:id,expected:test.expect[id]??'(ausente)',actual:actual[id]??'(ausente)'});
 }
 genres[test.genre]??={cases:0,checks:0,correct:0};
 genres[test.genre].cases++;
}
const report={version:19,corpusCases:corpus.cases.length,compared,correct,
 accuracyPercent:compared?Number((100*correct/compared).toFixed(2)):0,perGenre:genres,failures,
 note:'Medição de casos rotulados curados, NÃO precisão geral de IA, mudança de pesos ou geração automática de recursos.'};
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else{
 console.log('GF-TRAIN-19:',correct+'/'+compared,'rótulos corretos em',corpus.cases.length,'exemplos PT-BR.');
 for(const [genre,stats] of Object.entries(genres))console.log(' '+genre+':',stats.correct+'/'+stats.checks,'('+stats.cases+' casos)');
 if(failures.length)for(const f of failures)console.error(' FAIL',f.id,f.genre,f.field,'esperado:',f.expected,'obtido:',f.actual);
 console.log(report.note);
}
if(failures.length||corpus.cases.length!==50||compared<55)process.exitCode=1;
