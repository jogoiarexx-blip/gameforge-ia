/* GF-VOXEL-12: terrain snapshots produced entirely in the mesh worker. */
function gameForgeVoxelTerrainFactory(K,L){
 'use strict';
 const S=16,H=160,P=18;
 function snapshot(job){
  const {seed,cx,cz,bound,landscape,details,tools,advanced,patches}=job;
  const land=landscape?L(K):null,a=new Uint8Array(P*P*H);
  for(let x=-1;x<=S;x++)for(let z=-1;z<=S;z++){
   const gx=cx*S+x,gz=cz*S+z;if(gx< -bound||gx>=bound||gz< -bound||gz>=bound)continue;
   const c=landscape?land.column(seed,gx,gz,details):null,h=c?c.h:K.heightAt(seed,gx,gz);
   for(let y=0;y<=Math.max(h+(c?.wall||0),c?.top||0,landscape?54:0);y++){
    let id;
    if(c)id=land.block(seed,gx,y,gz,c,tools,advanced);
    else if(y>h)id=0;else if(y===h)id=1;else if(y>=h-3)id=2;
    else{const r=tools&&y>0&&y>=h-14?K.hash(seed^Math.imul(y,2654435761),gx,gz):0;id=r>.86?15:advanced&&r>.78?21:advanced&&r>.70?20:3;}
    a[(y*P+z+1)*P+x+1]=id;
   }
  }
  for(const [i,id] of patches||[])if(Number.isSafeInteger(i)&&i>=0&&i<a.length&&Number.isInteger(id)&&id>=0&&id<=31)a[i]=id;
  return a;
 }
 return {snapshot};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelTerrainFactory=gameForgeVoxelTerrainFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelTerrainFactory;
