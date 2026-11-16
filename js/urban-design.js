/* GameForge Urban Action 3D — contrato de planejamento, não motor jogável.
 * Derivado da skill de criação urbana em terceira pessoa: preserva o GDD e
 * nunca substitui cidade, veículos e território por arena/FPS/corrida.
 */
(function(root){
'use strict';
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const definitions=Object.freeze([
 {id:'third-person',name:'Câmera e controle em terceira pessoa',pattern:/terceira pessoa|third[ .-]?person|camera (?:de perseguicao|sobre o ombro|por tras)/,phase:'A'},
 {id:'city',name:'Bairro explorável e ruas 3D',pattern:/cidades?|bairros?|ruas?|mapa urbano|mundo aberto/,phase:'A'},
 {id:'collision',name:'Colisão real no plano XZ e câmera sem atravessar paredes',pattern:/colis(?:ao|oes)|obstaculos?|fisica|paredes?/,phase:'A'},
 {id:'combat',name:'Combate, mira, dano e munição',pattern:/combate|tiroteios?|armas?|municao|recarga/,phase:'B'},
 {id:'enemies',name:'Inimigos com patrulha, percepção e perseguição',pattern:/inimigos?|guardas?|faccoes?|riva(?:is|l)|patrulhas?/,phase:'B'},
 {id:'business',name:'Negócio interativo e renda transacional',pattern:/negocios?|propriedades|estabelecimentos?|renda/,phase:'C'},
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
 const urbanTheme=/acao (?:criminal )?urbana|crime urbano|imperio|mafia|mundo aberto(?: por cidades)?|dominio (?:de )?(?:negocios|territorios)|familias rivais|jogo(?:s)? (?:no estilo|tipo) (?:gta|godfather)/.test(first);
 const thirdPerson=/terceira pessoa|third[ .-]?person|camera (?:de perseguicao|sobre o ombro|por tras)/.test(first);
 const threeD=/\b3d\b|three[ .-]?js|tridimensional/.test(first);
 const relevant=['city','business','vehicles','police','territories','mission','combat']
  .filter(id=>definitions.find(x=>x.id===id).pattern.test(all));
 const identified=urbanTheme&&thirdPerson&&threeD&&relevant.length>=3;
 const confidence=identified?(relevant.length>=5?'alta':'media'):'baixa';
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
  .map(x=>({id:x.id,name:x.name,phase:x.phase,status:'planned',
    origin:lineMatch(source,x.pattern,'GDD')||lineMatch(instruction,x.pattern,'Comando')||
    {document:'Obrigatório para o vertical slice',line:null,excerpt:''},
    runtime:'não implementado no motor urban-action 3D'}));
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
  engineStatus:'planned',engineMessage:'O motor urban-action 3D ainda não existe. Ação urbana não será transformada silenciosamente em FPS, corrida ou arena.',
  nextSlice:'Bairro 3D pequeno com personagem e câmera em terceira pessoa, colisão, um inimigo, um negócio, uma missão, HUD, pausa e save/load.'};
}
function report(profile){
 const p=profile||{},rows=p.requirements||[],counts=p.contentCounts||{};
 const origin=record=>record?.line?record.document+' linha '+record.line:record?.document||'não informada';
 return ['# Plano de jogo urbano 3D — GameForge','','**Estado: PLANEJAMENTO. Não é um jogo executável.**',
  '','Gênero: ação urbana 3D · câmera em terceira pessoa · confiança: '+(p.confidence||'baixa'),
  '','## Conteúdo quantitativo presente no GDD','',
  ...Object.entries(counts).map(([k,v])=>'- '+k+': '+v),
  ...(!Object.keys(counts).length?['- Sem quantidades explícitas; não inventar cidades ou missões.']:[]),
  '','## Evidências da interpretação','',
  ...(p.evidence||[]).map(x=>'- '+x.description+' ('+origin(x)+'): '+x.excerpt),
  '','## Mapa de cobertura — tudo pendente para o motor urbano novo','',
  '| Fase | Requisito | Origem | Estado |','|---|---|---|---|',
  ...rows.map(x=>'| '+x.phase+' | '+x.name.replace(/\|/g,'/')+' | '+origin(x.origin)+' | planned |'),
  '','## Vertical slice recomendado','',
  'A. Controlador e câmera em terceira pessoa, pequeno bairro, colisores reais.',
  'B. Mira/disparos e um inimigo com comportamento verificável.',
  'C. Um negócio interativo, uma missão com recompensa única e save/load.',
  'D. Expandir veículos, polícia, territórios, interiores e progressão por subsistema.',
  'E. Adicionar GLB animado com validação de rig/clipes e otimizações por dispositivo.',
  '','**Aceite:** cada sistema precisa de ação no jogo, mudança real no estado, teste automático e teste no navegador.',
  '**Compatibilidade:** nunca substituir o save do jogo 2D; preservar o GDD original no pacote.',
  '**Direitos:** usar assets e identidade que possam ser redistribuídos; não copiar arte de franquias.',
  ''].join('\n');
}
const api={inspect,report,definitions};
root.GameForgeUrbanDesign=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
