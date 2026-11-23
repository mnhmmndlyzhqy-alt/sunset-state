/* SUNSET STATE quality recovery 6/7: preserve lighting and mesh instances while
 * reducing per-frame allocations. No geometry, NPC or resolution changes.
 * A/B: ?performanceRecovery6Off=1 (or __SUNSET_DISABLE_PERFORMANCE_RECOVERY6).
 */
var Heatline=globalThis.Heatline||{};
(function(H){
 'use strict';
 const palette=new Map(),maxPalette=2048;
 const stats={streetLightQueries:0,streetLightCandidates:0,
  colorLookups:0,colorCacheHits:0,colorCacheMisses:0,packInvocations:0};
 function disabled(){
  return globalThis.__SUNSET_DISABLE_PERFORMANCE_RECOVERY6===true||
    (typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
     new URLSearchParams(location.search).has('performanceRecovery6Off'));
 }
 function decodeColor(color){
  stats.colorLookups++;
  if(palette.has(color)){stats.colorCacheHits++;return palette.get(color);}
  // Match the original GLRenderer.pack parseInt behavior, including malformed inputs.
  const raw=parseInt(color.charAt(0)==='#'?color.substring(1):color,16);
  if(palette.size>=maxPalette)palette.clear();
  palette.set(color,raw);stats.colorCacheMisses++;
  return raw;
 }
 function activeDecoder(){
  if(disabled())return null;
  stats.packInvocations++;
  return decodeColor;
 }
 function nearestStreetLights(lights,focus){
  if(disabled())return lights.filter(l=>l.radius>0&&Math.hypot(l.x-focus.x,l.z-focus.z)<165)
    .sort((a,b)=>((a.x-focus.x)**2+(a.z-focus.z)**2)-((b.x-focus.x)**2+(b.z-focus.z)**2)).slice(0,10);
  stats.streetLightQueries++;
  // An exact stable top-10 insertion selection, without sorting/allocating a
  // potentially much larger full candidate list on EVERY rendered frame.
  const top=[],distances=[],limit=165*165;
  for(let i=0;i<lights.length;i++){
   const light=lights[i];if(!(light.radius>0))continue;
   const dx=light.x-focus.x,dz=light.z-focus.z;
   // The existing rule uses Math.hypot, and this squared comparison is the
   // same for finite coordinates (NaN/Infinity remain rejected).
   const distance=dx*dx+dz*dz;
   if(!(distance<limit))continue;
   stats.streetLightCandidates++;
   let at=top.length;
   // Strict > preserves the original stable order for equal distances.
   while(at>0 && distances[at-1]>distance)at--;
   if(at>=10)continue;
   top.splice(at,0,light);distances.splice(at,0,distance);
   if(top.length>10){top.pop();distances.pop();}
  }
  return top;
 }
 function report(game){
  const canvas=game?.renderer?.canvas,perf=globalThis.performance;
  const width=canvas?.width??null,height=canvas?.height??null;
  const native=width>=1920&&height>=1080&&game?.visualMode450==='native1080'&&
    game?.renderer?.renderNative475===true&&game?.renderer?.name==='WebGL2 instancing / GLSL';
  return {part:6,build:'SUNSET STATE',timestamp:new Date().toISOString(),
    browser:typeof navigator!=='undefined'?navigator.userAgent:null,
    currentRenderer:game?.renderer?.name??null,renderResolution:[width,height],
    measuredCurrentFps:game?.fps??null,nativeFullHd:native,
    target:{width:1920,height:1080,fps:50},
    cpuEmaMs:{simulation:game?.updateCostMs??null,dynamicGeometry:game?.geometryCostMs??null,
      rendererDraw:game?.renderCostMs??null,frame:game?.frameTimeMs??null},
    crowdCount:game?.pedestrians?.length??null,staticGeometry:game?.world?.boxes?.length??null,
    optimizationEnabled:!disabled(),operationCounts:{...stats},
    browserJsHeapMB:perf?.memory?.usedJSHeapSize?+(perf.memory.usedJSHeapSize/1e6).toFixed(2):null,
    gpuFrameTimeMs:null,instantaneousTargetObserved:!!(native&&Number.isFinite(game?.fps)&&game.fps>=50),
    verifiedSustained50Fps1080p:false,
    caveat:'CPU frame-time averages and current FPS are browser readings, not a repeatable benchmark. GPU timings require a supported GPU profiler; do not extrapolate from Node tests.'};
 }
 function download(game){
  if(typeof document==='undefined'||!game)return false;
  const data=JSON.stringify(report(game),null,2);
  const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='SUNSET_STATE_RECOVERY06_PERFORMANCE.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);return true;
 }
 H.performanceRecovery6={disabled,decodeColor,activeDecoder,nearestStreetLights,report,download,stats};
})(Heatline);
