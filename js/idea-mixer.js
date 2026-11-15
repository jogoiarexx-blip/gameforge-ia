/* Planejador de misturas: não altera runtimes nem promete recursos não implementados. */
(function(root){
'use strict';
const parser=typeof require==='function'?require('./parser'):root.GameForgeParser;
const catalog=Object.freeze({
  'rpg-exploration':{name:'Exploração de RPG',mechanics:['exploration','inventory','progression']},
  'survival-crafting':{name:'Sobrevivência e fabricação',mechanics:['exploration','crafting','economy']},
  'adventure-puzzle':{name:'Aventura de enigmas',mechanics:['exploration','puzzles','inventory']},
  'arcade-combat':{name:'Combate arcade',mechanics:['combat','progression']},
  'trading-sim':{name:'Simulador de comércio',mechanics:['economy','inventory']}
});
function mix({genre='rpg',dimension='2d',ideas=[]}={}){
 if(!parser.styles[dimension]||!parser.styles[dimension].includes(genre))throw Error('Motor principal incompatível.');
 if(!Array.isArray(ideas)||ideas.length>8)throw Error('Escolha até oito ideias.');
 const chosen=[...new Set(ideas)];
 for(const id of chosen)if(!catalog[id])throw Error('Ideia desconhecida: '+String(id));
 const requested=[...new Set(chosen.flatMap(id=>catalog[id].mechanics))];
 const available=requested.filter(id=>parser.mechanicCatalog[id].supported.includes(genre));
 const pending=requested.filter(id=>!available.includes(id));
 return {genre,dimension,ideas:chosen,requested,available,pending,
   status:pending.length?'prototipo-parcial':'planejamento-compativel',
   warning:'Compatibilidade declarativa: teste jogabilidade e requisitos antes de considerar o jogo pronto.'};
}
root.GameForgeIdeaMixer={catalog,mix};
if(typeof module!=='undefined')module.exports=root.GameForgeIdeaMixer;
})(typeof globalThis!=='undefined'?globalThis:this);
