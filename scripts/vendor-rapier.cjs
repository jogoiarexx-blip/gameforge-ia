/* Optional offline bundle: npm install && npm run vendor:rapier */
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const out=path.resolve(process.argv[2]||'vendor/rapier-offline.js');
const result=esbuild.buildSync({stdin:{contents:"import R from '@dimforge/rapier3d-compat'; globalThis.GameForgeRapier=R;",resolveDir:process.cwd()},bundle:true,format:'iife',platform:'browser',target:'es2020',minify:true,write:false,legalComments:'inline'});
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,result.outputFiles[0].text);
const dir=path.dirname(require.resolve('@dimforge/rapier3d-compat'));
const candidates=[dir,path.dirname(dir)];
let license=null;for(const d of candidates){for(const n of ['LICENSE','LICENSE.txt','LICENSE-MIT','LICENSE-APACHE']){const file=path.join(d,n);if(fs.existsSync(file)){license=(license||'')+n+'\n'+fs.readFileSync(file,'utf8')+'\n';}}}
if(!license){fs.unlinkSync(out);throw Error('Licença Rapier não encontrada; verificar pacote antes de distribuir.');}
fs.writeFileSync(path.join(path.dirname(out),'RAPIER-LICENSE.txt'),license);
console.log(out+': '+fs.statSync(out).size+' bytes (opcional, fora do export padrão)');
