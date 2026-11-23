/* SUNSET STATE Stage 37/105 | conservative renderer work reduction.
 * Opt-out: ?stage37RenderOff=1 or globalThis.__SUNSET_STAGE37_RENDER_OFF=true.
 * Does not change authored geometry, object order, shadows, shaders, materials,
 * instance data, LOD thresholds, physics, saves or draw resolution.
 */
var Heatline = globalThis.Heatline || {};
(function(H){ 'use strict';
  const MAX_GROWTH=8*1024*1024;
  const GRID_CACHE=new WeakMap(),BUFFER_CAPACITY=new WeakMap();
  const stats={stage:37,gridBuilds:0,gridReuses:0,gridCells:0,
    staticUploadCalls:0,staticBufferAllocations:0,staticSubDataCalls:0,
    bytesUploaded:0,drawsSkippedEmpty:0,nativeGpuVerified:false,fullHd50FpsVerified:false};
  function enabled(){
    return globalThis.__SUNSET_STAGE37_RENDER_OFF!==true &&
      !(typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
        new URLSearchParams(location.search||'').get('stage37RenderOff')==='1');
  }
  // Read the renderer's original 90m cells; never alter its canonical Map.
  // Numeric column/row lookups preserve the renderer's dx-then-dz traversal order.
  function grid(scene){
    if(!enabled()||!scene||!scene.cells)return null;
    let stored=GRID_CACHE.get(scene);
    if(stored && stored.source===scene.source && stored.cells===scene.cells && stored.size===scene.cells.size){
      stats.gridReuses++;return stored.rows;
    }
    const rows=new Map();let count=0;
    for(const [key,cell] of scene.cells){
      const comma=key.indexOf(','),x=Number(key.slice(0,comma)),z=Number(key.slice(comma+1));
      if(comma<0 || !Number.isSafeInteger(x)||!Number.isSafeInteger(z))return null;
      let row=rows.get(x);if(!row){row=new Map();rows.set(x,row);}
      row.set(z,cell);count++;
    }
    stored={source:scene.source,cells:scene.cells,size:scene.cells.size,rows};
    GRID_CACHE.set(scene,stored);stats.gridBuilds++;stats.gridCells+=count;
    return rows;
  }
  // Keep instance bytes bit-identical. Reuse allocated static GPU buffers when
  // possible; grow by at most 25% only for small/medium allocations. Never
  // attempt bufferSubData without matching allocated storage.
  function uploadStatic(gl,buffer,data,usage){
    if(!gl||!buffer||!data||typeof data.byteLength!=='number')throw new TypeError('stage37 static upload input');
    const bytes=data.byteLength;
    stats.staticUploadCalls++;stats.bytesUploaded+=bytes;
    if(!enabled()||typeof gl.bufferSubData!=='function'||!bytes){
      gl.bufferData(gl.ARRAY_BUFFER,data,usage);
      BUFFER_CAPACITY.set(buffer,bytes); // safe if the feature is toggled off and on
      return 'legacy';
    }
    const prior=BUFFER_CAPACITY.get(buffer);
    if(prior!==undefined && bytes<=prior){
      gl.bufferSubData(gl.ARRAY_BUFFER,0,data);
      stats.staticSubDataCalls++;
      return 'subdata';
    }
    if(prior!==undefined && bytes<=MAX_GROWTH){
      const grown=Math.ceil((bytes*1.25+80)/80)*80;
      gl.bufferData(gl.ARRAY_BUFFER,grown,usage);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,data);
      BUFFER_CAPACITY.set(buffer,grown);
      stats.staticBufferAllocations++;stats.staticSubDataCalls++;
      return 'grow';
    }
    gl.bufferData(gl.ARRAY_BUFFER,data,usage);
    BUFFER_CAPACITY.set(buffer,bytes);
    stats.staticBufferAllocations++;
    return 'allocate';
  }
  function skipEmpty(){stats.drawsSkippedEmpty++;}
  H.stage37RenderOptimizer={enabled,grid,uploadStatic,skipEmpty,stats,version:'37.0',
    limits:{maxGrowthBytes:MAX_GROWTH},note:'CPU/GL call optimizations; hardware FPS not certified'};
})(Heatline);
