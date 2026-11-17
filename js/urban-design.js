/* GameForge Urban Action 3D — contrato de planejamento, não motor jogável.
 * Derivado da skill de criação urbana em terceira pessoa: preserva o GDD e
 * nunca substitui cidade, veículos e território por arena/FPS/corrida.
 */
(function(root){
'use strict';
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const implementedSlice=new Set(['third-person','city','collision','combat','enemies','business','mission','save']);
const definitions=Object.freeze([
 {id:'third-person',name:'Câmera e controle em terceira pessoa',pattern:/terceira pessoa|third[ .-]?person|camera (?:de perseguicao|sobre o ombro|por tras)/,phase:'A'},
 {id:'city',name:'Bairro explorável e ruas 3D',pattern:/cidades?|bairros?|ruas?|mapa urbano|mundo aberto/,phase:'A'},
 {id:'collision',name:'Colisão real no plano XZ e câmera sem atravessar paredes',pattern:/colis(?:ao|oes)|obstaculos?|fisica|paredes?/,phase:'A'},
 {id:'combat',name:'Combate, mira, dano e munição',pattern:/combate|tiroteios?|armas?|municao|recarga/,phase:'B'},
 {id:'enemies',name:'Inimigos com patrulha, percepção e perseguição',pattern:/inimigos?|guardas?|faccoes?|riva(?:is|l)|patrulhas?/,phase:'B'},
 {id:'business',name:'Negócio interativo e renda transacional',pattern:/negocios?|propriedades|estabelecimentos?|lojas?|renda/,phase:'C'},
 {id:'mission',name:'Missão concluível e recompensa única',pattern:/missoes?|objetivos?|campanha/,phase:'C'},
 {id:'save',name:'Salvamento versionado sem substituir saves legados',pattern:/salvamento|salvar|save|persisten/,phase:'C'},
 {id:'vehicles',name:'Entrada, saída e condução de veículos',pattern:/veiculos?|carros?|dirigir|viaturas?/,phase:'D'},
 {id:'police',name:'Polícia, procurado e perseguição',pattern:/policia|procurad[oa]|estrelas?/,phase:'D'},
 {id:'territories',name:'Territórios, controle e recaptura',pattern:/territorios?|distritos?|recaptura/,phase:'D'},
 {id:'interiors',name:'Interiores com transições controladas',pattern:/interiores?|invasao|entrar em predios?/,phase:'D'},
 {id:'progression',name:'Evolução permanente de saúde, armas e equipamento',pattern:/progressao|evolucao|melhorias?|upgrades?|armadura|estamina/,phase:'D'},
 {id:'glb',name:'Personagens GLB com rig e animações',pattern:/glb|esqueleto|animationmixer|animacoes?/,phase:'E'}
]);
const lineMatch=(text,pattern,document)=>{
 const lines=String(text||'').split(/\r?\n/);
 for(let i=0;i<lines.length;i++){
  if(pattern.test(norm(lines[i])))return {document,line:i+1,excerpt:lines[i].trim().slice(0,160)};
 }
 return null;
};
function inspect(gdd='',command=''){
 const source=String(gdd||''),instruction=String(command||'');
 const first=norm(source.slice(0,4000)+'\n'+instruction.slice(0,1200));
 const all=norm(source+'\n'+instruction);
 // GF-003/004: crianças e usuários iniciantes descrevem o GÊNERO por uma
 // referência curta, não obrigatoriamente por "3D em terceira pessoa".
 const urbanTheme=/acao (?:criminal )?urbana|crime urbano|imperio|mafia|mundo aberto(?: por cidades)?|dominio (?:de )?(?:negocios|territorios)|familias rivais|(?:jogo|game) (?:no estilo|tipo|parecido com) (?:gta|godfather)|\b(?:gta|godfather|padrinho)\b/.test(first);
 const strongUrban=/\b(?:gta|godfather|padrinho|mafia|familias rivais|dominio de negocios)\b/.test(first);
 const thirdPerson=/terceira pessoa|third[ .-]?person|camera (?:de perseguicao|sobre o ombro|por tras)|camera (?:atras|nas costas)|ver (?:o|meu) personagem pelas costas/.test(first);
 const firstPerson=/\b(?:primeira pessoa|camera em primeira pessoa|first[ .-]?person|fps (?:tatico|shooter|de tiro))\b/.test(first);
 const threeD=[...first.matchAll(/\b(?:3d|three[ .-]?js|tridimensional)\b/g)].some(m=>
   !/\b(?:sem|nao|evitar|fora de escopo|nao usar|proibido)\b.{0,42}$/.test(first.slice(Math.max(0,m.index-45),m.index)));
 const clauses=all.split(/[;.,\n]/);
 const relevant=['city','business','vehicles','police','territories','mission','combat']
  .filter(id=>clauses.some(clause=>{
    const pattern=definitions.find(x=>x.id===id).pattern;
    const match=pattern.exec(clause);
    if(!match)return false;
    const prefix=clause.slice(Math.max(0,match.index-45),match.index);
    // "Sem polícia" não deve contar como sistema policial solicitado;
    // "sem armas, com carros e polícia" preserva os pedidos posteriores.
    return !/\b(?:sem|nao quero|nao usar|evitar|fora de escopo|proibid[oa])\b.{0,36}$/.test(prefix);
  }));
 const drivingOnly=/\b(?:jogo de corrida|racing|corrida de carros|voltas na pista|simulador de corrida)\b/.test(first);
 const shooterOnly=/\b(?:navinha|nave espacial|shoot.?em.?up|shmup)\b/.test(first);
 const espionage=/\b(?:goldeneye|007|espionagem|agente secreto|medal of honor)\b/.test(first);
 const identified=urbanTheme&&threeD&&!firstPerson&&!drivingOnly&&!shooterOnly&&!espionage&&
   (thirdPerson?relevant.length>=2:strongUrban&&relevant.length>=2);
 const confidence=identified?(thirdPerson&&relevant.length>=4?'alta':'media'):'baixa';
 const evidence=[];
 for(const [description,pattern] of [
  ['ação urbana como gênero',/acao (?:criminal )?urbana|crime urbano|imperio|mafia|mundo aberto|dominio (?:de )?(?:negocios|territorios)|familias rivais/],
  ['câmera em terceira pessoa',/terceira pessoa|third[ .-]?person|camera (?:de perseguicao|sobre o ombro|por tras)/],
  ['ambiente Three.js/3D',/\b3d\b|three[ .-]?js|tridimensional/]
 ]){
  const origin=lineMatch(source,pattern,'GDD')||lineMatch(instruction,pattern,'Comando');
  if(origin)evidence.push({description,...origin});
 }
 const requirements=definitions.filter(x=>x.pattern.test(all)||['third-person','city','collision','combat','enemies','business','mission','save'].includes(x.id))
  .map(x=>({id:x.id,name:x.name,phase:x.phase,status:implementedSlice.has(x.id)?'partial':'planned',
    origin:lineMatch(source,x.pattern,'GDD')||lineMatch(instruction,x.pattern,'Comando')||
    {document:'Obrigatório para o vertical slice',line:null,excerpt:''},
    runtime:implementedSlice.has(x.id)?'URB-01: versão básica jogável':'Ainda não programado neste motor'}));
 const counts={};
 for(const [key,regex] of Object.entries({
  cities:/\b(\d{1,3})\s+cidades\b/,districts:/\b(\d{1,3})\s+distritos\b/,
  businesses:/\b(\d{1,3})\s+negocios\b/,missions:/\b(\d{1,3})\s+missoes\b/,
  bosses:/\b(\d{1,3})\s+chefes\b/
 })){
  const match=regex.exec(all);
  if(match)counts[key]=Number(match[1]);
 }
 return {identified,genre:identified?'urban-action':null,dimension:identified?'3d':null,
  camera:identified?'third-person':null,confidence,evidence,requirements,
  contentCounts:counts,recognizedSystems:relevant,
  engineStatus:'prototype',engineMessage:'URB-01 já oferece um bairro 3D jogável com uma missão. Veículos dirigíveis, polícia, interiores, território completo e campanha ainda não são executáveis.',
  nextSlice:'Bairro 3D pequeno com personagem e câmera em terceira pessoa, colisão, um inimigo, um negócio, uma missão, HUD, pausa e save/load.'};
}
function report(profile){
 const p=profile||{},rows=p.requirements||[],counts=p.contentCounts||{};
 const origin=record=>record?.line?record.document+' linha '+record.line:record?.document||'não informada';
 return ['# Plano de jogo urbano 3D — GameForge','','**Estado: VERTICAL SLICE URB-01 JOGÁVEL. Não é a campanha completa do GDD.**',
  '','Gênero: ação urbana 3D · câmera em terceira pessoa · confiança: '+(p.confidence||'baixa'),
  '','## Conteúdo quantitativo presente no GDD','',
  ...Object.entries(counts).map(([k,v])=>'- '+k+': '+v),
  ...(!Object.keys(counts).length?['- Sem quantidades explícitas; não inventar cidades ou missões.']:[]),
  '','## Evidências da interpretação','',
  ...(p.evidence||[]).map(x=>'- '+x.description+' ('+origin(x)+'): '+x.excerpt),
  '','## Mapa de cobertura — funcionalidades parciais do slice e futuras','',
  '| Fase | Requisito | Origem | Estado |','|---|---|---|---|',
  ...rows.map(x=>'| '+x.phase+' | '+x.name.replace(/\|/g,'/')+' | '+origin(x.origin)+' | '+x.status+' |'),
  '','## Vertical slice recomendado','',
  'A. Testar o bairro e sua câmera em terceira pessoa com colisores reais (URB-01 básico).',
  'B. URB-01: tiro por direção, cobertura sólida e um guarda simples; expandir IA e mira.',
  'C. URB-01: capturar um negócio, missão com recompensa única e save/load local; expandir economia.',
  'D. Expandir veículos, polícia, territórios, interiores e progressão por subsistema.',
  'E. Adicionar GLB animado com validação de rig/clipes e otimizações por dispositivo.',
  '','**Aceite:** o protótipo parcial não equivale à conversão de cidades/campanha completa; cada sistema novo exige teste e registro.',
  '**Compatibilidade:** nunca substituir o save do jogo 2D; preservar o GDD original no pacote.',
  '**Direitos:** usar assets e identidade que possam ser redistribuídos; não copiar arte de franquias.',
  ''].join('\n');
}
const api={inspect,report,definitions};
root.GameForgeUrbanDesign=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
