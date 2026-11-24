/* GF-VOXEL-09: greedy exposed-face meshing; transferable padded chunk snapshot. */
function gameForgeVoxelMesherFactory(){
 'use strict';
 const S=16,H=160,colors={1:[.36,.64,.23],2:[.57,.37,.23],3:[.52,.56,.58],4:[.69,.48,.22],5:[.32,.34,.38],6:[.73,.28,.19],8:[.44,.27,.12],9:[.19,.48,.16],10:[.37,.75,.21],12:[.65,.39,.13],15:[.67,.43,.31],20:[.23,.24,.25],21:[.67,.46,.20],28:[.18,.45,.72],29:[.67,.61,.44],31:[.87,.92,.95],32:[.34,.25,.17],33:[.29,.52,.22]};
 const dims=[S,H,S];
 function tile(id,axis,sign){return id===1?(axis===1?(sign>0?1:2):24):id===8?(axis===1?25:8):id===28?26:id===29?27:id===31?11:id===32?13:id===33?14:id;}
 function build(snapshot,cx,cz,textured,lighting=false,pad=1){
  const P=S+pad*2;if(![1,8].includes(pad)||snapshot.length!==P*P*H)throw Error('Snapshot inválido');
  const pos=[],rgb=[],uv=[],tiles=[];let faces=0,exposed=0;
  const index=(x,y,z)=>(y*P+z+pad)*P+x+pad;
  const raw=(x,y,z)=>y<0?3:y>=H||x< -pad||x>=S+pad||z< -pad||z>=S+pad?0:snapshot[index(x,y,z)];
  const get=(x,y,z)=>{const id=raw(x,y,z);return id>=40&&id<=47?28:id;};
  const waterHeight=(x,y,z)=>{const id=raw(x,y,z);return id===28?8:id>=40&&id<=47?id-39:0;};
  const opaque=id=>id!==0&&id!==28&&id!==30;
  // Bounded multi-source BFS: eight levels, halo spans all possible contributors.
  const light=lighting?new Uint8Array(snapshot.length):null;
  if(light){const q=new Int32Array(snapshot.length);let head=0,tail=0;for(let i=0;i<snapshot.length;i++)if(snapshot[i]===30){light[i]=8;q[tail++]=i;}
   while(head<tail){const i=q[head++],n=light[i]-1;if(n<1)continue;const x=i%P,z=Math.floor(i/P)%P,y=Math.floor(i/(P*P));
    const put=j=>{if(!light[j]&&!opaque(snapshot[j]>=40&&snapshot[j]<=47?28:snapshot[j])){light[j]=n;q[tail++]=j;}};
    if(x>0)put(i-1);if(x<P-1)put(i+1);if(z>0)put(i-P);if(z<P-1)put(i+P);if(y>0)put(i-P*P);if(y<H-1)put(i+P*P);
   }
  }
  const lit=p=>light&&p[1]>=0&&p[1]<H?light[index(...p)]||0:0;
  function cornerAO(p,u,v,a,b){const p1=p.slice(),p2=p.slice(),p3=p.slice();p1[u]+=a;p2[v]+=b;p3[u]+=a;p3[v]+=b;const A=opaque(get(...p1)),B=opaque(get(...p2)),C=opaque(get(...p3));return A&&B?3:Number(A)+Number(B)+Number(C);}
  const top=new Int16Array(P*P).fill(-1);
  if(lighting)for(let z=-1;z<=S;z++)for(let x=-1;x<=S;x++)for(let y=H-1;y>=0;y--){const id=get(x,y,z);if(id&&id!==28&&id!==30){top[(z+pad)*P+x+pad]=y;break;}}
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
   // Cyclic axes ensure cross(u,v) points along positive normal.
   const u=(axis+1)%3,v=(axis+2)%3,nu=dims[u],nv=dims[v],mask=new Uint32Array(nu*nv);
   const shade=axis===1?(sign>0?1:.58):axis===0?(sign>0?.8:.72):(sign>0?.87:.76);
   for(let plane=0;plane<dims[axis];plane++){
    mask.fill(0);
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
     const p=[0,0,0];p[axis]=plane;p[u]=i;p[v]=j;const id=get(...p);
     if(!id||id===30)continue;p[axis]+=sign;const adjacent=get(...p);
     let wh=0,nh=0;
     if(id===28){const own=p.slice();own[axis]-=sign;const a=waterHeight(...own),b=waterHeight(...p);
      if(adjacent===28){if(axis===1||a<=b)continue;wh=a;nh=b;}
      else if(adjacent&&adjacent!==30)continue;
      else if(a!==8)wh=a;
     }else if(adjacent&&adjacent!==30&&adjacent!==28)continue;
     const sheltered=lighting&&p[1]<top[(p[2]+pad)*P+p[0]+pad];
     let ao=0;if(lighting&&id!==28){const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];for(let k=0;k<4;k++)ao|=cornerAO(p,u,v,...corners[k])<<(k*2);}
     mask[j*nu+i]=id+(sheltered?64:0)+(lit(p)<<7)+(ao<<11)+(wh<<19)+(nh<<23);exposed++;
    }
    for(let j=0;j<nv;j++)for(let i=0;i<nu;){
     const value=mask[j*nu+i];if(!value){i++;continue;}
     let w=1,h=1;const ao=(value>>>11)&255,wh=(value>>>19)&15,nh=(value>>>23)&15;while(!ao&&!wh&&i+w<nu&&mask[j*nu+i+w]===value)w++;
     outer:while(!ao&&!wh&&j+h<nv){for(let k=0;k<w;k++)if(mask[(j+h)*nu+i+k]!==value)break outer;h++;}
     for(let yy=0;yy<h;yy++)mask.fill(0,(j+yy)*nu+i,(j+yy)*nu+i+w);
     const id=value%64,ambient=Math.max(value&64?.32:1,((value>>>7)&15)/8*1.28);
     const corners=[[0,0],[w,0],[w,h],[0,h]],order=sign>0?[0,1,2,0,2,3]:[0,2,1,0,3,2],c=textured?[1,1,1]:colors[id]||[1,0,1];
     for(const k of order){
      const [a,b]=corners[k],p=[0,0,0];p[axis]=plane+(sign>0?1:0);p[u]=i+a;p[v]=j+b;
      if(wh){if(axis===1&&sign>0)p[1]=plane+wh/8;else if(axis!==1){const y0=u===1?i:j;p[1]=y0+(p[1]===y0?nh/8:wh/8);}}
      pos.push(p[0]+cx*S,p[1],p[2]+cz*S);const factor=shade*ambient*(1-((ao>>>(k*2))&3)*.18);rgb.push(c[0]*factor,c[1]*factor,c[2]*factor);
      // On vertical walls the texture V axis follows world height.
      uv.push(axis===0?b:a,axis===0?a:b);tiles.push(tile(id,axis,sign));
     }
     faces++;i+=w;
    }
   }
  }
  if(lighting)for(let z=0;z<S;z++)for(let x=0;x<S;x++)for(let y=1;y<H;y++)if(get(x,y,z)===30){
   const boxes=[{lo:[.43,0,.43],hi:[.57,.62,.57],c:[.62,.36,.13]},{lo:[.36,.60,.36],hi:[.64,.82,.64],c:[1,.67,.13]}];
   for(const b of boxes)for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
    const u=(axis+1)%3,v=(axis+2)%3,corners=[[0,0],[1,0],[1,1],[0,1]],order=sign>0?[0,1,2,0,2,3]:[0,2,1,0,3,2];
    for(const k of order){const [a,d]=corners[k],p=[0,0,0];p[axis]=(sign>0?b.hi:b.lo)[axis];p[u]=a?b.hi[u]:b.lo[u];p[v]=d?b.hi[v]:b.lo[v];pos.push(cx*S+x+p[0],y+p[1],cz*S+z+p[2]);rgb.push(...(textured?[1,1,1]:b.c));uv.push(a*.99,d*.99);tiles.push(30);}faces++;exposed++;
   }
  }
  return {positions:new Float32Array(pos),colors:new Float32Array(rgb),uv:new Float32Array(uv),tiles:new Float32Array(tiles),faces,exposed};
 }
 return {build};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelMesherFactory=gameForgeVoxelMesherFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelMesherFactory;
