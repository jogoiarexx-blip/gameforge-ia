/* Instrumentacao somente da previa, executada no iframe sandbox. Não e exportada no jogo. */
(function(root){
 'use strict';
 function install(){
   'use strict';
   const prefix='gameforge-qa';
   let recentErrors=[];
   function err(value){recentErrors.push(String(value).slice(0,350));recentErrors=recentErrors.slice(-12);}
   addEventListener('error',e=>err(e.message||'Erro desconhecido'));
   addEventListener('unhandledrejection',e=>err(e.reason||'Promessa rejeitada'));
   function snapshot(){
     const canvas=document.querySelector('#game')||document.querySelector('canvas');
     if(!canvas)throw Error('Nenhum canvas encontrado no jogo.');
     let image;
     try{
       const thumb=document.createElement('canvas');
       thumb.width=Math.min(canvas.width||960,480);thumb.height=Math.min(canvas.height||540,270);
       const ctx=thumb.getContext('2d',{willReadFrequently:true});
       ctx.drawImage(canvas,0,0,thumb.width,thumb.height);
       image=thumb.toDataURL('image/png');
     }catch(e){throw Error('Captura indisponível: '+e.message);}
     const hud={};
     for(const id of ['health','score','ammo','level','timer','mission']){
       const el=document.getElementById(id);if(el)hud[id]=String(el.textContent||'').slice(0,120);
     }
     let telemetry=null;
     if(typeof window.__gameforgeTelemetry==='function'){
       try{telemetry=window.__gameforgeTelemetry();}catch(e){err('Telemetria: '+e.message);}
     }
     return {image,width:canvas.width,height:canvas.height,hud,telemetry,errors:recentErrors.slice()};
   }
   function key(name,down){
     if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','a','d','w','s'].includes(name))throw Error('Controle inválido');
     dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{key:name,bubbles:true}));
   }
   addEventListener('message',event=>{
     if(event.source!==parent)return;
     const q=event.data;
     if(!q||q.kind!==prefix+'-request'||typeof q.id!=='number'||q.id<0)return;
     try{
       let result={};
       switch(q.action){
         case 'ping': result={ready:true};break;
         case 'start': {const el=document.getElementById('start'); if(el)el.click();break;}
         case 'press': key(q.key,true);break;
         case 'release': key(q.key,false);break;
         case 'reset': {const el=document.getElementById('restart');if(el)el.click();break;}
         case 'capture':result=snapshot();break;
         default:throw Error('Ação não permitida');
       }
       parent.postMessage({kind:prefix+'-response',id:q.id,ok:true,data:result},'*');
     }catch(e){parent.postMessage({kind:prefix+'-response',id:q.id,ok:false,error:String(e.message).slice(0,250)},'*');}
   });
   parent.postMessage({kind:prefix+'-ready'},'*');
 }
 root.GameForgeQABridge={install};
 if(typeof module!=='undefined')module.exports=root.GameForgeQABridge;
})(typeof globalThis!=='undefined'?globalThis:this);
