/* Intenções de simulação: contratos de domínio, sem executar texto do usuário. */
(function(root){
'use strict';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/\b(?:qro|keru)\b/g,'quero').replace(/\bn\s+(?=quero|precisa|precisar|alimentar)\b/g,'nao ').replace(/\bfazendinha\b/g,'fazenda')
 .replace(/\b(?:aquariu|aquaru)\b/g,'aquario').replace(/\bpeixinhos?\b/g,'peixes');
// Números simples por extenso, somente nos campos numéricos reconhecidos.
const words={zero:0,um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10,onze:11,doze:12,treze:13,catorze:14,quatorze:14,quinze:15,dezesseis:16,dezessete:17,dezoito:18,dezenove:19,vinte:20,trinta:30,quarenta:40,cinquenta:50,sessenta:60,setenta:70,oitenta:80,noventa:90,cem:100};
const tens='(?:vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)',units='(?:um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove)';
const numeric='(?:\\d+|'+tens+'(?:\\s+e\\s+'+units+')?|'+Object.keys(words).join('|')+')\\b';
const number=value=>Object.hasOwn(words,value)?words[value]:/\s+e\s+/.test(value)?value.split(/\s+e\s+/).reduce((n,w)=>n+words[w],0):Number(value);
function negativeAt(text,index){
 const boundaries=/[;,.!?\n]|\b(?:mas|depois|agora|porem)\b|\be\s+(?=(?:quero|com|ativar|ligar|manter|vender|alimentar|crescer|plantar|trocar|limpar)\b)/g;
 let start=0;for(const m of text.matchAll(boundaries)){if(m.index>=index)break;if(m.index+m[0].length<=index)start=m.index+m[0].length;}
 const prefix=text.slice(start,index);
 const markers=/\b(nao\s+(?:quero\s+)?(?:mais\s+)?(?:desativar|desligar|remover|tirar)|nao(?:\s+quero)?(?:\s+mais)?(?:\s+(?:usar|ativar|ligar|ter|com|precisa|precisar))?|sem|evitar|evite|desativar|desative|desativa|desligar|desligue|desliga|remover|remova|remove|tirar|tire|tira|retirar|retire|retira|com|quero|usar|use|colocar|coloque|ativar|ative|ativa|ligar|ligue|liga|manter|mantenha)\b/g;
 let negative=false;
 for(const m of prefix.matchAll(markers))negative=!/^nao\s+(?:quero\s+)?(?:mais\s+)?(?:desativar|desligar|remover|tirar)$/.test(m[0])&&/^(?:nao|sem|evit|desativ|deslig|remov|tir|retir)/.test(m[0]);
 return negative;
}
function matches(pattern,text){return text.matchAll(new RegExp(pattern.source.replaceAll('(\\d+)','('+numeric+')'),'g'));}
const domains={
 aquarium:{label:'Aquário',pattern:/\b(aquario|aquarismo|criar peixes|cuidar (?:de|dos) peixes|(?:jogo|joguinho|game) (?:idle )?(?:de|dos) peixes)\b/,item:'Peixe',start:'Comprar peixe',care:'Alimentar',finish:'Vender peixe',cost:8,price:22,seconds:18},
 farm:{label:'Fazenda',pattern:/\b(fazenda|farming simulator|simulador agricola|plantar e colher|horta)\b/,item:'Plantação',start:'Plantar',care:'Regar',finish:'Colher',cost:5,price:16,seconds:14},
 shop:{label:'Loja',pattern:/\b((?:simulador|jogo|game) (?:idle )?de (?:loja|mercado|supermercado)|(?:administrar|gerenciar|cuidar d[ae]|ter|abrir|minha) (?:uma |um |o |a )?(?:lojinha|loja|mercado|supermercado)|repor estoque|atender clientes)\b/,item:'Mercadoria',start:'Repor estoque',care:'Atender cliente',finish:'Vender produto',cost:9,price:24,seconds:10}
};
function inspect(text){
 const t=norm(text).replace(/\b(?:sem|nao quero|nao usar) 3\s*d\b/g,''),positive=t.split(/[.!?;,\n]|\bmas\b/).filter(c=>!/^\s*(?:sem|nao quero|nao usar)\b/.test(c)).join(' ');
 const matches=Object.entries(domains).filter(([,d])=>d.pattern.test(positive));
 // Um RPG numa fazenda continua RPG. Simulação explícita ou ciclo econômico
 // deve dominar a ambientação isolada.
 const named=/\b(simulacao|simulador|automacao|automatizar|automatic[oa]|idle|farming simulator|gerenciar|administrar|cuidar|cuido|plantar|colher|alimentar|vender|comprar|estoque|cresce|crescer|crescem|comer|dar comida|dar racao|ganhar tamanho|construir|criar peixes|atender|ter)\b/.test(positive);
 const competing=/\b(rpg|plataforma|navinha|corrida|gta|mafia|tower defense|fps)\b/.test(positive.replace(/\b\d+\s*fps\b/g,''));
 return {identified:matches.length>0&&named&&!competing,domain:matches[0]?.[0]||'farm',
   matches:matches.map(([id])=>id),unsupported3d:/\b3\s*d\b|primeira pessoa|terceira pessoa/.test(positive)};
}
function compile(text,command=''){
 const recent=inspect(command);
 const profile=recent.identified?recent:inspect(text),d=domains[profile.domain];
 const timedText=norm(text).replace(new RegExp('\\b('+numeric+')\\s+em\\s+\\1\\s+(minutos?|segundos?)\\b','g'),(_,value,unit)=>number(value)*(unit.startsWith('minuto')?60:1)+' segundos');
 const t=timedText.replace(new RegExp('\\b('+numeric+')\\s+(minutos?|segundos?)\\b','g'),(_,value,unit)=>number(value)*(unit.startsWith('minuto')?60:1)+' segundos'),config={version:1,domain:profile.domain,...d,slots:4,startingMoney:80,target:120};
 delete config.pattern;
 const parameters=[['slots',/\b(\d+)\s*(?:canteiros|tanques|aquarios|prateleiras|espacos)\b/g,1,12],
  ['startingMoney',/\b(?:comec\w*|inici\w*|saldo inicial)\s*(?:com|:|de)?\s*(\d+)\s*(?:moedas|reais|creditos)?/g,20,9999],
  ['seconds',/\b(?:crescer|crescimento|cresce|crescem|producao|atendimento)\s*(?:em|de|:|leva|demora)?\s*(\d+)\s*segundos?/g,2,300],
  ['target',/\b(?:meta|objetivo)\s*(?:de|:|e)?\s*(\d+)\s*(?:moedas|reais|creditos)/g,10,99999],
  ['cost',/\b(?:semente|peixe|estoque|reposicao)\s*(?:custa|custo|por)\s*(\d+)/g,1,500],
  ['price',/\b(?:venda|vender|produto|adulto)\s*(?:por|vale|preco|:|custa)\s*(\d+)/g,1,2000]];
 const warnings=[];
 for(const [field,pattern,min,max] of parameters){
  for(const m of matches(pattern,t)){
   if(negativeAt(t,m.index))continue;
   config[field]=Math.max(min,Math.min(max,number(m[1])));
   if(config[field]!==number(m[1]))warnings.push(field+': valor limitado a '+config[field]);
  }
 }
 if(config.startingMoney<config.cost){config.startingMoney=config.cost;warnings.push('Saldo inicial ajustado para permitir a primeira produção.');}
 if(config.price<=config.cost){config.price=config.cost+1;warnings.push('Preço ajustado para permitir lucro.');}
 if(config.domain==='aquarium'){
  config.version=2;
  const cfg={enabled:true,hungerEnabled:true,feedingRequired:true,waterEnabled:false,hungerSeconds:45,waterSeconds:90,
   sellYoung:false,juvenilePrice:Math.max(1,Math.floor(config.cost*.6)),youngPrice:null};
  const records=t.replace(/\bnao quero (?:peixe|peixes)(?: passando| passar)? (?:com )?fome\b/g,'sem fome').split(/[.!?;,\n]|\b(?:mas|depois|agora|porem)\b|\b(?=com\b)|\be\s+(?=(?:sem|nao|quero|ativar|ative|ligar|ligue|desativar|desative|desligar|desliga|remover|remova|tirar|tira|retirar|retire)\b)/);
  for(const record of records){
   if(/\b(?:fome|saciedade)\b/.test(record)){
    cfg.hungerEnabled=!negativeAt(record,record.search(/\b(?:fome|saciedade)\b/));
    if(cfg.hungerEnabled)cfg.feedingRequired=true;
   }
   if(/\b(?:sem (?:precisar )?(?:alimentar|alimentacao|comida|racao)|nao (?:precisa|precisar|quero)(?: mais)? (?:alimentar|alimentacao))\b/.test(record)){
    cfg.hungerEnabled=false;cfg.feedingRequired=false;
   }
   if(/\b(?:com alimentacao|precisa alimentar|ativar alimentacao)\b/.test(record)&&!negativeAt(record,record.search(/alimentacao|alimentar/))){cfg.hungerEnabled=true;cfg.feedingRequired=true;}
   if(/\b(?:sem cuidados?|nao quero necessidades|sem necessidades)\b/.test(record)){cfg.hungerEnabled=false;cfg.waterEnabled=false;cfg.feedingRequired=false;}
   if(/\b(?:agua suja|agua limpa|limpar (?:o aquario|o tanque|a agua)|trocar (?:a )?agua|limpeza da agua|qualidade da agua|limpeza automatica|troca (?:de )?agua automatica)\b/.test(record))cfg.waterEnabled=!negativeAt(record,record.search(/agua|limpar|trocar|limpeza/));
   const saleRules=[
    [/\b(?:vender (?:o |os |meu |meus )?(?:peixes? )?(?:ainda )?(?:filhotes?|jovens?|pequen[oa]s?)|vender (?:em |a )?qualquer (?:idade|tamanho)|venda antecipada)\b/,true],
    [/\b(?:vender (?:so|somente|apenas) (?:quando )?(?:adultos?|crescid[oa]s?)|so vender adulto|somente adultos|(?:so|somente|apenas) vender (?:quando )?crescer|vender (?:so|somente|apenas) quando crescer)\b/,false]
   ],saleEvents=[];
   for(const [re,allowed] of saleRules)for(const m of record.matchAll(new RegExp(re.source,'g')))saleEvents.push({index:m.index,value:negativeAt(record,m.index)?!allowed:allowed});
   for(const event of saleEvents.sort((a,b)=>a.index-b.index))cfg.sellYoung=event.value;
   const timed=[];
   for(const [field,re] of [
    ['hungerSeconds',/\b(?:fome|saciedade)\s*(?:a cada|cada|em|depois de|dura|:)?\s*(\d+)\s*segundos?/],
    ['hungerSeconds',/\b(?:comer|alimentar(?: os peixes)?|dar (?:comida|racao))\s*(?:a cada|cada|de)\s*(\d+)\s*(?:em \1\s*)?segundos?/],
    ['waterSeconds',/\b(?:trocar (?:a )?agua|limpar (?:o )?(?:aquario|tanque))\s*(?:a cada|cada|de)\s*(\d+)\s*(?:em \1\s*)?segundos?/],
    ['waterSeconds',/\b(?:agua suja|sujar a agua|agua sujar)\s*(?:a cada|em|depois de|:)?\s*(\d+)\s*segundos?/]
   ]){
    for(const m of matches(re,record))if(!negativeAt(record,m.index))timed.push({field,index:m.index,value:number(m[1])});
   }
   for(const {field,value} of timed.sort((a,b)=>a.index-b.index)){if(field==='hungerSeconds'){cfg.hungerEnabled=true;cfg.feedingRequired=true;}else cfg.waterEnabled=true;cfg[field]=Math.max(5,Math.min(600,value));if(value!==cfg[field])warnings.push(field+': valor limitado a '+cfg[field]);}
   for(const [field,re] of [
    ['juvenilePrice',/\bfilhote\s*(?:vale|custa|por|:)\s*(\d+)/],['youngPrice',/\bjovem\s*(?:vale|custa|por|:)\s*(\d+)/]
   ]){for(const m of matches(re,record))if(!negativeAt(record,m.index)){const n=Math.max(1,Math.min(2000,number(m[1])));cfg[field]=n;}}
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
 const savePattern=/\b(?:salvar|salvamento|save|guardar(?: o)? progresso|continuar amanha|continuar de onde parei)\b/g;
 for(const match of t.matchAll(savePattern))config.persistence.enabled=!negativeAt(t,match.index);
 const auto={version:1,enabled:true,intervalSeconds:1,start:false,care:false,finish:false,sell:false,clean:false},autoEvents=[],autoSpans=[];
 const relevant=['start','care','finish',...(config.domain==='farm'?['sell']:[]),...(config.domain==='aquarium'?['clean']:[])];
 const collectAuto=(re,fields,manual=false)=>{
  for(const m of t.matchAll(new RegExp(re.source,'g'))){
   autoSpans.push([m.index,m.index+m[0].length]);
   autoEvents.push({index:m.index,fields,enabled:manual?false:!negativeAt(t,m.index)});
  }
 };
 collectAuto(/\b(?:automacao|(?:producao|ciclo|simulacao) automatic[oa]|automatizar (?:tudo|a producao|o ciclo)|idle)\b/,relevant);
 collectAuto(/\bmodo manual\b/,relevant,true);
 const startPattern={farm:/\b(?:plantar automaticamente|replantar automaticamente|plantio automatico|replantio automatico)\b/,aquarium:/\b(?:comprar (?:peixes?|filhotes?) automaticamente|compra automatica)\b/,shop:/\b(?:repor (?:o )?estoque automaticamente|reposicao automatica)\b/}[config.domain];
 const carePattern={farm:/\b(?:regar automaticamente|irrigacao automatica)\b/,aquarium:/\b(?:alimentar(?: os peixes)? automaticamente|alimentacao automatica)\b/,shop:/\b(?:atender(?: clientes)? automaticamente|atendimento automatico)\b/}[config.domain];
 collectAuto(startPattern,['start']);collectAuto(carePattern,['care']);
 if(config.domain==='farm')collectAuto(/\b(?:colher automaticamente|colheita automatica)\b/,['finish']);
 collectAuto(/\b(?:vender(?: (?:a )?colheita| (?:os )?peixes| (?:os )?produtos)? automaticamente|venda automatica)\b/,[config.domain==='farm'?'sell':'finish']);
 if(config.domain==='aquarium')collectAuto(/\b(?:trocar (?:a )?agua automaticamente|limpeza automatica|troca (?:de )?agua automatica)\b/,['clean']);
 for(const [re,field] of [
  [/\b(?:plantio|replantio|compra|reposicao) manual\b/,'start'],[/\b(?:alimentacao|irrigacao|atendimento) manual\b/,'care'],
  [/\bcolheita manual\b/,'finish'],[/\bvenda manual\b/,config.domain==='farm'?'sell':'finish'],[/\b(?:limpeza|troca de agua) manual\b/,'clean']
 ])collectAuto(re,[field],true);
 for(const event of autoEvents.sort((a,b)=>a.index-b.index))for(const field of event.fields)auto[field]=event.enabled;
 for(const m of matches(/\b(?:automacao|ciclo automatico)\s*(?:a cada|cada|em)\s*(\d+)\s*segundos?/,t))if(!negativeAt(t,m.index)){
  auto.intervalSeconds=Math.max(1,Math.min(60,number(m[1])));if(auto.intervalSeconds!==number(m[1]))warnings.push('Intervalo de automação limitado a '+auto.intervalSeconds+' segundos.');
 }
 if(config.domain==='aquarium'&&!config.aquariumCare?.waterEnabled)auto.clean=false;
 auto.enabled=relevant.some(field=>auto[field]);if(auto.enabled)config.automation=auto;
 // GF-TRAIN-11: caminhada somente quando o jogador realmente pede exploração.
 // Última ordem explícita prevalece; a exploração não substitui o ciclo econômico.
 const walkRequests=[];
 const walkPattern=/\b(?:personagem|boneco|jogador)\s+(?:andando|caminhando|anda|caminha)\b|\b(?:andar|caminhar|andando|caminhando|aproximar|chegar|ir)\s+(?:ate|para|pelo|pela|entre|no|na|perto)\s+(?:o |a |os |as )?(?:aquarios?|tanques?|loja|fazenda|prateleiras?|canteiros?|espacos?)\b|\b(?:interagir|interacao)\s+(?:com|ao|no|na)\s+(?:o |a )?(?:aquario|tanque|prateleira|canteiro)\b/g;
 for(const m of t.matchAll(walkPattern))walkRequests.push({index:m.index,enabled:!negativeAt(t,m.index)});
 if(walkRequests.length&&walkRequests[walkRequests.length-1].enabled)
  config.exploration={version:1,enabled:true,speed:240,reach:44};
 const pending=[];
 const unsupported=[['paid-food',/comprar racao|racao (?:custa|paga)|comida (?:custa|paga)/,'Loja e cobrança de alimentação'],
 ['health',/doencas?|peixes? (?:morrem?|morrendo)|morte dos peixes|saude dos peixes/,'Saúde, doenças e morte de peixes'],
 ['breeding',/reproduzir|reproducao|cruzar peixes/,'Reprodução e genética'],
 ['employees',/funcionarios?|empregados?/,'Funcionários autônomos'],
 ['construction',/construir|construcao|expandir (?:a loja|a fazenda)/,'Construção livre'],
 ['vehicles',/tratores?|dirigir|veiculos?/,'Veículos dirigíveis'],
 ['recipes',/receitas?|cozinhar|restaurante/,'Receitas e preparo de alimentos'],
 ['weather',/clima|estacoes do ano|chuva/,'Clima e estações'],
 ['automation',/automatic(?:[oa]|amente)|automatizar|automacao|\bidle\b/,'Automação de produção'],
 ['walk',/andar|caminhar|personagem andando/,'Personagem caminhando pelo cenário']];
 for(const [id,re,label] of unsupported){
  if(id==='walk'&&config.exploration?.enabled)continue;
  const scoped=id==='automation'?t.replace(/\b(?:salvamento|save|salvar|guardar (?:o )?progresso)\s+automatic(?:o|amente)\b/g,match=>' '.repeat(match.length)):t;
  const requests=new Map();
  for(const m of scoped.matchAll(new RegExp(re.source,'g'))){
   if(id==='automation'&&autoSpans.some(([start,end])=>m.index>=start&&m.index<end))continue;
   const part=id==='health'?(/doenca/.test(m[0])?'disease':/morr|morte/.test(m[0])?'death':'health'):id;
   requests.set(part,!negativeAt(scoped,m.index));
  }
  if([...requests.values()].some(Boolean))pending.push({id:'simulation-'+id,description:label+' — ainda não implementado',where:'Simulação 2D'});
 }
 if(profile.matches.length>1)pending.push({id:'simulation-hybrid',description:'Combinação de domínios pendente; este protótipo executa somente '+d.label,where:'Simulação 2D'});
 return {config,pending,warnings,profile};
}
root.GameForgeSimulationDesign={inspect,compile,norm,domains};
if(typeof module!=='undefined')module.exports=root.GameForgeSimulationDesign;
})(typeof globalThis!=='undefined'?globalThis:this);
