/* Cache de renderização autoral: orçamento de memória, LRU e descarte seguro. */
(function(root){
function gameForgeRenderCacheFactory(options){
 'use strict';
 options=options||{};
 const limit=(value,fallback,max)=>Number.isFinite(value)?Math.max(1,Math.min(max,Math.floor(value))):fallback;
 const maxEntries=limit(options.maxEntries,64,1024),maxBytes=limit(options.maxBytes,2097152,33554432);
 const items=new Map();let bytes=0,hits=0,misses=0,evictions=0,rejected=0;
 function remove(key,eviction=false){
  const entry=items.get(key);if(!entry)return;
  items.delete(key);bytes-=entry.bytes;if(eviction)evictions++;
  try{entry.dispose?.(entry.value);}catch{/* Falha de descarte não pode interromper gameplay. */}
 }
 function get(key){
  const entry=items.get(key);if(!entry){misses++;return undefined;}
  hits++;items.delete(key);items.set(key,entry);return entry.value;
 }
 function put(key,value,size,dispose){
  if(typeof key!=='string'||key.length>300||value===undefined||!Number.isSafeInteger(size)||size<1||size>maxBytes){rejected++;return false;}
  const previous=items.get(key);
  if(previous?.value===value){items.delete(key);bytes-=previous.bytes;dispose=dispose||previous.dispose;}
  else remove(key);
  while(items.size>=maxEntries||bytes+size>maxBytes)remove(items.keys().next().value,true);
  items.set(key,{value,bytes:size,dispose:typeof dispose==='function'?dispose:null});bytes+=size;return true;
 }
 function clear(){for(const key of [...items.keys()])remove(key);}
 function snapshot(){return {entries:items.size,bytes,maxEntries,maxBytes,hits,misses,evictions,rejected};}
 return {get,put,clear,snapshot};
}
root.gameForgeRenderCacheFactory=gameForgeRenderCacheFactory;
if(typeof module!=='undefined')module.exports=gameForgeRenderCacheFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
