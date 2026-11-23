'use strict';
const {H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
const previous=new Set(w.boxes.filter(b=>b.city20Stage11===true).map(b=>b.city20Stage11Portal));
const planBy=new Map(w.structuralPlans.filter(p=>p?.outerShell&&p.foyer).map(p=>[`${p.outerShell.x},${p.outerShell.z}`,p]));
const legacy=w.entrancePortals.filter(p=>p.interiorReady&&!p.stage05City20&&!p.stage04CompactHotel);
const missing=legacy.filter(p=>!previous.has(p.id)).map(p=>{
 const plan=planBy.get(`${p.buildingX},${p.buildingZ}`),f=plan?.foyer;
 return {id:p.id,p:[p.x,p.z],building:[p.buildingX,p.buildingZ],name:plan?.type||plan?.materialFamily||plan?.kind,foyer:f, floors:plan?.floorCount,facing:p.facing,nearestRoad:plan?.entrance,hasInterior:!!plan?.interiorReady};
});
console.log(JSON.stringify({stage11:w.city20Stage11Stats,stage12:w.city20Stage12Stats,stage13orig:w.city20Stage13Stats,portals:w.entrancePortals.length,legacy:legacy.length,decoratedOfLegacy:legacy.filter(p=>previous.has(p.id)).length,missing},null,2));
