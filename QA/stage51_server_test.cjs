'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const {createServer}=require('../TOOLS/serve_game.cjs');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=(p,headers={},method='GET')=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,path:p,method,headers},res=>{const data=[];res.on('data',c=>data.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(data)}));});req.on('error',reject);req.end();});
 try {
  let r=await request('/');assert.equal(r.status,200);assert(r.body.includes('SUNSET STATE'));assert(r.headers['content-type'].startsWith('text/html'));
  r=await request('/assets/speech/speech-engine.js?v=51');assert.equal(r.status,200);assert(r.headers['content-type'].startsWith('text/javascript'));
  r=await request('/assets/voices/manifest.json');assert.equal(r.status,200);assert(JSON.parse(r.body).lines);
  r=await request('/index.html',{Range:'bytes=0-14'});assert.equal(r.status,206);assert.equal(r.body.length,15);assert(r.headers['content-range'].startsWith('bytes 0-14/'));
  r=await request('/index.html',{Range:'bytes=999999999-'});assert.equal(r.status,416);
  r=await request('/index.html',{},'HEAD');assert.equal(r.status,200);assert.equal(r.body.length,0);
  r=await request('/.git/config');assert.equal(r.status,403);
  r=await request('/%2e%2e%2f%2e%2e%2fetc/passwd');assert([403,404].includes(r.status));
  r=await request('/missing-stage51-file.mp3');assert.equal(r.status,404);
  r=await request('/index.html',{},'POST');assert.equal(r.status,405);
  console.log('Stage 51 static server: 10 request cases passed.');
 } finally {await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
