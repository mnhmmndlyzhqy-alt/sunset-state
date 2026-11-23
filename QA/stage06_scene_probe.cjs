const {g,H}=require('./stage05_bootstrap.cjs');const w=g.world;
for(const p of [0,1,2,80,81,298,299,300,321,366,428].map(i=>w.entrancePortals[i])){
 if(!p?.interiorReady)continue;const plan=w.structuralPlans.find(v=>v.outerShell.x===p.buildingX&&v.outerShell.z===p.buildingZ);const scene=g.sceneForFloor(plan,0);
 const dims=plan.outerShell;const walls=scene.solids.filter(s=>Math.abs(s.x-dims.x)>dims.w*.34||Math.abs(s.z-dims.z)>dims.d*.34);
 const nearNorth=scene.boxes.filter(b=>b.layer>=4&&b.y-b.h*.5< H.cityTerrain42(dims.x,dims.z)+.75&&b.y+b.h*.5>H.cityTerrain42(dims.x,dims.z)+2.2&&b.z<dims.z-dims.d*.5+1.1);
 console.log(JSON.stringify({portal:p.id,kind:p.stage05City20?'new':'old',entry:p,plan:{id:plan.buildingId,outer:plan.outerShell,entrance:plan.entrance,foyer:plan.foyer,levels:plan.floorCount},scene:{entrance:scene.entrance,bounds:scene.bounds,solids:scene.solids.length,boxes:scene.boxes.length,wallSolids:walls.slice(0,14),northBoxes:nearNorth.slice(0,12).map(b=>({x:b.x,z:b.z,w:b.w,d:b.d,material:b.material,shape:b.shape}))}},null,2));
}
