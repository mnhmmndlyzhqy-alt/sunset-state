#!/usr/bin/env node
'use strict';
// Dependency-free loopback server for the existing static game and voice assets.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=fs.realpathSync(path.resolve(__dirname,'..'));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.mp3':'audio/mpeg','.wav':'audio/wav','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};
function reply(res,status,body){res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(body);}
function handler(req,res){
  if(!['GET','HEAD'].includes(req.method)){reply(res,405,'GET or HEAD only');return;}
  let decoded;try{decoded=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{reply(res,400,'Invalid URL');return;}
  if(decoded.includes('\0')||decoded.includes('\\')||decoded.split('/').some(p=>p.startsWith('.'))){reply(res,403,'Path not available');return;}
  let file=path.resolve(root,'.'+decoded);
  if(file!==root&&!file.startsWith(root+path.sep)){reply(res,403,'Path not available');return;}
  try{
    if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    file=fs.realpathSync(file);
    if(!file.startsWith(root+path.sep)){reply(res,403,'Path not available');return;}
    const stat=fs.statSync(file);if(!stat.isFile()){reply(res,404,'File not found');return;}
    const headers={'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
    let start=0,end=stat.size-1,status=200;
    if(req.headers.range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});res.end();return;}
      if(!match[1])start=Math.max(0,stat.size-Number(match[2]));
      else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});res.end();return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length']=stat.size?end-start+1:0;
    res.writeHead(status,headers);
    if(req.method==='HEAD'||!stat.size){res.end();return;}
    fs.createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
  }catch{reply(res,404,'File not found');}
}
function createServer(){return http.createServer(handler);}
if(require.main===module){
  const requested=Number(process.argv[2]||8765),port=Number.isInteger(requested)&&requested>0&&requested<65536?requested:8765;
  const server=createServer();
  server.on('error',err=>{console.error(err.code==='EADDRINUSE'?`Port ${port} is already in use. Close the older SUNSET STATE server and run again.`:err.message);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(`SUNSET STATE Stage 51\nhttp://127.0.0.1:${port}/?build=51\nKeep this window open while playing. Ctrl+C stops the server.`));
}
module.exports={createServer};
