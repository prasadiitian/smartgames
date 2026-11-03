import puppeteer from 'puppeteer-core'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const dist='C:/Prasad_digital/smartgames/dist', tag=process.argv[2]||'a';
const s=http.createServer((q,r)=>{let p=q.url.split('?')[0];if(p==='/')p='/index.html';const f=path.join(dist,p);if(!fs.existsSync(f)){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(f)]||'text/plain'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>s.listen(0,'127.0.0.1',r));
const b=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
const pg=await b.newPage(); await pg.setViewport({width:390,height:760,hasTouch:true});
await pg.goto(`http://127.0.0.1:${s.address().port}/`); await pg.waitForSelector('#helpOk'); await pg.click('#helpOk');
await pg.waitForFunction('window.__bondwork');
await pg.evaluate(()=>{const s=window.__bondwork.state; s.energy=900; s.totalEnergy=900; s.runEnergy=900; window.__bondwork.tick(1);});
for(let i=0;i<12;i++){await pg.click('#btnTap');await new Promise(r=>setTimeout(r,120));}
await new Promise(r=>setTimeout(r,900));
const sh=async(n)=>pg.screenshot({path:`C:/Prasad_digital/smartgames/design/games/bw-${tag}-${n}.png`});
await sh('lab');
await pg.click('#tabs button[data-tab=build]'); await new Promise(r=>setTimeout(r,300)); await sh('build');
await b.close(); s.close();
