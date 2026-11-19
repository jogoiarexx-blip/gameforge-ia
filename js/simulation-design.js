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
 // GF-TRAIN-12: livre e por estações são modos diferentes, sem herdar sistemas fictícios.
 const freePattern=/\b(?:andar|caminhar|explorar|movimentar(?:-se)?|se movimentar)\s+(?:livremente|pelo cenario|pela sala|por toda (?:a loja|a fazenda)|em todas as direcoes|com wasd)\b|\b(?:movimentacao|exploracao)\s+livre\b|\b(?:mapa|loja|fazenda|aquario)\s+exploravel\b|\b(?:andar|caminhar)\s+(?:com\s+)?wasd\b|\b(?:personagem|boneco|jogador)\s+(?:andando|caminhando)\s+livremente\b/g;
 for(const m of t.matchAll(walkPattern))walkRequests.push({index:m.index,mode:'stations',enabled:!negativeAt(t,m.index)});
 for(const m of t.matchAll(freePattern))walkRequests.push({index:m.index,mode:'free',enabled:!negativeAt(t,m.index)});
 let movement=null;
 for(const event of walkRequests.sort((a,b)=>a.index-b.index)){
  if(event.enabled)movement=event.mode;
  else if(movement===event.mode)movement=null;
 }
 if(movement==='stations')config.exploration={version:1,enabled:true,speed:240,reach:44};
 if(movement==='free'){
  let guide=true;
  for(const m of t.matchAll(/\b(?:npc|guia do jogo|personagem secundario)\b/g))guide=!negativeAt(t,m.index);
  config.exploration={version:2,mode:'free',enabled:true,speed:190,reach:55,guide};
 }
 const pending=[];
 // GF-TRAIN-13: gramática limitada de missões reais, sem converter texto livre em código.
 const storyMentions=[];
 const missionWords=/\b(?:missao|missoes|tarefa|tarefas|quest|desafio de npc)\b/g;
 const dialogueWords=/\b(?:dialogos?|conversar com (?:o )?(?:npc|guia|cuidador|agricultor|atendente)|falar com (?:o )?(?:npc|guia|cuidador|agricultor|atendente))\b/g;
 for(const m of t.matchAll(missionWords))storyMentions.push({index:m.index,kind:'mission',enabled:!negativeAt(t,m.index)});
 for(const m of t.matchAll(dialogueWords))storyMentions.push({index:m.index,kind:'dialogue',enabled:!negativeAt(t,m.index)});
 const storyState={mission:false,dialogue:false};
 for(const event of storyMentions.sort((a,b)=>a.index-b.index))storyState[event.kind]=event.enabled;
 if(storyState.mission||storyState.dialogue){
  const forbidden=walkRequests.length&&movement!=='free';
  if(!forbidden&&!config.exploration){
   config.exploration={version:2,mode:'free',enabled:true,speed:190,reach:55,guide:true};
  }
  if(config.exploration?.mode!=='free'){
   pending.push({id:'simulation-story-free',description:'NPC com missão precisa do cenário livre 2D; escolha exploração livre',where:'Simulação 2D'});
  }else{
   config.exploration.guide=true;
   const lastMission=[...t.matchAll(missionWords)].filter(m=>!negativeAt(t,m.index)).at(-1);
   const brief=lastMission?t.slice(lastMission.index):t;
   const tasks=[...brief.matchAll(/\b(vender|venda|alimentar|regar|plantar|comprar|repor|colher|trocar (?:a )?agua)(?:\s+(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez))?(?:\s+(?:peixes?|produtos?|colheitas?|itens?|sementes?|vezes|tanques?))?\b/g)];
   const action=tasks.find(m=>!negativeAt(brief,m.index));
   const named={vender:config.domain==='farm'?'sell':'finish',venda:config.domain==='farm'?'sell':'finish',
    alimentar:'care',regar:'care',plantar:'start',comprar:'start',repor:'start',
    colher:'finish','trocar a agua':'clean','trocar agua':'clean'};
   let objective=storyState.mission?(named[action?.[1]]|| (config.domain==='farm'?'sell':'finish')):'talk';
   if(objective==='clean'&&config.domain!=='aquarium')objective='care';
   if(objective==='sell'&&config.domain!=='farm')objective='finish';
   let count=action?.[2]?number(action[2]):1;
   if(!Number.isFinite(count))count=1;
   if(count>5){warnings.push('Missão limitada a 5 ações');count=5;}
   count=Math.max(1,count);
   const name={aquarium:'Cuidador',farm:'Agricultor',shop:'Atendente'}[config.domain];
   const lines={aquarium:['Cuide dos peixes e acompanhe a missão.','Os peixes crescem enquanto recebem cuidados.','Muito bem! Você completou nossa missão.'],
    farm:['Cuide dos canteiros e conclua a tarefa.','Aguarde o crescimento antes de colher.','A fazenda agradece seu trabalho!'],
    shop:['Atenda os clientes e cumpra a missão.','Reponha o estoque para continuar.','Excelente! A tarefa foi concluída.']}[config.domain];
   const label=storyState.mission?'Missão do '+name:'Diálogo do '+name;
   config.story={version:1,enabled:true,requiredForVictory:storyState.mission,
    npc:{name,lines},mission:{id:'primeira-tarefa',label,steps:storyState.mission?[{event:'talk',count:1},{event:objective,count}]:[{event:'talk',count:1}],reward:storyState.mission?5:0}};
   // GF-TRAIN-15: duas missões sequenciais, NPCs distintos e guardas tipadas.
   const chainPattern=/\b(?:duas|dois|2)\s+(?:missoes|tarefas)\s*(?:encadeadas|em sequencia|seguidas|uma apos a outra)?\b|\b(?:missoes|tarefas)\s+(?:encadeadas|em sequencia|seguidas|consecutivas)\b|\bprimeira (?:missao|tarefa)\b[\s\S]*?\bsegunda (?:missao|tarefa)\b/g;
   const chains=[...t.matchAll(chainPattern)],wantChain=chains.length>0&&!negativeAt(t,chains[chains.length-1].index);
   if(wantChain&&storyState.mission){
    const verbs='(?:comprar|alimentar|vender|venda|plantar|regar|colher|repor|trocar (?:a )?agua)';
    const quantity='(?:\\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)';
    const stage=phrase=>{
     const re=new RegExp('\\b(?:'+phrase+')\\s*(?:de|:|-)??\\s*('+verbs+')(?:\\s+('+quantity+'))?\\b');
     const m=re.exec(t);if(!m)return null;
     const action=named[m[1]]||(config.domain==='farm'?'sell':'finish');
     const value=m[2]?number(m[2]):1,clamped=Math.max(1,Math.min(5,value));
     if(value!==clamped)warnings.push('Missão com no máximo cinco ações.');
     return {event:action,count:clamped};
    };
    const first=stage('primeira (?:missao|tarefa)|missao 1|tarefa 1')||{event:'start',count:1};
    const second=stage('segunda (?:missao|tarefa)|missao 2|tarefa 2')||{event:config.domain==='farm'?'sell':'finish',count:1};
    if(/\b(?:cinco|5|seis|6)\s+missoes\b/.test(t))pending.push({id:'simulation-chain-limit',description:'Até quatro missões encadeadas disponíveis nesta versão',where:'Simulação 2D'});
    const guards=[];
    const stock=t.match(new RegExp('\\b(?:estoque|inventario)\\s*(?:de|com|:|minimo de|pelo menos)?\\s*('+numeric+')\\b|\\b(?:ter|precisa(?:r)? de|com)\\s+(?:pelo menos\\s+)?('+numeric+')\\s+(?:itens?|item|peixes?|produtos?|colheitas?)\\s+(?:no|em)\\s+(?:estoque|inventario)\\b'));
    if(stock&&!negativeAt(t,stock.index)){
     const requested=number(stock[1]||stock[2]),value=Math.max(1,Math.min(config.slots,requested));
     if(requested!==value)warnings.push('Inventário da missão limitado aos espaços existentes.');
     guards.push({kind:'stock',min:value});
    }
    const time=t.match(new RegExp('\\b(?:aguardar|esperar|apos|depois de|somente apos|so depois de)\\s*('+numeric+')\\s*segundos?\\b'));
    if(time&&!negativeAt(t,time.index)){
     const requested=number(time[1]),value=Math.max(1,Math.min(60,requested));
     if(requested!==value)warnings.push('Espera da missão limitada a 60 segundos jogados.');
     guards.push({kind:'time',seconds:value});
    }
    const otherName={aquarium:'Pesquisador',farm:'Feirante',shop:'Gerente'}[config.domain];
    const labels={start:config.start,care:config.care,finish:config.finish,sell:'Vender colheita',clean:'Trocar água'};
    config.story={version:3,enabled:true,requiredForVictory:true,npc:{name,lines},npc2:{
     name:otherName,lines:['Essa é a segunda missão. Complete os requisitos e depois faça a tarefa.','Confira o estoque e o tempo no painel da missão.','Muito bem, concluiu as duas missões!']},
     missions:[
      {id:'m1',label:'Primeira missão: '+(labels[first.event]||'Produzir'),event:first.event,count:first.count,reward:3,requires:[]},
      {id:'m2',label:'Segunda missão: '+(labels[second.event]||'Vender'),event:second.event,count:second.count,reward:7,requires:guards}
     ]};
   }
   // GF-TRAIN-16: 3 ou 4 missões de simulação, até 2 objetivos independentes por etapa.
   // O editor visual produz a mesma gramática PT-BR; não executamos código do usuário.
   const multiReq=[...t.matchAll(/\b(?:tres|3|quatro|4)\s+(?:missoes|tarefas)\s*(?:encadeadas|em sequencia|seguidas|consecutivas)?\b/g)];
   const multiText=multiReq.at(-1);
   const wantMulti=!!(multiText&&!negativeAt(t,multiText.index));
   if(wantMulti&&storyState.mission){
    const countM=/^(?:quatro|4)\b/.test(multiText[0])?4:3;
    const slots=[];
    const headings=[...t.matchAll(/\b(?:missao|tarefa)\s*([1-4])\s*[:\-—]?\s*|\b(primeira|segunda|terceira|quarta)\s+(?:missao|tarefa)\s*[:\-—]?\s*/g)];
    for(let i=0;i<headings.length;i++){
     const m=headings[i],n=m[1]?Number(m[1]):({primeira:1,segunda:2,terceira:3,quarta:4}[m[2]]);
     if(n>=1&&n<=countM&&!slots[n-1])slots[n-1]=t.slice(m.index+m[0].length,headings[i+1]?.index??t.length);
    }
    const verbs=/(comprar|alimentar|vender|venda|plantar|regar|colher|repor|atender|trocar (?:a )?agua)\b(?:\s+(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez))?/g;
    const defaults=[['start','care'],['finish','start'],['care','finish'],['start','finish']];
    const caption={start:config.start,care:config.care,finish:config.finish,sell:'Vender colheita',clean:'Trocar água'};
    const wantsConcurrent=/\b(?:objetivos simultaneos|tarefas simultaneas|objetivos paralelos|duas acoes por missao|dois objetivos por missao|objetivos ao mesmo tempo)\b/.test(t);
    const wantsDependency=/\b(?:dependencia entre objetivos|objetivos dependentes|objetivo 2 depois do objetivo 1|segundo objetivo depende do primeiro)\b/.test(t);
    const globalItemRewards=/\b(?:recompensas? em itens|kits? de recompensa)\b/.test(t);
    const wantsItemReward=globalItemRewards||/\b(?:recompensa(?:s)? (?:de )?\d+ kits?|ganhar \d+ kits?)\b/.test(t);
    const otherName={aquarium:'Pesquisador',farm:'Feirante',shop:'Gerente'}[config.domain];
    const missions=Array.from({length:countM},(_,i)=>{
     const brief=slots[i]||'';
     const actions=[];
     for(const match of brief.matchAll(verbs)){
      if(negativeAt(brief,match.index))continue;
      const event=match[1]==='atender'?'care':named[match[1]];
      if(!event||actions.some(a=>a.event===event))continue;
      const requested=match[2]?number(match[2]):1,count=Math.max(1,Math.min(5,requested));
      if(requested!==count)warnings.push('Objetivo da missão '+(i+1)+' limitado a cinco ações.');
      actions.push({event,count});
      if(actions.length===2)break;
     }
     if(!actions.length)actions.push({event:defaults[i][0],count:1});
     if(actions.length===1&&wantsConcurrent){
      const second=defaults[i].find(e=>e!==actions[0].event)||'care';
      actions.push({event:second,count:1});
     }
     const requires=[];
     const stock=brief.match(new RegExp('\\b(?:estoque|inventario)\\s*(?:de|com|:|minimo de|pelo menos)?\\s*('+numeric+')\\b|\\b(?:ter|precisa(?:r)? de|com)\\s+(?:pelo menos\\s+)?('+numeric+')\\s+(?:itens?|item|peixes?|produtos?|colheitas?)\\s+(?:no|em)\\s+(?:estoque|inventario)\\b'));
     if(stock&&!negativeAt(brief,stock.index)){
      const requested=number(stock[1]||stock[2]),min=Math.max(1,Math.min(config.slots,requested));
      if(min!==requested)warnings.push('Estoque limitado aos espaços existentes.');
      requires.push({kind:'stock',min});
     }
     const time=brief.match(new RegExp('\\b(?:aguardar|esperar|apos|depois de|somente apos|so depois de)\\s*('+numeric+')\\s*segundos?\\b'));
     if(time&&!negativeAt(brief,time.index)){
      const requested=number(time[1]),seconds=Math.max(1,Math.min(60,requested));
      if(seconds!==requested)warnings.push('Espera de missão limitada a 60 segundos ativos.');
      requires.push({kind:'time',seconds});
     }
     const dependency=/\b(?:objetivo 2 depois do objetivo 1|objetivo 2 apos (?:o )?objetivo 1|segundo objetivo (?:so )?depois do primeiro|segundo objetivo depende do primeiro)\b/.test(brief);
     const rewardMatch=brief.match(/\b(?:recompensa(?:s)?\s*(?:de|:)?|ganhar)\s*(\d+|um|uma|dois|duas|tres|quatro)\s*kits?\b/);
     const requestedItems=rewardMatch?number(rewardMatch[1]):/\brecompensas? em itens\b/.test(brief)||globalItemRewards?1:0;
     const itemReward=Math.max(0,Math.min(3,requestedItems));
     if(itemReward!==requestedItems)warnings.push('Recompensa da missão limitada a três kits de suprimentos.');
     return {id:'m'+(i+1),label:'Missão '+(i+1)+' · '+actions.map(a=>caption[a.event]||a.event).join(' + '),
      objectives:actions.map((o,k)=>({...o,requiresFirst:k===1&&(dependency||wantsDependency&&!slots[i])})),reward:3+2*i,requires,itemReward};
    });
    const advanced=wantsDependency||wantsItemReward||missions.some(m=>m.itemReward>0||m.objectives.some(o=>o.requiresFirst));
    config.story={version:advanced?5:4,enabled:true,requiredForVictory:true,npc:{name,lines},npc2:{
     name:otherName,lines:['Vamos cumprir a próxima missão.','Veja os objetivos no painel e cuide do estoque.','Parabéns, campanha concluída!']},
     missions:advanced?missions:missions.map(m=>({id:m.id,label:m.label,objectives:m.objectives.map(o=>({event:o.event,count:o.count})),reward:m.reward,requires:m.requires}))};
   }
   // GF-TRAIN-14: duas opções executáveis de tarefa, sem árvore arbitrária de roteiros.
   const branchRequests=[...t.matchAll(/\b(?:escolhas? de dialogo|dialogo com escolhas|(?:missao|missoes) ramificadas?|dialogo ramificado|escolher entre (?:as )?(?:duas )?(?:missoes|tarefas|opcoes)|duas opcoes|dois caminhos|escolher entre (?:alimentar|regar|plantar|comprar|repor|vender|colher)\b)\b/g)];
   const wantsBranch=branchRequests.length&& !negativeAt(t,branchRequests[branchRequests.length-1].index);
   if(wantsBranch&&storyState.mission&&!([3,4].includes(config.story.version))){
    const pair=t.match(/\b(?:escolher entre|entre|opcoes?\s*:|caminhos?\s*:?)\s*(alimentar|regar|plantar|comprar|repor|vender|colher)(?:\s+(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|\d+))?(?:\s+(?:peixes?|produtos?|colheitas?|itens?|vezes|canteiros?|tanques?))?\s+ou\s+(alimentar|regar|plantar|comprar|repor|vender|colher)(?:\s+(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|\d+))?\b/);
    const convert=word=>({alimentar:'care',regar:'care',plantar:'start',comprar:'start',repor:'start',
      vender:config.domain==='farm'?'sell':'finish',colher:'finish'})[word];
    const first=pair?convert(pair[1]):'care',second=pair?convert(pair[3]):'finish';
    const clampCount=value=>Math.max(1,Math.min(5,Number.isFinite(number(value))?number(value):1));
    if(pair&&[pair[2],pair[4]].some(v=>v&&number(v)>5))warnings.push('Contagem de opção de missão limitada a cinco ações.');
    const readable={start:config.start,care:config.care,finish:config.finish,sell:'Vender colheita',clean:'Trocar água'};
    config.story.version=2;
    config.story.mission.steps=[{event:'talk',count:1}];
    delete config.story.mission.reward;
    config.story.mission.branches=[
     {id:'a',label:readable[first]||config.care,event:first,count:clampCount(pair?.[2]||'1'),reward:5},
     {id:'b',label:readable[second]||config.finish,event:second,count:clampCount(pair?.[4]||'1'),reward:8}
    ];
    config.story.npc.lines[0]='Escolha uma das duas tarefas no diálogo: tecla 5 ou 6.';
    config.story.npc.lines[1]='Escolha uma tarefa antes de executar o objetivo.';
   }else if(wantsBranch){
    pending.push({id:'simulation-story-branches',description:'Duas opções jogáveis exigem missão explícita com NPC em sala livre',where:'Simulação 2D'});
   }
   if(/\b(?:multiplos finais|narrativa livre|mais de duas escolhas|tres caminhos|dialogos gerados por ia)\b/.test(t))
    pending.push({id:'simulation-story-complex',description:'Narrativas livres, mais de duas opções ou múltiplos finais não implementados',where:'Simulação 2D'});
  }
 }
 // Patrulha horizontal verificável. Não aparece em projetos sem pedido afirmativo.
 const patrolEvents=[...t.matchAll(/\b(?:npc|guia|personagem secundario|cuidador|agricultor|atendente)\s+(?:que\s+)?(?:patrulha|patrulhando|com patrulha|anda de um lado para outro|caminha de um lado para outro)|\bpatrulha do npc\b|\bnpc em patrulha\b/g)];
 const patrol=patrolEvents.length&&!negativeAt(t,patrolEvents[patrolEvents.length-1].index);
 if(patrol){
  if(!config.exploration&&!walkRequests.length)config.exploration={version:2,mode:'free',enabled:true,speed:190,reach:55,guide:true};
  if(config.exploration?.mode==='free'){
   config.exploration.guide=true;
   config.exploration.patrol={version:1,enabled:true,left:810,right:885,speed:36};
  }else pending.push({id:'simulation-npc-patrol',description:'Patrulha exige exploração livre 2D com NPC',where:'Simulação 2D'});
 }
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
