/* Intenções de simulação: contratos de domínio, sem executar texto do usuário. */
(function(root){
'use strict';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/\b(?:qro|keru)\b/g,'quero').replace(/\bfazendinha\b/g,'fazenda')
 .replace(/\baquariu\b/g,'aquario').replace(/\bpeixinhos?\b/g,'peixes');
const domains={
 aquarium:{label:'Aquário',pattern:/\b(aquario|aquarismo|criar peixes|cuidar de peixes)\b/,item:'Peixe',start:'Comprar peixe',care:'Alimentar',finish:'Vender peixe',cost:8,price:22,seconds:18},
 farm:{label:'Fazenda',pattern:/\b(fazenda|farming simulator|simulador agricola|plantar e colher|horta)\b/,item:'Plantação',start:'Plantar',care:'Regar',finish:'Colher',cost:5,price:16,seconds:14},
 shop:{label:'Loja',pattern:/\b(simulador de (?:loja|mercado|supermercado)|(?:administrar|gerenciar|cuidar d[ae]|ter|abrir|minha) (?:uma |um |o |a )?(?:lojinha|loja|mercado|supermercado)|repor estoque|atender clientes)\b/,item:'Mercadoria',start:'Repor estoque',care:'Atender cliente',finish:'Vender produto',cost:9,price:24,seconds:10}
};
function inspect(text){
 const t=norm(text).replace(/\b(?:sem|nao quero|nao usar) 3\s*d\b/g,''),positive=t.split(/[.!?;,\n]|\bmas\b/).filter(c=>!/^\s*(?:sem|nao quero|nao usar)\b/.test(c)).join(' ');
 const matches=Object.entries(domains).filter(([,d])=>d.pattern.test(positive));
 // Um RPG numa fazenda continua RPG. Simulação explícita ou ciclo econômico
 // deve dominar a ambientação isolada.
 const named=/\b(simulacao|simulador|farming simulator|gerenciar|administrar|cuidar|cuido|plantar|colher|alimentar|vender|comprar|estoque|cresce|crescer|crescem|construir|criar peixes|atender|ter)\b/.test(positive);
 const competing=/\b(rpg|plataforma|navinha|corrida|gta|mafia|tower defense|fps)\b/.test(positive);
 return {identified:matches.length>0&&named&&!competing,domain:matches[0]?.[0]||'farm',
   matches:matches.map(([id])=>id),unsupported3d:/\b3\s*d\b|primeira pessoa|terceira pessoa/.test(positive)};
}
function compile(text,command=''){
 const recent=inspect(command);
 const profile=recent.identified?recent:inspect(text),d=domains[profile.domain];
 const t=norm(text),config={version:1,domain:profile.domain,...d,slots:4,startingMoney:80,target:120};
 delete config.pattern;
 const parameters=[['slots',/\b(\d+)\s*(?:canteiros|tanques|prateleiras|espacos)\b/g,1,12],
  ['startingMoney',/\b(?:comec\w*|inici\w*|saldo inicial)\s*(?:com|:|de)?\s*(\d+)\s*(?:moedas|reais|creditos)?/g,20,9999],
  ['seconds',/\b(?:crescer|crescimento|cresce|crescem|producao|atendimento)\s*(?:em|de|:|leva|demora)?\s*(\d+)\s*segundos?/g,2,300],
  ['target',/\b(?:meta|objetivo)\s*(?:de|:|e)?\s*(\d+)\s*(?:moedas|reais|creditos)/g,10,99999],
  ['cost',/\b(?:semente|peixe|estoque|reposicao)\s*(?:custa|custo|por)\s*(\d+)/g,1,500],
  ['price',/\b(?:venda|vender|produto)\s*(?:por|vale|preco|:)\s*(\d+)/g,1,2000]];
 const warnings=[];
 for(const [field,pattern,min,max] of parameters){
  for(const m of t.matchAll(pattern)){
   config[field]=Math.max(min,Math.min(max,Number(m[1])));
   if(config[field]!==Number(m[1]))warnings.push(field+': valor limitado a '+config[field]);
  }
 }
 if(config.startingMoney<config.cost){config.startingMoney=config.cost;warnings.push('Saldo inicial ajustado para permitir a primeira produção.');}
 if(config.price<=config.cost){config.price=config.cost+1;warnings.push('Preço ajustado para permitir lucro.');}
 const pending=[];
 const unsupported=[['breeding',/reproduzir|reproducao|cruzar peixes/,'Reprodução e genética'],
 ['employees',/funcionarios?|empregados?/,'Funcionários autônomos'],
 ['construction',/construir|construcao|expandir (?:a loja|a fazenda)/,'Construção livre'],
 ['vehicles',/tratores?|dirigir|veiculos?/,'Veículos dirigíveis'],
 ['recipes',/receitas?|cozinhar|restaurante/,'Receitas e preparo de alimentos'],
 ['weather',/clima|estacoes do ano|chuva/,'Clima e estações'],
 ['automation',/automatic[oa]|automatizar/,'Automação de produção'],
 ['walk',/andar|caminhar|personagem andando/,'Personagem caminhando pelo cenário']];
 for(const [id,re,label] of unsupported)if(t.split(/[.!?;,\n]|\b(?:mas|com)\b/).some(clause=>{const m=re.exec(clause);return m&&!/\b(?:sem|nao quero|nao usar|evitar)\b.{0,70}$/.test(clause.slice(0,m.index));}))pending.push({id:'simulation-'+id,description:label+' — ainda não implementado',where:'Simulação 2D'});
 if(profile.matches.length>1)pending.push({id:'simulation-hybrid',description:'Combinação de domínios pendente; este protótipo executa somente '+d.label,where:'Simulação 2D'});
 return {config,pending,warnings,profile};
}
root.GameForgeSimulationDesign={inspect,compile,norm,domains};
if(typeof module!=='undefined')module.exports=root.GameForgeSimulationDesign;
})(typeof globalThis!=='undefined'?globalThis:this);
