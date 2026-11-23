/* SUNSET STATE / cumulative stage 32 of 35.
 * Correct real habitat mismatches in the existing coastline and use the
 * ORIGINAL Stage40/43 animal model/animation system. No GLB replacements,
 * new colliders, artificial water planes, external dependencies or saves.
 * Runtime A/B (requires reload for placement): ?stage32WildlifeOff=1.
 * CPU verification is not WebGL/GPU, visual quality or 50FPS certification.
 */
var Heatline = globalThis.Heatline || {};
(function(H){'use strict';
 const clamp=(x,l,h)=>Math.min(h,Math.max(l,x));
 const dist=(x,z,y,t)=>Math.hypot(x-y,z-t);
 const stats={installed:false,originalModelsChanged:0,newColliders:0,
   savedDataSchemaChanges:0,seeded:{flamingo:0,heron:0,dolphin:0,reef_perch:0},
   unsuitableHomesBefore:{},unsuitableHomesAfter:{},redirectedGoals:0,
   animalBoundaryStops:0,fishBoundaryStops:0,crocBaskPrevented:0,
   shoalCorrections:0,nearbyBreathVisuals:0,wadingVisuals:0,waterlineCorrectedDolphinMeshes:0,
   waterlineCorrectedFishFallbackMeshes:0,
   waterlineCorrectedCrocodileFallbackMeshes:0,crocodilePremiumAnchorAdjustments:0,
   nativeGpuVerified:false,fullHD50FpsVerified:false};
 const off=()=>globalThis.__SUNSET_STAGE32_WILDLIFE_OFF===true||
   (typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
    new URLSearchParams(location.search||'').get('stage32WildlifeOff')==='1');
 const coast=(x,z)=>H.coast461.coast(x,z);
 const waterOk=(x,z,margin=3.5)=>Number.isFinite(x)&&Number.isFinite(z)&&
     coast(x,z)<=-margin&&!H.coast461.isRouteRoad(x,z);
 const niche=(kind,c)=>kind==='flamingo'?c>=-2.5&&c<=6.0:
   kind==='heron'?c>=.4&&c<=10.0:
   kind==='dolphin'?c<=-10.0:
   kind==='reef_perch'?c<=-3.5&&c>=-30.0:c<=-3.5;
 function habitatValid(kind,x,z){
   if(!Number.isFinite(x)||!Number.isFinite(z)||H.coast461.isRouteRoad(x,z))return false;
   return niche(kind,coast(x,z));
 }
 // A bounded, deterministic scan: no rewriting of reference terrain or roads.
 function findSites(anchor,count,nicheKind,spacing,radius,forbid=[]){
   const candidates=[],step=4;
   for(let x=anchor[0]-radius;x<=anchor[0]+radius;x+=step)
     for(let z=anchor[1]-radius;z<=anchor[1]+radius;z+=step){
       const d=dist(x,z,anchor[0],anchor[1]);
       if(d>radius||!habitatValid(nicheKind,x,z))continue;
       if(forbid.some(p=>dist(x,z,p[0],p[1])<74))continue;
       const c=coast(x,z),sweet=nicheKind==='dolphin'?-28:nicheKind==='reef_perch'?-10:
         nicheKind==='flamingo'?1.0:3.6;
       candidates.push({x,z,rank:d+Math.abs(c-sweet)*.045});
     }
   candidates.sort((a,b)=>a.rank-b.rank||a.x-b.x||a.z-b.z);
   const chosen=[];
   for(const p of candidates){
     if(chosen.every(q=>dist(q.x,q.z,p.x,p.z)>=spacing)){
       chosen.push({x:p.x,z:p.z});if(chosen.length===count)break;
     }
   }
   if(chosen.length!==count)throw Error('Stage32 insufficient verified '+nicheKind+' habitats '+chosen.length+'/'+count);
   return chosen;
 }
 function safeGoal(actor,kind,rng){
   const margin=kind==='reef_perch'?0.93:0.88;
   for(let n=0;n<28;n++){
     const theta=rng.range(-Math.PI,Math.PI),r=rng.range(2.8,Math.max(4,actor.radius*margin));
     const x=actor.homeX+Math.sin(theta)*r,z=actor.homeZ+Math.cos(theta)*r;
     if(habitatValid(kind,x,z))return {x,z};
   }
   return {x:actor.homeX,z:actor.homeZ};
 }
 function originalHabitatProblems(life){
   const r={flamingo:0,heron:0,dolphin:0,reef_perch:0};
   for(const a of life.wildlife)if(a.kind in r&&!habitatValid(a.kind,a.x,a.z))r[a.kind]++;
   for(const f of life.fish)if(f.species==='reef_perch'&&!habitatValid('reef_perch',f.x,f.z))r.reef_perch++;
   return r;
 }
 function seed(life){
   stats.unsuitableHomesBefore=originalHabitatProblems(life);
   // West marsh shore lies around (440,-625), not (220,-790) inland.
   const crocs=(H.CROC_SITES477||[]);
   const flamingos=findSites([440,-625],10,'flamingo',9.5,87,crocs);
   const herons=findSites([491,-687],4,'heron',14,82);
   // The previous marina center (884,140) includes dry land: move offshore.
   const dolphins=findSites([889,181],6,'dolphin',15,87);
   // Original reef fish were tagged 'wetland' but placed in deep open sea.
   const perch=findSites([385,-767],8,'reef_perch',9,88);
   const placed={flamingo:0,heron:0,dolphin:0,reef_perch:0};
   const assign=(a,p,radius)=>{
     a.x=a.homeX=a.goalX=p.x;a.z=a.homeZ=a.goalZ=p.z;
     a.radius=radius;a.speed=0;a.velocityX=0;a.velocityZ=0;
   };
   for(const a of life.wildlife){
     if(a.kind==='flamingo'){assign(a,flamingos[placed.flamingo++],31);a.habitat='lagoon';}
     else if(a.kind==='heron'){assign(a,herons[placed.heron++],29);a.habitat='marsh_edge';}
     else if(a.kind==='dolphin'){assign(a,dolphins[placed.dolphin++],41);a.habitat='marina';a.swimDepth=1.2;}
   }
   for(const f of life.fish){
     if(f.species==='reef_perch'){
       const p=perch[placed.reef_perch++];assign(f,p,21);
       f.depth=clamp(f.depth,.6,1.05);f.preferredDepth442=.80;f.habitat='wetland';
       f.pod=2;f.goalX=p.x;f.goalZ=p.z;
     }
   }
   stats.seeded=placed;
   stats.unsuitableHomesAfter=originalHabitatProblems(life);
 }
 function install(HL){
   if(stats.installed)return;
   const Base=HL.Stage39Life;
   if(!Base?.prototype?.updateFish||!Base?.prototype?.moveAnimal||!Base?.prototype?.chooseGoal||
      !Base?.prototype?.emit||!HL.Wildlife43Renderer)
     throw Error('Stage32 needs original Stage43 ecology and real animal renderer');
   class HabitatLife32 extends Base{
     constructor(world){super(world);this.stage32Active=!off();
       if(this.stage32Active)seed(this);
     }
     chooseGoal(a,radius=1){
       const result=super.chooseGoal(a,radius);
       if(off()||a.kind==='crocodile')return result;
       if(!habitatValid(a.kind,a.goalX,a.goalZ)){
         const p=safeGoal(a,a.kind,this.rng40);
         a.goalX=p.x;a.goalZ=p.z;stats.redirectedGoals++;
       }
       return result;
     }
     updateCroc(a,dt,daylight,dusk,rain){
       const v=super.updateCroc(a,dt,daylight,dusk,rain);
       if(!off()&&a.mode==='bask'&&coast(a.x,a.z)<-2.4){
         // A deep-water crocodile must not lie on an invisible mud bank.
         this.setMode(a,'patrol',this.rng40.range(5,12));
         this.chooseGoal(a);stats.crocBaskPrevented++;
       }
       return v;
     }
     updateBird(a,dt,daylight,rain){
       const result=super.updateBird(a,dt,daylight,rain);
       if(off())return result;
       // The original landing timer may lower a bird over deep water. Keep it
       // genuinely airborne while it returns to a known shallow bank. No XY
       // teleport, and only a few centimetres of altitude correction.
       if((a.mode==='landing'||a.altitude<.32)&&
          !habitatValid(a.kind,a.x,a.z)){
         this.setMode(a,'flight',Math.max(2.6,a.modeTimer));
         a.modeTimer=Math.max(a.modeTimer,2.6);
         a.altitude=Math.max(a.altitude,.335);
         a.targetAltitude=Math.max(a.targetAltitude,2.35);
         a.goalX=a.homeX;a.goalZ=a.homeZ;
       }
       return result;
     }
     updateDolphin(a,dt,dusk,rain){
       const breaths=a.breaths;
       const result=super.updateDolphin(a,dt,dusk,rain);
       if(off())return result;
       if(a.breaths>breaths)a.stage32Exhale=.56;
       else a.stage32Exhale=Math.max(0,(a.stage32Exhale||0)-dt);
       if(!habitatValid('dolphin',a.goalX,a.goalZ)){
         const p=safeGoal(a,'dolphin',this.rng40);
         a.goalX=p.x;a.goalZ=p.z;stats.redirectedGoals++;
       }
       return result;
     }
     moveAnimal(a,dt){
       if(off()||a.kind==='crocodile')return super.moveAnimal(a,dt);
       const beforeX=a.x,beforeZ=a.z;
       if(!habitatValid(a.kind,a.goalX,a.goalZ)){
         const p=safeGoal(a,a.kind,this.rng40);
         a.goalX=p.x;a.goalZ=p.z;stats.redirectedGoals++;
       }
       const result=super.moveAnimal(a,dt);
       // Birds can fly over the banks; the habitat check only applies when wading.
       const airborne=(a.kind==='flamingo'||a.kind==='heron')&&a.altitude>.28;
       const invalid=airborne?false:!habitatValid(a.kind,a.x,a.z);
       if(invalid){
         a.x=beforeX;a.z=beforeZ;a.speed=Math.max(0,a.speed*.55);
         a.velocityX=0;a.velocityZ=0;
         const p=safeGoal(a,a.kind,this.rng40);
         a.goalX=p.x;a.goalZ=p.z;stats.animalBoundaryStops++;
       }
       return result;
     }
     updateFish(dt){
       if(off())return super.updateFish(dt);
       const before=this.fish.map(f=>[f.x,f.z]);
       for(const f of this.fish){
         const k=f.species==='reef_perch'?'reef_perch':'water';
         if(!habitatValid(k,f.goalX,f.goalZ)){
           const p=safeGoal(f,k,this.rng40);f.goalX=p.x;f.goalZ=p.z;
           stats.shoalCorrections++;
         }
       }
       const result=super.updateFish(dt);
       for(let i=0;i<this.fish.length;i++){
         const f=this.fish[i],k=f.species==='reef_perch'?'reef_perch':'water';
         if(!habitatValid(k,f.x,f.z)){
           f.x=before[i][0];f.z=before[i][1];f.speed*=.64;
           const p=safeGoal(f,k,this.rng40);f.goalX=p.x;f.goalZ=p.z;
           stats.fishBoundaryStops++;
         }
         // Keep reef fish realistically close to the shallow channel floor;
         // deeper pelagic schools retain their original swimming depths.
         if(f.species==='reef_perch'){
           const maxDepth=clamp((-coast(f.x,f.z))*.085+.27,.50,1.35);
           f.depth=Math.min(Math.max(.28,f.depth),maxDepth);
         }
       }
       return result;
     }
     emit(out,x,z){
       const begin=out.length;
       const result=super.emit(out,x,z);
       if(off())return result;
       // Stage40 procedural fallback originally anchored EVERY sea animal to
       // underwater seabed topography. Original Stage43 imported fish already
       // use sea-level matrices. Reanchor ONLY the legacy fallback drawables;
       // real GLB bones/meshes, seabed, tide and collision stay untouched.
       const dolphins=this.wildlife.filter(a=>a.kind==='dolphin'&&
         (!this.premium43||!this.premium43.has(a))&&dist(a.x,a.z,x,z)<340);
       const fallbackFish=this.fish.filter(f=>(!this.premium43||!this.premium43.has(f))&&
         dist(f.x,f.z,x,z)<170);
       const fallbackCrocs=this.wildlife.filter(a=>a.kind==='crocodile'&&
         coast(a.x,a.z)<-1.25&&(!this.premium43||!this.premium43.has(a))&&
         dist(a.x,a.z,x,z)<340);
       for(let j=begin;j<out.length;j++){
         const part=out[j];
         if(!part||!part.shape)continue;
         if(part.shape==='w40_fish'||part.shape==='w40_fish_tail'){
           let target=null,nearest=Infinity;
           for(const f of fallbackFish){const d=dist(f.x,f.z,part.x,part.z);
             if(d<nearest){target=f;nearest=d;}}
           if(!target||nearest>1.8)continue;
           const originalCenter=H.outdoorHeight(target.x,target.z)-target.depth*.18+.23;
           const wantedCenter=-.24-clamp(target.depth,.25,3)*.32;
           part.y+=wantedCenter-originalCenter;
           stats.waterlineCorrectedFishFallbackMeshes++;
         }else if(part.shape.startsWith('w40_')){
           let target=null,nearest=Infinity;
           let kind='';
           for(const a of dolphins){const d=dist(a.x,a.z,part.x,part.z);
             if(d<nearest){target=a;nearest=d;kind='dolphin';}}
           for(const a of fallbackCrocs){const d=dist(a.x,a.z,part.x,part.z);
             if(d<nearest){target=a;nearest=d;kind='crocodile';}}
           if(!target||nearest>5.8)continue;
           if(kind==='dolphin'){
             // A dolphin's trunk needs its own (roughly -1m) datum so surfacing
             // clears the waterline while routine cruising remains submerged.
             part.y+=(-.98-H.outdoorHeight(target.x,target.z));
             stats.waterlineCorrectedDolphinMeshes++;
           }else{
             // Crocodile body and limbs float close to the surface, with a
             // deeper pose during a real dive. Ripples stay on water level.
             part.y=part.shape==='w40_ripple'?.075:
               part.y+(target.mode==='dive'?-.87:-.55)-H.outdoorHeight(target.x,target.z);
             stats.waterlineCorrectedCrocodileFallbackMeshes++;
           }
         }
       }
       // Only close animals can afford small transient water interactions;
       // the user's heavy, rigged GLB models and rigging are unchanged.
       for(const a of this.wildlife){
         const d=dist(a.x,a.z,x,z);
         if(a.kind==='dolphin'&&d<58&&a.stage32Exhale>.03&&coast(a.x,a.z)<-8){
           const e=clamp(a.stage32Exhale/.56,0,1);
           for(let j=0;j<3;j++){
             const y=.25+j*.26+(1-e)*.45;
             const p=H.box(a.x+(j-1)*.24,y,a.z+(j%2)*.18,.10+j*.055,.16,.10+j*.055,
               '#c1e4df',-a.yaw,4,.045);
             p.material='light_emissive';p.shape='w40_joint';p.visibilityCap=60;
             p.stage32WildlifeDetail='breath-spray';out.push(p);
             stats.nearbyBreathVisuals++;
           }
         }else if((a.kind==='flamingo'||a.kind==='heron')&&d<56&&a.altitude<.17&&
                  ['feed','wade'].includes(a.mode)&&coast(a.x,a.z)<.65){
           const b=H.box(a.x,.085,a.z,.55,.026,.55,'#8eaeaa',0,4,0);
           b.material='glass';b.shape='w40_ripple';b.visibilityCap=58;
           b.stage32WildlifeDetail='shallow-wading';out.push(b);
           stats.wadingVisuals++;
         }
       }
       return result;
     }
   }
   // The real Stage18 GLB crocodile is anchored on its seabed by the old
   // matrix, even while swimming. Translate its ORIGINAL rig as one unit;
   // no mesh replacement and no vertex/animation-clip edits.
   const artistMatrix=HL.Wildlife43Renderer.prototype.actorMatrix;
   HL.Wildlife43Renderer.prototype.actorMatrix=function stage32WaterlineMatrix(actor,key){
     const matrix=artistMatrix.call(this,actor,key);
     if(!off()&&key.startsWith('crocodile')&&coast(actor.x,actor.z)<-1.25){
       matrix[13]=actor.mode==='dive'?-.65:-.21;
       stats.crocodilePremiumAnchorAdjustments++;
     }
     return matrix;
   };
   HL.Stage39Life=HabitatLife32;
   HL.stage32WildlifePolish.Base=Base;
   HL.stage32WildlifePolish.Class=HabitatLife32;
   stats.installed=true;
 }
 H.stage32WildlifePolish={install,off,stats,habitatValid,findSites,safeGoal,seed,originalHabitatProblems};
})(Heatline);
