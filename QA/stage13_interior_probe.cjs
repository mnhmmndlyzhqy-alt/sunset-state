'use strict';
const fs=require('fs'),{H,g}=require('./stage05_bootstrap.cjs');const w=g.world;
const ids=[1,24,35,50,62,67,78];
const byPlan=new Map(w.structuralPlans.filter(p=>p.outerShell).map(p=>[p.outerShell.x+','+p.outerShell.z,p]));
const to=(v)=>Math.round(v*100)/100;
const info=ids.map(id=>{
const p=w.entrancePortals[id],plan=byPlan.get(p.buildingX+','+p.buildingZ),scene=g.sceneForFloor(plan,0);
const b=plan.outerShell,ext=H.interiorExtents450(b);
let tags={};for(const v of scene.boxes){const key=v.material||'unknown';tags[key]=(tags[key]||0)+1;}
return {id,building:[b.x,b.z,b.w,b.d],ext,foyer:plan.foyer,portal:[to(p.x),to(p.z),p.facing],scene:{bounds:scene.bounds,entrance:scene.entrance,lift:scene.lift,boxes:scene.boxes.length,solids:scene.solids.length,lights:scene.lights.length,rooms:scene.rooms.length,pickups:scene.pickups,activities:scene.activities.length,stage06:scene.stage06IngressRepair,materials:tags},solidsNearEntry:scene.solids.filter(s=>Math.hypot(s.x-scene.entrance.x,s.z-scene.entrance.z)<10).map(s=>[to(s.x),to(s.z),to(s.hw),to(s.hd)])};});
fs.writeFileSync('QA/STAGE13_INTERIOR_PROBE.json',JSON.stringify(info,null,2)+'\n'); console.log(JSON.stringify(info.map(({id,building,ext,portal,scene})=>({id,building,ext,portal,bounds:scene.bounds,entry:scene.entrance,lift:scene.lift,solids:scene.solids,stage06:scene.stage06,materials:scene.materials})),null,2));
