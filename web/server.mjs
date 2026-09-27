import http from 'node:http';
import {createReadStream,existsSync} from 'node:fs';
import {stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(process.env.MOTION_SITE_ROOT || (existsSync(path.join(project,'_site'))?path.join(project,'_site'):project));
const base=(process.env.MOTION_BASE_PATH||'/').replace(/\/?$/,'/');
const port=Number(process.env.MOTION_LAB_PORT||8787);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.csv':'text/csv; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(!route.startsWith(base)){res.writeHead(404);res.end();return;}
    route='/'+route.slice(base.length);
    if(route.split('/').some(part=>part.startsWith('.'))){res.writeHead(403);res.end();return;}
    if(route.endsWith('/'))route+='index.html';
    const file=await realpath(path.resolve(root,'.'+route));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const info=await stat(file);if(!info.isFile())throw Error('not file');
    const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
    let start=0,end=info.size-1,status=200;
    if(req.headers.range){
      const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if(!m||Number(m[1])>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
      start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end;
      if(end<start){res.writeHead(416);res.end();return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);
    if(req.method==='HEAD'||info.size===0){res.end();return;}
    createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Layered Motion: http://127.0.0.1:${port}${base}`));
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
