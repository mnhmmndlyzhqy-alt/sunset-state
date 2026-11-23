/* SUNSET STATE 4.7.9 | Visual continuity and no-new-draw-call terrain finish.
 * Persistent checkpoint: requires 4.7.8; changes no roads, collision, save schema,
 * buildings, vegetation placement, wildlife or internal resolution policy.
 * The terrain finish is vertex-color-only (no extra mesh or GPU texture lookup).
 */
var Heatline=globalThis.Heatline||{};
(function(H){
'use strict';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const G=H.coast461;
const originalShore=H.buildShoreMesh463;
const originalFinish=H.finishReferenceBuildings469;
const ParentGuard=H.PerformanceGuard475;
if(typeof originalShore!=='function'||typeof originalFinish!=='function'||typeof ParentGuard!=='function')
  throw Error('SUNSET 4.7.9 requires the complete 4.7.8 base');
function toHex(rgb){return '#'+rgb.map(v=>Math.round(clamp(v,0,1)*255).toString(16).padStart(2,'0')).join('');}
function macroTint479(x,z){
  // Several incommensurate spatial frequencies, evaluated once on the CPU per
  // shared shoreline vertex. No repeatable grid/checker pattern at 1080p.
  const ridges=Math.sin(x*.0089+Math.cos(z*.0043)*1.17)*.42+
    Math.cos(z*.0116-x*.0034)*.33+Math.sin((x+z)*.0051)*.25;
  return clamp(1.0+ridges*.102,.91,1.09);
}
H.macroTint479=macroTint479;
H.buildShoreMesh463=function naturalCoast479(world,surfaceColor,addFallback){
  const statistics={version:'4.7.9',biomeColorSamples:0,unchangedRoadAndSandSamples:0,
    newTriangles:0,newTextureSamplesPerFrame:0,newDrawCallsPerFrame:0,
    terrainGeometryChanged:false};
  const finish=(x,z,shore)=>{
    const original=surfaceColor(x,z,shore);
    if(!original||original.material!=='lawn443'||shore<1.3||
       G.roadAt(x,z)||H.onCorePavement463?.(x,z)){
      statistics.unchangedRoadAndSandSamples++;
      return original;
    }
    const c=H.rgb(original.color),t=macroTint479(x,z);
    const greenFactor=clamp(t*.99,.88,1.1);
    const colored=toHex([c[0]*(.987+t*.013),c[1]*greenFactor,c[2]*(.965+t*.035)]);
    statistics.biomeColorSamples++;
    return {...original,color:colored};
  };
  const result=originalShore(world,finish,addFallback);
  world.stage479CoastStats=statistics;
  return result;
};

// Blend the *retained* skyline meshes only after reference-building pruning.
// These are authored exterior shapes, not new proxy geometry. A modest tint match
// prevents large far chunks from changing abruptly to an unrelated wall hue.
function blendHex(a,b,ratio){
  const x=H.rgb(a),y=H.rgb(b),t=clamp(ratio,0,1);
  return toHex([x[0]*(1-t)+y[0]*t,x[1]*(1-t)+y[1]*t,x[2]*(1-t)+y[2]*t]);
}
H.finishReferenceBuildings469=function coherentSkyline479(world){
  const result=originalFinish(world);
  const buildings=world.buildings||[];
  const lookup=new Map(buildings.map(b=>[String(b.x)+','+String(b.z),b]));
  const covered=new Set();
  let aligned=0,shells=0;
  for(const o of world.boxes){
    if(!o.stage450Proxy||!o.facadeOwner473)continue;
    const b=lookup.get(o.facadeOwner473);
    if(!b)continue;
    covered.add(o.facadeOwner473);
    const shell=b.shell38;
    if(!shell||o===shell||!o.color||!shell.color)continue;
    // Keep the original material and architectural color character (80%).
    o.color=blendHex(o.color,shell.color,.20);
    o.sunset479Coherent=true;
    aligned++;
  }
  // Buildings with a segmented facade count as covered even if no individual
  // segment is as tall as the total tower (e.g., the stepped south tower).
  for(const b of buildings)if(b.shell38) shells++;
  world.stage479SkylineStats={finalCityBuildings:buildings.length,
    facadesWithAuthoredShells:shells,retainedProxyBuildingsCovered:covered.size,
    alignedRetainedProxies:aligned,addedMeshes479:0,
    unchangedMaterials:true,alteredGeometry479:false,unchangedLODThresholds:true};
  return result;
};

H.PerformanceGuard475=class PerformanceGuard479 extends ParentGuard{
  constructor(game){super(game);this.build='4.7.9';}
  report(){
    const base=super.report();
    const renderer=this.g.renderer;
    const world=this.g.world;
    return {...base,build:'4.7.9',nativeResolutionCurrent:[renderer?.canvas?.width||0,renderer?.canvas?.height||0],
      nativeStageSamplesAllAtLeast50Fps:!!(this.native?.()&&this.completed&&this.phases.length>=4&&this.phases.every(p=>p.native&&p.fps>=50)),
      deviceWide50FpsProven:false,
      worldVisualContinuity479:{coast:world?.stage479CoastStats||null,
        skyline:world?.stage479SkylineStats||null,
        visibleCulling:renderer?.getVisibilityInfo?.()||null,
        retainedTintedFarVolumes:(world?.boxes||[]).filter(o=>o.sunset479Coherent).length},
      limitation479:'GPU frame-time verification remains dependent on a real 1920x1080 browser run. Terrain tint uses original vertex buffer and adds no new draw calls.'};
  }
  download(){
    const data=JSON.stringify(this.report(),null,2),blob=new Blob([data],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.download='SUNSET_STATE_479_NATIVE_FHD_PERFORMANCE.json';a.href=url;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
};
})(Heatline);
