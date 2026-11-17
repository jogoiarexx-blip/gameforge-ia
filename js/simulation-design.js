/* Intenções de simulação: contratos de domínio, sem executar texto do usuário. */
(function(root){
'use strict';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/\b(?:qro|keru)\b/g,'quero').replace(/\bn\s+(?=quero|precisa|precisar|alimentar)\b/g,'nao ').replace(/\bfazendinha\b/g,'fazenda')
 .replace(/\b(?:aquariu|aquaru)\b/g,'aquario').replace(/\bpeixinhos?\b/g,'peixes');
const domains={
 aquarium:{label:'Aquário',pattern:/\b(aquario|aquarismo|criar peixes|cuidar (?:de|dos) peixes|(?:jogo|joguinho|game) (?:de|dos) peixes)\b/,item:'Peixe',start:'Comprar peixe',care:'Alimentar',finish:'Vender peixe',cost:8,price:22,seconds:18},
 farm:{label:'Fazenda',pattern:/\b(fazenda|farming simulator|simulador agricola|plantar e colher|horta)\b/,item:'Plantação',start:'Plantar',care:'Regar',finish:'Colher',cost:5,price:16,seconds:14},
 shop:{label:'Loja',pattern:/\b(simulador de (?:loja|mercado|supermercado)|(?:administrar|gerenciar|cuidar d[ae]|ter|abrir|minha) (?:uma |um |o |a )?(?:lojinha|loja|mercado|supermercado)|repor estoque|atender clientes)\b/,item:'Mercadoria',start:'Repor estoque',care:'Atender cliente',finish:'Vender produto',cost:9,price:24,seconds:10}
};
function inspect(text){
 const t=norm(text).replace(/\b(?:sem|nao quero|nao usar) 3\s*d\b/g,''),positive=t.split(/[.!?;,\n]|\bmas\b/).filter(c=>!/^\s*(?:sem|nao quero|nao usar)\b/.test(c)).join(' ');
 const matches=Object.entries(domains).filter(([,d])=>d.pattern.test(positive));
 // Um RPG numa fazenda continua RPG. Simulação explícita ou ciclo econômico
 // deve dominar a ambientação isolada.
 const named=/\b(simulacao|simulador|farming simulator|gerenciar|administrar|cuidar|cuido|plantar|colher|alimentar|vender|comprar|estoque|cresce|crescer|crescem|comer|dar comida|dar racao|ganhar tamanho|construir|criar peixes|atender|ter)\b/.test(positive);
 const competing=/\b(rpg|plataforma|navinha|corrida|gta|mafia|tower defense|fps)\b/.test(positive.replace(/\b\d+\s*fps\b/g,''));
 return {identified:matches.length>0&&named&&!competing,domain:matches[0]?.[0]||'farm',
   matches:matches.map(([id])=>id),unsupported3d:/\b3\s*d\b|primeira pessoa|terceira pessoa/.test(positive)};
}
function compile(text,command=''){
 const recent=inspect(command);
 const profile=recent.identified?recent:inspect(text),d=domains[profile.domain];
 const t=norm(text),config={version:1,domain:profile.domain,...d,slots:4,startingMoney:80,target:120};
 delete config.pattern;
 const parameters=[['slots',/\b(\d+)\s*(?:canteiros|tanques|aquarios|prateleiras|espacos)\b/g,1,12],
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
 if(config.domain==='aquarium'){
  config.version=2;
  const cfg={enabled:true,hungerEnabled:true,feedingRequired:true,waterEnabled:false,hungerSeconds:45,waterSeconds:90,
   sellYoung:false,juvenilePrice:Math.max(1,Math.floor(config.cost*.6)),youngPrice:null};
  const records=t.replace(/\bnao quero (?:peixe|peixes)(?: passando| passar)? (?:com )?fome\b/g,'sem fome').split(/[.!?;,\n]|\b(?:mas|depois)\b|\b(?=com\b)|\be\s+(?=sem\b|nao\b)/);
  for(const record of records){
   const negative=/\b(?:sem|nao quero|nao precisa|nao precisar|nao ter|desativar|remover|tirar)\b/;
   if(/\b(?:fome|saciedade)\b/.test(record)){
    cfg.hungerEnabled=!negative.test(record);
    if(cfg.hungerEnabled)cfg.feedingRequired=true;
   }
   if(/\b(?:sem (?:precisar )?(?:alimentar|alimentacao|comida|racao)|nao (?:precisa|precisar|quero) (?:alimentar|alimentacao))\b/.test(record)){
    cfg.hungerEnabled=false;cfg.feedingRequired=false;
   }
   if(/\b(?:com alimentacao|precisa alimentar|ativar alimentacao)\b/.test(record)){cfg.hungerEnabled=true;cfg.feedingRequired=true;}
   if(/\b(?:sem cuidados?|nao quero necessidades|sem necessidades)\b/.test(record)){cfg.hungerEnabled=false;cfg.waterEnabled=false;cfg.feedingRequired=false;}
   if(/\b(?:agua suja|agua limpa|limpar (?:o aquario|o tanque|a agua)|trocar (?:a )?agua|limpeza da agua|qualidade da agua)\b/.test(record))cfg.waterEnabled=!negative.test(record);
   if(/\b(?:vender (?:o |os |meu |meus )?(?:peixes? )?(?:ainda )?(?:filhotes?|jovens?|pequen[oa]s?)|vender (?:em |a )?qualquer (?:idade|tamanho)|venda antecipada)\b/.test(record))cfg.sellYoung=!negative.test(record);
   if(/\b(?:vender (?:so|somente|apenas) (?:quando )?(?:adultos?|crescid[oa]s?)|so vender adulto|somente adultos|(?:so|somente|apenas) vender (?:quando )?crescer|vender (?:so|somente|apenas) quando crescer)\b/.test(record))cfg.sellYoung=false;
   const timed=[];
   for(const [field,re] of [
    ['hungerSeconds',/\b(?:fome|saciedade)\s*(?:a cada|cada|em|depois de|dura|:)?\s*(\d+)\s*segundos?/],
    ['hungerSeconds',/\b(?:comer|alimentar(?: os peixes)?|dar (?:comida|racao))\s*(?:a cada|cada|de)\s*(\d+)\s*(?:em \1\s*)?segundos?/],
    ['waterSeconds',/\b(?:trocar (?:a )?agua|limpar (?:o )?(?:aquario|tanque))\s*(?:a cada|cada|de)\s*(\d+)\s*(?:em \1\s*)?segundos?/],
    ['waterSeconds',/\b(?:agua suja|sujar a agua|agua sujar)\s*(?:a cada|em|depois de|:)?\s*(\d+)\s*segundos?/]
   ]){
    for(const m of record.matchAll(new RegExp(re.source,'g')))if(!negative.test(record.slice(0,m.index)))timed.push({field,index:m.index,value:Number(m[1])});
   }
   for(const {field,value} of timed.sort((a,b)=>a.index-b.index)){if(field==='hungerSeconds'){cfg.hungerEnabled=true;cfg.feedingRequired=true;}else cfg.waterEnabled=true;cfg[field]=Math.max(5,Math.min(600,value));if(value!==cfg[field])warnings.push(field+': valor limitado a '+cfg[field]);}
   for(const [field,re] of [
    ['juvenilePrice',/\bfilhote\s*(?:vale|custa|por|:)\s*(\d+)/],['youngPrice',/\bjovem\s*(?:vale|custa|por|:)\s*(\d+)/],
    ['adultPrice',/\badulto\s*(?:vale|custa|por|:)\s*(\d+)/]
   ]){const m=re.exec(record);if(m&&!negative.test(record)){const n=Math.max(1,Math.min(2000,Number(m[1])));if(field==='adultPrice')config.price=n;else cfg[field]=n;}}
  }
  if(config.price<=config.cost){config.price=config.cost+1;warnings.push('Preço adulto ajustado para permitir lucro.');}
  if(cfg.juvenilePrice>config.price){cfg.juvenilePrice=config.price;warnings.push('Preço de filhote limitado ao preço adulto para manter valorização por crescimento.');}
  if(cfg.youngPrice===null)cfg.youngPrice=Math.round((cfg.juvenilePrice+config.price)/2);
  const young=Math.max(cfg.juvenilePrice,Math.min(config.price,cfg.youngPrice));
  if(young!==cfg.youngPrice)warnings.push('Preço jovem ajustado entre filhote e adulto.');cfg.youngPrice=young;
  config.aquariumCare=cfg;
 }
 config.persistence={version:1,enabled:true};
 // Cada menção é interpretada na ordem; a última instrução prevalece.
 const savePattern=/\b(?:(sem|nao quero|nao precisa|desativar|remover)\s+(?:precisar\s+)?(?:de\s+)?(?:salvar|salvamento|save|guardar(?: o)? progresso)|(?:salvar|salvamento|save|guardar(?: o)? progresso|continuar amanha|continuar de onde parei))\b/g;
 for(const match of t.matchAll(savePattern))config.persistence.enabled=!match[1];
 const pending=[];
 const unsupported=[['paid-food',/comprar racao|racao (?:custa|paga)|comida (?:custa|paga)/,'Loja e cobrança de alimentação'],
 ['health',/doencas?|peixes? (?:morrem?|morrendo)|morte dos peixes|saude dos peixes/,'Saúde, doenças e morte de peixes'],
 ['breeding',/reproduzir|reproducao|cruzar peixes/,'Reprodução e genética'],
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
