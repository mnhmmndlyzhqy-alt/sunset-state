/* SUNSET STATE | Stage 38/105 | conservative mesh LOD for landscape geometry.
 * Works only with the authored meshes already in the cumulative game.
 * WebGL2 static-render proxies, not physics objects, persistent game state or save data.
 * Existing premium car/pedestrian/animal LODs are deliberately left unchanged.
 * Opt out: ?stage38LodOff=1 or __SUNSET_STAGE38_LOD_OFF=true.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
 const TAU=Math.PI*2;
 const EXPANSION_CACHE=new WeakMap();
 const names={urban_crown:'urban_crown_lod38',urban_frond:'urban_frond_lod38',
   sphere:'sphere_lod38',cylinder:'cylinder_lod38'};
 const trianglesHigh={urban_crown:256,urban_frond:80,sphere:1216,cylinder:56};
 const trianglesLow={urban_crown:100,urban_frond:40,sphere:168,cylinder:32};
 const stats={stage:38,expansions:0,cacheReuses:0,proxiesCreated:0,highParts:0,lowParts:0,
   worldMutations:0,colliderMutations:0,saveChanges:0,byKind:{},
   theoreticalFarTrianglesBefore:0,theoreticalFarTrianglesAfter:0,
   nativeGpuVerified:false,fullHd50FpsVerified:false};
 function enabled(){return !H.quality51?.fixed&&globalThis.__SUNSET_STAGE38_LOD_OFF!==true&&
   !(typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
     new URLSearchParams(location.search||'').get('stage38LodOff')==='1');}
 // Only surface-level assets; never touch interiors, buildings, special models,
 // emissive signs, characters, physics, or user-provided vehicle GLBs.
 function kind(o){
   if(!o||o.layer!==4||o.lodMax>0||o.lodMin>0||o.stage38Proxy||o.fallbackOnly||
       !Number.isFinite(o.x)||!Number.isFinite(o.z)||!Number.isFinite(o.w)||
       !Number.isFinite(o.h)||!Number.isFinite(o.d)||o.w<=0||o.h<=0||o.d<=0)return null;
   if((o.shape==='urban_crown'||o.shape==='urban_frond')&&o.material==='foliage')return o.shape;
   if(o.shape==='sphere'&&o.material==='foliage')return 'sphere';
   if(o.shape==='cylinder'&&o.material==='bark')return 'cylinder';
   return null;
 }
 function threshold(o,k){
   const maxSize=Math.max(o.w,o.h,o.d),minSize=Math.min(o.w,o.h,o.d);
   const factor=k==='cylinder'?29:k==='urban_frond'?31:32;
   const base=k==='cylinder'?105:k==='urban_frond'?105:138;
   const max=k==='cylinder'?320:k==='urban_frond'?265:410;
   // Size-dependent angular silhouette: taller trees hold authored detail longer.
   const d=Math.max(base,Math.min(max,Math.round(maxSize*factor+75)));
   const cap=Number.isFinite(o.visibilityCap)&&o.visibilityCap>0?o.visibilityCap:
      (o.h>16?1700:o.h>5?1100:830);
   // Allow the full 84m complementary-dither overlap plus a safety margin.
   return cap-d>125&&minSize>.025?d:0;
 }
 // Returns a new rendering-only array. All untouched source objects retain their
 // exact identity; eligible models are represented by two render proxies only.
 function expandStatic(source){
   if(!enabled()||!Array.isArray(source))return source;
   // Stable proxy identities across the old Stage37 numeric-index A/B paths.
   // Rebuild only when the canonical world array length changes; no writes to it.
   const prior=EXPANSION_CACHE.get(source);
   if(prior && prior.sourceLength===source.length){stats.cacheReuses++;return prior.renderObjects;}
   const out=[];let converted=0,high=0,low=0;const byKind={};let trianglesA=0,trianglesB=0;
   for(const o of source){
     const k=kind(o),at=k?threshold(o,k):0;
     if(!at){out.push(o);continue;}
     const common={stage38Source:o,stage38Proxy:true,stage38Kind:k,stage38Switch:at};
     out.push({...o,...common,stage38Tier:'high',lodMax:at});
     out.push({...o,...common,stage38Tier:'low',shape:names[k],lodMin:at});
     converted++;high++;low++;byKind[k]=(byKind[k]||0)+1;
     trianglesA+=trianglesHigh[k];trianglesB+=trianglesLow[k];
   }
   stats.expansions++;stats.proxiesCreated+=converted*2;
   stats.highParts+=high;stats.lowParts+=low;
   stats.byKind=byKind;stats.theoreticalFarTrianglesBefore=trianglesA;
   stats.theoreticalFarTrianglesAfter=trianglesB;
   stats.lastSourceCount=source.length;stats.lastExpandedCount=out.length;
   EXPANSION_CACHE.set(source,{sourceLength:source.length,renderObjects:out});
   return out;
 }
 function crownTriangles(){
   const n=10,rows=6,out=[];
   const at=(row,col)=>{
     const p=row*Math.PI/rows,t=TAU*col/n,s=Math.sin(p);
     const r=.46+s*(.078*Math.sin(t*5+p*2)+.054*Math.cos(t*7-p*3)+.035*Math.sin(t*3+p*4));
     return [r*s*Math.cos(t),.48*Math.cos(p),r*s*Math.sin(t)];
   };
   for(let row=0;row<rows;row++)for(let col=0;col<n;col++){
     const a=at(row,col),b=at(row,col+1),c=at(row+1,col+1),d=at(row+1,col);
     if(row>0)out.push([a,c,b]);
     if(row<rows-1)out.push([a,d,c]);
   }
   return out;
 }
 function sphereTriangles(){
   const n=12,rows=8,out=[];
   const at=(j,i)=>{const phi=j*Math.PI/rows,ang=i*TAU/n;
     return [.5*Math.sin(phi)*Math.cos(ang),.5*Math.cos(phi),.5*Math.sin(phi)*Math.sin(ang)];};
   for(let j=0;j<rows;j++)for(let i=0;i<n;i++){
     const a=at(j,i),b=at(j,i+1),c=at(j+1,i+1),d=at(j+1,i);
     if(j>0)out.push([a,c,b]);
     if(j<rows-1)out.push([a,d,c]);
   }
   return out;
 }
 function frondTriangles(source){
   const out=[];if(!Array.isArray(source)||source.length%5!==0)return out;
   // Original frond geometry emits five triangles per radial cluster. Keep
   // alternating whole clusters: leaf tips and two-sided coverage are retained.
   for(let i=0;i<source.length;i+=10)for(let j=0;j<5&&i+j<source.length;j++)out.push(source[i+j]);
   return out;
 }
 function cylinderTriangles(){
   const n=8,out=[];
   for(let i=0;i<n;i++){
     const a=i*TAU/n,b=(i+1)*TAU/n;
     const ca=Math.cos(a)*.5,sa=Math.sin(a)*.5,cb=Math.cos(b)*.5,sb=Math.sin(b)*.5;
     const A=[ca,-.5,sa],B=[cb,-.5,sb],C=[cb,.5,sb],D=[ca,.5,sa];
     out.push([A,C,B],[A,D,C],[[0,.5,0],C,D],[[0,-.5,0],A,B]);
   }
   return out;
 }
 H.stage38AdaptiveLOD={enabled,kind,threshold,expandStatic,crownTriangles,sphereTriangles,
   frondTriangles,cylinderTriangles,trianglesHigh,trianglesLow,names,stats,
   version:'38.0',note:'WebGL2 render-only LOD. Existing GLBs and world/saves untouched.'};
})(Heatline);
