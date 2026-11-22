const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const root=__dirname;const types={'.html':'text/html','.js':'text/javascript','.json':'application/json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.statusCode=404;return r.end();}r.setHeader('content-type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(r);}).listen(4590);
const views=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage();
p.on('console',m=>console.log('console:',m.text()));p.on('pageerror',e=>console.log('err',e.message));
await p.goto('http://localhost:4590/render.html');await p.waitForFunction('window.ready===true',null,{timeout:120000});
fs.mkdirSync('out',{recursive:true});
fs.writeFileSync('out/names.json',JSON.stringify(await p.evaluate('window.names')));
for(const v of views){for(const mode of (process.argv[3]||'shade,id,skin,tendon').split(',')){const {url,W,H}=await p.evaluate(([v,m])=>window.renderView(v,m),[v,mode]);fs.writeFileSync(`out/${v.id}-${mode}.png`,Buffer.from(url.split(',')[1],'base64'));console.log(v.id,mode,W,H);}}
await b.close();srv.close();})();
