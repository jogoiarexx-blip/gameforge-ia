/* GF-OPEN-01 — auditoria offline de compatibilidade e custo de GLBs.
 * Metadados somente: a validacao de geometria segue em gameForgeDecodeGLB.
 * Nenhum upload, compressao ou execucao de codigo de terceiros.
 */
(function(root){
 'use strict';
 const LIMIT=25*1024*1024;
 const REQUIRED=new Set(['EXT_texture_webp']);
 const STATES={
  idle:/idle|parad|stand|breath|rest/i,
  walk:/walk|andar|passo|locomot/i,
  run:/run|correr|sprint/i,
  aim:/aim|mirar|target|point/i,
  attack:/attack|fire|shoot|golpe|punch|melee|hit_weapon/i,
  hit:/damage|hurt|react|impact|hit/i,
  death:/death|die|dead|fall|morte/i
 };
 const arr=v=>Array.isArray(v)?v:[];
 const safeCount=v=>Number.isSafeInteger(v)&&v>=0?v:0;
 function analyze(doc,options={}){
  if(!doc||doc.asset?.version!=='2.0')throw Error('GLB precisa declarar glTF 2.0.');
  const bytes=safeCount(options.bytes),role=['scene','player','enemy'].includes(options.role)?options.role:'scene';
  const buffers=arr(doc.buffers),accessors=arr(doc.accessors),meshes=arr(doc.meshes);
  const animations=arr(doc.animations),skins=arr(doc.skins),images=arr(doc.images);
  const blockers=[],warnings=[],recommendations=[];
  const required=arr(doc.extensionsRequired).filter(x=>typeof x==='string');
  const unsupported=[...new Set(required.filter(x=>!REQUIRED.has(x)))];
  if(unsupported.length)blockers.push('Extensoes obrigatorias sem suporte no runtime: '+unsupported.join(', ')+'.');
  if(buffers.length!==1||typeof buffers[0]?.uri==='string')blockers.push('O jogo offline exige um unico buffer BIN incorporado.');
  for(const [i,img] of images.entries()){
   if(img?.uri!==undefined && (typeof img.uri!=='string'||!/^data:image\/(?:png|jpeg|webp);base64,/i.test(img.uri)))
    blockers.push('Imagem '+(i+1)+' externa ou em formato nao suportado; incorpore PNG/JPEG/WEBP.');
   if(img?.bufferView!==undefined && !['image/png','image/jpeg','image/webp'].includes(img.mimeType))
    blockers.push('Imagem '+(i+1)+' com MIME nao suportado.');
  }
  let triangles=0,vertices=0,primitives=0,unsupportedTopology=0;
  for(const mesh of meshes)for(const primitive of arr(mesh?.primitives)){
   primitives++;
   if(primitive?.mode!==undefined && primitive.mode!==4){unsupportedTopology++;continue;}
   const pos=accessors[primitive?.attributes?.POSITION];
   const idx=accessors[primitive?.indices];
   const count=safeCount(idx?.count)||safeCount(pos?.count);
   triangles+=Math.floor(count/3);
   vertices+=safeCount(pos?.count);
  }
  if(unsupportedTopology)blockers.push(unsupportedTopology+' primitiva(s) sem topologia TRIANGLES (modo 4).');
  if(!meshes.length||!primitives)blockers.push('O modelo nao contem malhas triangulares.');
  const clipNames=animations.map((a,i)=>String(a?.name||('Clipe '+(i+1))).slice(0,100));
  const stateMap={};
  for(const [state,re] of Object.entries(STATES)){
   const clip=clipNames.find(name=>re.test(name));
   if(clip)stateMap[state]=clip;
  }
  if(role!=='scene'){
   if(!skins.length)warnings.push('Personagem sem skin: movimentos esqueleticos podem nao funcionar.');
   if(!animations.length)warnings.push('Personagem sem clipes: permanecera estatico.');
   else for(const key of ['idle','walk','attack','hit','death'])
    if(!stateMap[key])warnings.push('Falta clipe identificado para '+key+'.');
  }else if(!animations.length)warnings.push('Objeto de cenario estatico (normal para decoracao).');
  if(bytes>LIMIT)blockers.push('Arquivo supera o limite de 25 MB por GLB.');
  else if(bytes>14*1024*1024){
   warnings.push('Arquivo acima de 14 MiB: revisar desempenho e memoria em celulares.');
   recommendations.push('Preparar variante mobile com glTF-Transform; revalidar no GameForge antes de importar.');
  }
  if(triangles>150000){
   warnings.push('Geometria complexa: '+triangles.toLocaleString('en-US')+' triangulos estimados.');
   recommendations.push('Reduzir malhas e materiais duplicados; conferir aparencia e animacoes apos otimizar.');
  }
  if(images.length>8)warnings.push('Muitas imagens embutidas: conferir memoria de textura no celular.');
  if(skins.some(s=>arr(s?.joints).length>100))warnings.push('Rig acima de 100 ossos: medir custo de animacao mobile.');
  if(arr(doc.extensionsUsed).some(x=>x==='KHR_draco_mesh_compression'||x==='KHR_texture_basisu'||x==='EXT_meshopt_compression'))
   recommendations.push('Draco, Meshopt e KTX2 exigem suporte proprio; extensoes obrigatorias sao bloqueadas.');
  if(role!=='scene'&&animations.length)recommendations.push('Conferir orientacao, escala e deformacao em uma previa jogavel; os metadados nao bastam.');
  return {
   version:1,role,bytes,meshes:meshes.length,primitives,vertices,triangles,
   materials:arr(doc.materials).length,images:images.length,skins:skins.length,
   clips:clipNames,stateMap,requiredExtensions:required,
   blockers:[...new Set(blockers)],warnings:[...new Set(warnings)],
   recommendations:[...new Set(recommendations)],
   status:blockers.length?'BLOCKED':warnings.length?'REVIEW':'READY'
  };
 }
 function format(report){
  const status=report.status==='BLOCKED'?'INCOMPATIVEL':report.status==='REVIEW'?'REVISAR':'ESTRUTURA OK';
  const line=[
   'Preflight GLB: '+status,
   'Malhas '+report.meshes+' | primitivas '+report.primitives+' | triangulos aprox. '+report.triangles.toLocaleString('pt-BR')+
    ' | materiais '+report.materials+' | imagens '+report.images+' | skins '+report.skins,
   'Clipes: '+(report.clips.join(', ')||'nenhum')
  ];
  if(report.blockers.length)line.push('Bloqueios: '+report.blockers.join(' | '));
  if(report.warnings.length)line.push('Avisos: '+report.warnings.join(' | '));
  if(report.recommendations.length)line.push('Sugestoes: '+report.recommendations.join(' | '));
  line.push('A importacao ainda exige decodificacao completa e teste visual. Nao otimiza arquivos automaticamente.');
  return line.join('\n');
 }
 root.GameForgeGLBReadiness={analyze,format};
 if(typeof module!=='undefined')module.exports=root.GameForgeGLBReadiness;
})(typeof globalThis!=='undefined'?globalThis:this);
