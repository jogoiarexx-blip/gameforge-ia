/* GF-VOXEL-12: bounded local light shader, compatible with the atlas shader. */
function gameForgeVoxelLightingFactory(){
 'use strict';
 const MAX=8,RADIUS=8;
 function strength(x,y,z,points){let value=0;for(const p of points.slice(0,MAX)){const d=Math.hypot(x-p[0],y-p[1],z-p[2]);value=Math.max(value,Math.max(0,1-d/RADIUS)**2);}return value;}
 function install(T,material){
  const points=Array.from({length:MAX},()=>new T.Vector3(0,-1000,0)),count={value:0},locations={value:points};
  const before=material.onBeforeCompile,cache=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,renderer){
   before.call(this,shader,renderer);
   shader.uniforms.gfLightCount=count;shader.uniforms.gfLightPositions=locations;
   shader.vertexShader='varying vec3 gfWorldPosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n gfWorldPosition=position;');
   shader.fragmentShader='varying vec3 gfWorldPosition; uniform int gfLightCount; uniform vec3 gfLightPositions[8];\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',[
    '#include <color_fragment>',
    'float gfLight=0.0;',
    'for(int i=0;i<8;i++){if(i>=gfLightCount) break;float d=length(gfWorldPosition-gfLightPositions[i]);float a=max(0.0,1.0-d/8.0);gfLight=max(gfLight,a*a);}',
    'diffuseColor.rgb *= vec3(1.0)+gfLight*vec3(2.6,1.65,0.8);'
   ].join('\n'));
  };
  material.customProgramCacheKey=()=>cache+'-gf-torch-v1';
  material.needsUpdate=true;
  return {update(list){count.value=Math.min(MAX,list.length);for(let i=0;i<count.value;i++)points[i].set(...list[i]);},snapshot:()=>({active:count.value,max:MAX,radius:RADIUS})};
 }
 return {strength,install,MAX,RADIUS};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelLightingFactory=gameForgeVoxelLightingFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelLightingFactory;
