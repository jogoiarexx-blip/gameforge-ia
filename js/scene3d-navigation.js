/* GF-OPEN-02c — estimativa geométrica de colisores e alcançabilidade em XZ.
 * Preflight do EDITOR: não é navmesh nem simulação dos obstáculos procedurais.
 * Nenhuma dependência de Three.js, DOM, arquivos, rede ou código não confiável.
 */
(function(root){
'use strict';
const SHAPES={crate:{w:1.4,d:1.4},pillar:{w:1.2,d:1.2},wall:{w:3,d:.6},tree:{w:.7,d:.7}};
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function boundsFor(entry,glbBounds){
 if(!entry||entry.collidable!==true||entry.kind==='lamp')return null;
 const x=entry.x,z=entry.z,scale=entry.scale,yaw=entry.yaw;
 if(![x,z,scale,yaw].every(finite)||scale<=0)return null;
 const kind=entry.kind,base=kind==='glb'?glbBounds:SHAPES[kind];
 if(!base||!finite(base.w)||!finite(base.d)||base.w<=0||base.d<=0)return null;
 const angle=yaw*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),ac=Math.abs(c),as=Math.abs(s);
 const ox=kind==='glb'&&finite(base.x)?base.x:0;
 const oz=kind==='glb'&&finite(base.z)?base.z:0;
 return {id:entry.id||'',kind,
  x:x+scale*(ox*c+oz*s),z:z+scale*(-ox*s+oz*c),
  w:Math.min(100,scale*(base.w*ac+base.d*as)),
  d:Math.min(100,scale*(base.w*as+base.d*ac))};
}
function collect(stage,glbBounds={}){
 const entries=Array.isArray(stage)?stage:Array.isArray(stage?.objects)?stage.objects:[];
 const boxes=[],missing=[];
 for(const entry of entries){
  if(!entry?.collidable)continue;
  const box=boundsFor(entry,entry.kind==='glb'?glbBounds[entry.assetId]:null);
  if(box)boxes.push(box);
  else if(entry.kind==='glb')missing.push(entry.assetId);
 }
 return {boxes,missing:[...new Set(missing)]};
}
function isBlocked(x,z,boxes,radius){
 for(const b of boxes){
  if(Math.abs(x-b.x)<=b.w/2+radius&&Math.abs(z-b.z)<=b.d/2+radius)return true;
 }
 return false;
}
function simplify(points){
 if(points.length<3)return points;
 const result=[points[0]];
 for(let i=1;i<points.length-1;i++){
  const prev=points[i-1],curr=points[i],next=points[i+1];
  const ax=curr.x-prev.x,az=curr.z-prev.z,bx=next.x-curr.x,bz=next.z-curr.z;
  if(Math.abs(ax*bz-az*bx)>0.0001)result.push(curr);
 }
 result.push(points[points.length-1]);return result;
}
function inspect(stage,options={}){
 const size=[48,72].includes(options.size)?options.size:48;
 const radius=finite(options.radius)?clamp(options.radius,.2,1.2):.4;
 const step=finite(options.step)?clamp(options.step,.5,2):.75;
 const start=options.start||{x:0,z:size*.28};
 const finish=options.finish||{x:0,z:-size*.37};
 if(![start.x,start.z,finish.x,finish.z].every(finite))throw Error('Pontos de navegação invalidos.');
 const {boxes,missing}=collect(stage,options.glbBounds||{});
 const min=-size/2+radius,max=size/2-radius;
 const cols=Math.floor((max-min)/step)+1,rows=cols,total=cols*rows;
 const coord=(x,z)=>[Math.round((clamp(x,min,max)-min)/step),Math.round((clamp(z,min,max)-min)/step)];
 const [sx,sz]=coord(start.x,start.z),[gx,gz]=coord(finish.x,finish.z);
 const index=(x,z)=>z*cols+x;
 const first=index(sx,sz),goal=index(gx,gz);
 const occupied=new Uint8Array(total);
 for(let z=0;z<rows;z++)for(let x=0;x<cols;x++)
  occupied[index(x,z)]=isBlocked(min+x*step,min+z*step,boxes,radius)?1:0;
 const result={status:'BLOCKED',reason:'',boxes,missing,visited:0,path:[],start,finish,
  caveat:'Analise aproximada: nao inclui rochas, predios, inimigos, objetivos e outros obstaculos procedurais do jogo.'};
 if(occupied[first]||occupied[goal]){
  result.reason=occupied[first]?'Posicao inicial bloqueada por objeto do editor.':'Saida bloqueada por objeto do editor.';
  return result;
 }
 const previous=new Int32Array(total);previous.fill(-1);
 const queue=new Int32Array(total);let head=0,tail=1;queue[0]=first;previous[first]=first;
 const delta=[[1,0],[-1,0],[0,1],[0,-1]];
 while(head<tail){
  const current=queue[head++];if(current===goal)break;
  const x=current%cols,z=Math.floor(current/cols);
  for(const [dx,dz] of delta){
   const nx=x+dx,nz=z+dz;
   if(nx<0||nx>=cols||nz<0||nz>=rows)continue;
   const n=index(nx,nz);
   if(previous[n]!==-1||occupied[n])continue;
   previous[n]=current;queue[tail++]=n;
  }
 }
 result.visited=tail;
 if(previous[goal]===-1){
  result.reason='Nao foi encontrada passagem na grade aproximada entre inicio e saida.';
  return result;
 }
 const path=[];
 for(let pos=goal;pos!==first;pos=previous[pos]){
  path.push({x:Number((min+(pos%cols)*step).toFixed(3)),
   z:Number((min+Math.floor(pos/cols)*step).toFixed(3))});
 }
 path.push({x:Number((min+sx*step).toFixed(3)),z:Number((min+sz*step).toFixed(3))});
 path.reverse();result.path=simplify(path);
 result.status=missing.length?'INCOMPLETE':'CLEAR';
 result.reason=missing.length?
  'Passagem calculada sem '+missing.length+' modelo(s) GLB cuja geometria ainda nao foi carregada.':
  'Existe passagem entre o inicio e a saida na grade dos objetos do editor.';
 return result;
}
root.GameForgeScene3DNavigation={SHAPES,boundsFor,collect,inspect,isBlocked};
if(typeof module!=='undefined')module.exports=root.GameForgeScene3DNavigation;
})(typeof globalThis!=='undefined'?globalThis:this);
