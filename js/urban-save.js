/* GF-025: persistencia validada dos jogos urbanos.
 * A escrita e preparada numa chave temporaria, conferida e promovida.
 * A chave principal permanece a mesma das versoes anteriores.
 */
(function(root){
'use strict';
function gameForgeUrbanSaveFactory(){
 function create(accessStorage,key,restore){
  if(typeof key!=='string'||!key||typeof restore!=='function')throw Error('Contrato de save urbano invalido');
  const pending=key+':pending',backup=key+':backup';
  const valid=raw=>{try{return raw?restore(JSON.parse(raw))||null:null;}catch(_){return null;}};
  const storage=()=>typeof accessStorage==='function'?accessStorage():accessStorage;
  function read(){
   try{
    const target=storage();
    return valid(target?.getItem(key))||valid(target?.getItem(backup));
   }catch(_){return null;}
  }
  function write(data){
   let current=null;
   try{
    const raw=JSON.stringify(data);
    if(typeof raw!=='string'||raw.length>200000)return false;
    current=storage();
    if(!current||typeof current.setItem!=='function'||typeof current.getItem!=='function')return false;
    current.setItem(pending,raw);
    if(current.getItem(pending)!==raw)return false;
    // Preserva a versao anterior somente quando validada pelo mesmo schema.
    // Falta de quota para o backup nao impede uma gravacao principal atomica.
    try{
     const previous=current.getItem(key);
     if(valid(previous)){
      current.setItem(backup,previous);
      if(current.getItem(backup)!==previous)return false;
     }
    }catch(_){/* backup oportunista; chave principal ainda nao foi alterada */}
    current.setItem(key,raw);
    if(current.getItem(key)!==raw)return false;
    try{current.removeItem?.(pending);}catch(_){}
    return true;
   }catch(_){return false;}
  }
  function remove(){
   try{
    const target=storage();
    target?.removeItem(key);target?.removeItem(pending);target?.removeItem(backup);
    return true;
   }catch(_){return false;}
  }
  return {read,write,remove,key};
 }
 return {create};
}
root.gameForgeUrbanSaveFactory=gameForgeUrbanSaveFactory;
if(typeof module!=='undefined')module.exports=gameForgeUrbanSaveFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
