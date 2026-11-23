/* SUNSET STATE 34/35 — low-risk GPU instance packing, material specular AA,
 * bounded closest-light selection and cached procedural audio transients.
 * This module intentionally does not add/remove models, collisions or textures.
 * Full rollback for code comparison: ?stage34PolishOff=1.
 * Native hardware GPU / 1920x1080 >=50 FPS still requires a separate real test.
 */
var Heatline = globalThis.Heatline || {};
(function (H) { 'use strict';
  const stats={stage:34, enabled:true, shaderPatched:false, shaderAttempts:0,
    lightSelections:0, lightCandidates:0, maxLights:12,
    audioCacheAllocations:0, audioCacheHits:0, audioCachedSamples:0,
    newColliders:0, newModels:0, newTextures:0, nativeGpuVerified:false, fullHd50FpsVerified:false};
  const off=()=>globalThis.__SUNSET_STAGE34_POLISH_OFF===true ||
    (typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
      new URLSearchParams(location.search||'').get('stage34PolishOff')==='1');
  const enabled=()=>!off();
  // Same ordering as the former .map().sort().slice(0,12), including priority
  // and original index for stable ties. At most 12 entries are kept per frame.
  function selectLights(lights,c,limit=12){
    if(!Array.isArray(lights)||!c||!Number.isInteger(limit)||limit<1)return [];
    const kept=[];
    const compare=(a,b)=>((b.l.priority||0)-(a.l.priority||0)) || a.dist-b.dist || a.i-b.i;
    for(let i=0;i<lights.length;i++){
      const l=lights[i];
      if(!l||![l.x,l.z,c.x,c.z].every(Number.isFinite)){
        // Preserve historical semantics on malformed data instead of guessing.
        return lights.map(x=>({l:x,dist:(x.x-c.x)**2+(x.z-c.z)**2}))
          .sort((a,b)=>(b.l.priority||0)-(a.l.priority||0)||a.dist-b.dist).slice(0,limit);
      }
      const row={l,dist:(l.x-c.x)**2+(l.z-c.z)**2,i};
      if(kept.length===limit&&compare(row,kept[kept.length-1])>=0)continue;
      let pos=0;
      while(pos<kept.length&&compare(row,kept[pos])>=0)pos++;
      if(pos<limit){kept.splice(pos,0,row);if(kept.length>limit)kept.pop();}
    }
    stats.lightSelections++;stats.lightCandidates+=lights.length;
    return kept;
  }
  // 4 deterministic variants per sound, allocated on first use only.
  // The AudioBuffer belongs to its AudioContext, so context recreation is safe.
  const soundCache=new WeakMap(),VARIANTS=4;
  function noiseBuffer(ctx,kind,duration){
    if(!enabled()||!ctx||typeof ctx.createBuffer!=='function'||!Number.isFinite(ctx.sampleRate)||
      !Number.isFinite(duration)||duration<=0||duration>1||!kind)return null;
    let bank=soundCache.get(ctx);if(!bank){bank=new Map();soundCache.set(ctx,bank);}
    const count=Math.ceil(ctx.sampleRate*duration);
    const key=kind+':'+count+':'+ctx.sampleRate;
    let family=bank.get(key);
    if(!family){family={next:0,buffers:[null,null,null,null]};bank.set(key,family);}
    const variant=family.next++%VARIANTS;
    if(family.buffers[variant]){stats.audioCacheHits++;return family.buffers[variant];}
    const b=ctx.createBuffer(1,count,ctx.sampleRate),x=b.getChannelData(0);
    let seed=(0x9e3779b9^(variant+1)*0x6d2b79f5)>>>0;
    for(let i=0;i<kind.length;i++)seed=(Math.imul(seed^kind.charCodeAt(i),16777619))>>>0;
    for(let i=0;i<x.length;i++){
      seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;
      const noise=(seed/4294967296)*2-1;
      if(kind==='pulse-shot'){
        x[i]=noise*Math.exp(-i/ctx.sampleRate*37)*.50;
      } else {
        const progress=i/x.length, decay=Math.pow(1-progress,kind==='glass'?2.2:3.5);
        const ring=kind==='glass'?(1+.27*Math.sin(progress*120*Math.PI)):1;
        x[i]=noise*decay*ring;
      }
    }
    family.buffers[variant]=b;
    stats.audioCacheAllocations++;stats.audioCachedSamples+=count;
    return b;
  }
  // Toksvig-style roughness floor from screen-space normal variance;
  // avoids glittering close-up clearcoat and glass at oblique angles.
  // Underlying authored color, textures, alpha and material IDs are untouched.
  const shaderAnchor='          float gloss=1.0-rough;';
  const shaderExtra=`          if(uQuality>=.78 && (glassMat||matId==3.0||matId==18.0||matId==22.0)){
            float stage34Variance=min(.34,max(dot(dFdx(n),dFdx(n)),dot(dFdy(n),dFdy(n))));
            rough=clamp(sqrt(rough*rough+.32*stage34Variance),rough,.98);
          }\n`;
  function shader(source){
    stats.shaderAttempts++;
    if(!enabled()||typeof source!=='string')return source;
    const pos=source.indexOf(shaderAnchor);
    if(pos<0||source.indexOf(shaderAnchor,pos+1)>=0)return source;
    stats.shaderPatched=true;
    return source.slice(0,pos)+shaderExtra+source.slice(pos);
  }
  if(typeof H.city20Stage08MaterialFragment==='function'){
    const old=H.city20Stage08MaterialFragment;
    H.city20Stage08MaterialFragment=function stage34Materials(src){return shader(old(src));};
  }
  H.stage34RenderSoundPolish={off,enabled,stats,selectLights,noiseBuffer,shader,
    shaderAnchor,version:'34.0',audioVariants:VARIANTS};
})(Heatline);
