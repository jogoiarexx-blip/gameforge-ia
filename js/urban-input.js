/* GameForge GF-018: contrato portatil de gamepad para acao urbana 3D.
 * Sem dependencia de navegador no nucleo: recebe um snapshot de getGamepads().
 * Reimplementacao original de um padrao de controle avaliado em Quebra no Tempo.
 */
(function(root){
'use strict';
function gameForgeUrbanInputFactory(){
 const clamp=(v)=>Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;
 function deadzone(value,threshold=.18){
  const v=clamp(value),a=Math.abs(v);
  return a<=threshold?0:Math.sign(v)*(a-threshold)/(1-threshold);
 }
 const neutral=()=>({connected:false,moveX:0,moveZ:0,aimX:0,aimZ:0,
  fire:false,interact:false,reload:false,pause:false,begin:false});
 function create(){
  let previous={interact:false,reload:false,pause:false,begin:false};
  let output=neutral();
  function clear(){previous={interact:false,reload:false,pause:false,begin:false};output=neutral();return output;}
  function poll(pads){
   let selected=null;
   try{for(const pad of pads||[]){if(pad?.connected&&pad.mapping==='standard'){selected=pad;break;}}}catch(_){return clear();}
   if(!selected)return clear();
   const axes=selected.axes||[],buttons=selected.buttons||[];
   const button=index=>{
    const b=buttons[index];return !!(b&&(b.pressed===true||Number(b.value)>.5));
   };
   let moveX=deadzone(axes[0]),moveZ=deadzone(axes[1]);
   if(button(14))moveX=-1;
   if(button(15))moveX=1;
   if(button(12))moveZ=-1;
   if(button(13))moveZ=1;
   const length=Math.hypot(moveX,moveZ);
   if(length>1){moveX/=length;moveZ/=length;}
   const current={interact:button(0),reload:button(2),pause:button(9),begin:button(0)||button(9)};
   output={connected:true,moveX,moveZ,aimX:deadzone(axes[2]),aimZ:deadzone(axes[3]),
    fire:button(7),interact:current.interact&&!previous.interact,
    reload:current.reload&&!previous.reload,pause:current.pause&&!previous.pause,
    begin:current.begin&&!previous.begin};
   previous=current;
   return output;
  }
  return {poll,clear,current:()=>output};
 }
 return {create,deadzone,neutral};
}
root.gameForgeUrbanInputFactory=gameForgeUrbanInputFactory;
if(typeof module!=='undefined')module.exports=gameForgeUrbanInputFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
