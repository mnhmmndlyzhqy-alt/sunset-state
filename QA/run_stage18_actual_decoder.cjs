'use strict';
/* Tests the real production GLTF decoder against both new assets, with fake GL API.
 * Checks actual JS/gzip/glTF decoding, vertex buffers, skin/animation wiring.
 * Does not certify the WebGL shader or pixels. */
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const {ctx}=require('./stage05_bootstrap.cjs');
ctx.setTimeout=setTimeout;ctx.clearTimeout=clearTimeout;
ctx.DecompressionStream=DecompressionStream;ctx.Response=Response;ctx.Blob=Blob;ctx.TextDecoder=TextDecoder;
ctx.createImageBitmap=async()=>({width:512,height:256,close(){}});
const methodNames=['createBuffer','bindBuffer','bufferData','createVertexArray','bindVertexArray','disableVertexAttribArray','enableVertexAttribArray',
 'vertexAttribPointer','createTexture','bindTexture','texImage2D','texParameteri','generateMipmap','pixelStorei','getParameter','texParameterf',
 'useProgram','uniform1i','uniform1f','createShader','shaderSource','compileShader','getShaderParameter','getShaderInfoLog','createProgram',
 'attachShader','linkProgram','getProgramParameter','getProgramInfoLog','deleteShader','deleteProgram','getUniformLocation','getExtension'];
let buffers=0,vertices=0;
const mock={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
 ARRAY_BUFFER:34962,ELEMENT_ARRAY_BUFFER:34963,STATIC_DRAW:35044,UNSIGNED_BYTE:5121,UNSIGNED_SHORT:5123,UNSIGNED_INT:5125,FLOAT:5126,
 TEXTURE_2D:3553,TEXTURE0:33984,RGBA:6408,LINEAR_MIPMAP_LINEAR:9987,LINEAR:9729,TEXTURE_MAG_FILTER:10240,
 TEXTURE_MIN_FILTER:10241,TEXTURE_WRAP_S:10242,TEXTURE_WRAP_T:10243,REPEAT:10497,UNPACK_FLIP_Y_WEBGL:37440,
 createBuffer:()=>{buffers++;return {}},createVertexArray:()=>{vertices++;return {}},createTexture:()=>({}),
 createShader:()=>({}),getShaderParameter:()=>true,getProgramParameter:()=>true,createProgram:()=>({}),
 getUniformLocation:(_p,name)=>name,getExtension:()=>null,getParameter:()=>4};
for(const name of methodNames)if(!mock[name])mock[name]=()=>{};
const gl=mock,Renderer=ctx.__Stage18OriginalWildlifeRenderer;
const r=new Renderer(gl);
for(const key of ['crocodile_far','crocodile_mid']){
 vm.runInContext(fs.readFileSync(path.join(root,'assets',key+'.js'),'utf8'),ctx,{timeout:10000,filename:key+'.js'});
 r.ensure(key);
}
const wait=()=>new Promise(resolve=>setTimeout(resolve,75));
(async()=>{
 for(let i=0;i<250&&(!r.assets.has('crocodile_far')||!r.assets.has('crocodile_mid'));i++)await wait();
 const result={passed:true,assets:{},gpu:'mock API only',decode:'production GltfAsset43 via production Wildlife43Renderer.pump'};
 for(const name of ['crocodile_mid','crocodile_far']){
  const m=r.assets.get(name);
  if(!m?.ready){result.passed=false;result.assets[name]={error:m?.failed?'decoder failed':'asset not ready'};continue;}
  result.assets[name]={triangles:m.stats.triangles,drawables:m.stats.drawables,clips:m.stats.clips,textureImages:m.stats.textureImages,
    drawNodes:m.drawNodes.length,skins:m.skinData.map(s=>s.joints.length),ready:m.ready};
 }
 const exp=JSON.parse(fs.readFileSync(path.join(root,'QA/STAGE18_LOD_ASSET_MANIFEST.json'),'utf8'));
 for(const key of ['mid','far']){
  const got=result.assets['crocodile_'+key],expected=exp[key];
  if(got.triangles!==expected.triangles_lod||got.drawables!==expected.draw_meshes||got.clips!==5||got.textureImages!==9)result.passed=false;
 }
 result.buffersCreated=buffers;result.vertexArrays=vertices;
 fs.writeFileSync(path.join(root,'QA/STAGE18_ACTUAL_DECODER.json'),JSON.stringify(result,null,2));
 console.log(result.passed?'PASS':'FAIL','actual GLB decoder',JSON.stringify(result.assets));
 process.exit(result.passed?0:1);
})().catch(e=>{console.error(e.stack);process.exit(1)});
