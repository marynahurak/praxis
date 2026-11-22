const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..');const BUILD=process.env.MYOMAP_BUILD||path.join(__dirname,'build');
const src=fs.readFileSync(path.join(ROOT,'src/lib/myomap.ts'),'utf8');
function grab(fn){
  const i=src.indexOf(`export function ${fn}(`); const a=src.indexOf('const all = {',i);
  const b=src.indexOf('\n  return all[lang];',a);
  let body=src.slice(a+'const all = '.length,b).trim().replace(/;$/,'');
  body=body.replace(/\s+as\s+Record<string,\s*string>/g,'');
  return body;
}
const author={short:'Гурак М.'}; const D=JSON.parse(fs.readFileSync(path.join(ROOT,'src/data/myomap.json'),'utf8'));
const ui=eval('('+grab('getUi')+')');
const aen={short:'Hurak M.'};
const uiEn=(function(){const author=aen;return eval('('+grab('getUi')+')');})();
ui.en=uiEn.en;
const fb=eval('('+grab('getFb')+')');
const abbr=eval('('+src.slice(src.indexOf('export const ABBR')).split('= ')[1].split('};')[0]+'})');
fs.writeFileSync(path.join(BUILD,'ui.json'),JSON.stringify({ui,fb,abbr},null,1));
console.log(Object.keys(ui.uk).length, ui.en.cite, ui.uk.cite);
