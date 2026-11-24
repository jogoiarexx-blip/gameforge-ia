#!/usr/bin/env node
'use strict';
/* Avaliação GF-TRAIN-22. Corpus curado, não medida de acurácia de modelo generativo. */
const fs=require('node:fs'),path=require('node:path');
const Module=require('../js/voxel-training.js');
const corpus=JSON.parse(fs.readFileSync(path.join(__dirname,'../training/prismal-voxel-ptbr-v22.json'),'utf8'));
let labels=0,correct=0;const failed=[],byGenre={};
for(const sample of corpus.cases){
 const result=Module.inspect({genre:sample.genre,dimension:sample.dimension},'',sample.command);
 const actual=Object.fromEntries(result.items.map(x=>[x.id,x.status]));
 const stats=byGenre[sample.genre]??={cases:0,checks:0,correct:0};stats.cases++;
 for(const k of new Set([...Object.keys(actual),...Object.keys(sample.expect)])){
  stats.checks++;labels++;
  if(actual[k]===sample.expect[k]){stats.correct++;correct++;}
  else failed.push({sample:sample.id,key:k,expected:sample.expect[k]||null,actual:actual[k]||null});
 }
}
const report={version:22,cases:corpus.cases.length,labels,correct,
 percent:labels?+(100*correct/labels).toFixed(2):0,byGenre,failed,
 disclaimer:'Resultados apenas do corpus rotulado Prismal Voxel; não são medida de capacidade geral, treinamento de pesos, nem prova de jogo voxel exportado.'};
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else{
 console.log('GF-TRAIN-22:',correct+'/'+labels,'checagens em',corpus.cases.length,'briefs PT-BR.');
 for(const [genre,stats] of Object.entries(byGenre))console.log(genre,stats.correct+'/'+stats.checks);
 for(const e of failed)console.error('FAIL',e.sample,e.key,'esperado:',e.expected,'obtido:',e.actual);
 console.log(report.disclaimer);
}
if(failed.length||corpus.cases.length!==47||labels!==110)process.exitCode=1;
