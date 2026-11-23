const {H,g}=require('./stage05_bootstrap.cjs'),w=g.world,s=w.stage06OrientationStats;
console.log(JSON.stringify({oriented:s?.oriented,legacy:s?.legacyOriented,new:s?.city20Oriented,unchanged:s?.northPreserved,errors:s?.errors,examples:s?.updated.slice(0,15),old: w.entrancePortals.filter(v=>v.interiorReady).length},null,2));
