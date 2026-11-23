'use strict';
/* Run with STAGE16_GLASS_OFF=1; verifies previous-stage world is reproduced. */
const fs=require('fs'),{H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
const check=(name,cond)=>{if(!cond)throw Error('Stage16 A/B OFF: '+name);};
check('off flag',H.stage16Glass.off());
check('no additional registry',w.glassPanels.length===124);
check('no facade conversion',w.stage16GlassStats===undefined);
check('old facade material',w.boxes.filter(b=>b.stage08Part==='glass').length===1586&&
  w.boxes.filter(b=>b.stage08Part==='glass').every(b=>b.material==='glass'));
check('same world geometry',w.boxes.length===194555&&w.solids.length===3230&&w.propSolids.length===796);
check('same world entry',w.roads461.length===52&&w.entrancePortals.filter(p=>p.interiorReady).length===214);
check('previous interior systems',H.stage14Lighting.installed&&H.stage15Interior.installed);
const out={stage:16,comparison:'stage16 OFF',passed:7,total:7,mode:'CPU original Game world',gpuValidated:false};
fs.writeFileSync('QA/STAGE16_AB_OFF.json',JSON.stringify(out,null,2)+'\n');
console.log('Stage16 OFF: 7/7; original panels 124, 1586 static Stage08 windows, 194555 scene meshes');
