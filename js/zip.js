/* ZIP sem compactacao, 100% local. Compatível com navegadores modernos. */
(function(root){
  'use strict';
  const enc=new TextEncoder();
  const crcTable=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}
  function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
  function u16(v){return[v&255,(v>>>8)&255];}
  function u32(v){return[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];}
  function zipFiles(files){
    const local=[],center=[];let offset=0;let count=0;
    for(const [name,src] of Object.entries(files)){
      if(!name||name.includes('..')||name.startsWith('/')||name.includes('\\'))throw new Error('Nome de arquivo inseguro');
      const filename=enc.encode(name),data=src instanceof Uint8Array?src:enc.encode(String(src));
      if(filename.length>65535||data.length>30_000_000)throw new Error('Arquivo muito grande');
      const crc=crc32(data),size=data.length;
      const lh=new Uint8Array([80,75,3,4,...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(size),...u32(size),...u16(filename.length),...u16(0)]);
      local.push(lh,filename,data);
      const ch=new Uint8Array([80,75,1,2,...u16(20),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(size),...u32(size),...u16(filename.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]);
      center.push(ch,filename);
      offset+=lh.length+filename.length+size;count++;
    }
    const csize=center.reduce((n,b)=>n+b.length,0);
    if(offset+csize>0xffffffff||count>65535)throw new Error('ZIP muito grande');
    const end=new Uint8Array([80,75,5,6,...u16(0),...u16(0),...u16(count),...u16(count),...u32(csize),...u32(offset),...u16(0)]);
    return new Blob([...local,...center,end],{type:'application/zip'});
  }
  root.GameForgeZip={zipFiles};
  if(typeof module!=='undefined')module.exports=root.GameForgeZip;
})(typeof globalThis!=='undefined'?globalThis:this);
