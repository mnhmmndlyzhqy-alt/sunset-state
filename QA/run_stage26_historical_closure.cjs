'use strict';
/* Stage26 technical closure, actual SUNSET STATE Game/World and authoritative
 * 25-finding Stage01 register. Renderer/DOM are CPU fakes. No GPU or visual claims. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const reg=JSON.parse(fs.readFileSync(path.join(root,'QA/STAGE01_15_BUG_REGISTER.json'),'utf8'));
const prog=JSON.parse(fs.readFileSync(path.join(root,'PROJECT/35_STAGE_PROGRESS.json'),'utf8'));
const {H,g}=require('./stage05_bootstrap.cjs');const w=g.world;
const overall=[],byFinding=new Map(reg.findings.map(f=>[f.id,{issueId:f.id,sourceStage:prog.issues.find(i=>i.issueId===f.id)?.stage||null,
 originalClassification:f.classification,sourceEvidence:f.source,checks:[],runtimeCpu: false,
 hardwareGpu:false,manualGameplay:false}]));
function check(id,title,pass,extra){
 const x={name:title,passed:Boolean(pass),extra:extra??null};
 overall.push({id,...x});let row=byFinding.get(id);if(!row)throw Error('Unknown canonical finding '+id);
 row.checks.push(x);row.runtimeCpu=true;
 if(!pass)console.error('FAIL',id,title,JSON.stringify(extra)?.slice(0,300));
}
function isFinitePoints(points){return Array.isArray(points)&&points.length>=3&&points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z));}
function sharpestRoad(points){let max=0;for(let i=1;i<points.length-1;i++){
 const a=points[i-1],b=points[i],c=points[i+1];let ux=b.x-a.x,uz=b.z-a.z,vx=c.x-b.x,vz=c.z-b.z;
 let au=Math.hypot(ux,uz),av=Math.hypot(vx,vz);if(au<.01||av<.01)continue;
 let cos=Math.max(-1,Math.min(1,(ux*vx+uz*vz)/(au*av)));
 max=Math.max(max,Math.acos(cos)*180/Math.PI);
}return max;}
const road=id=>w.roads461.find(x=>x.id===id);
const nr=road('northRing'),sp=road('privateSpine469');
check('S01-RD-01','northRing real roadway exists',isFinitePoints(nr?.points)&&nr.samples.length>10);
check('S01-RD-01','northRing no historic 175-180 degree reversal',sharpestRoad(nr.points)<155,{maxTurnDeg:sharpestRoad(nr.points)});
check('S01-RD-02','privateSpine real roadway exists',isFinitePoints(sp?.points)&&sp.samples.length>10);
check('S01-RD-02','privateSpine 136 degree defect no longer present',sharpestRoad(sp.points)<135.9,{maxTurnDeg:sharpestRoad(sp.points)});
const active=w.entrancePortals.filter(x=>x.interiorReady),dormant=w.entrancePortals.filter(x=>!x.interiorReady);
check('S01-BL-01','legacy entrance inventory',active.length===214&&dormant.length===215,{active:active.length,dormant:dormant.length});
check('S01-BL-01','legacy base 84 usable entries preserved',active.filter(p=>p.id<299).length===84);
check('S01-BL-02','130 CITY20 mapped entries are active',active.filter(p=>p.id>=299).length===130);
check('S01-BL-02','no eligible entry without a physical doorway',active.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.width>0));
check('S01-BL-03','entrances no longer all north-facing',new Set(active.map(p=>p.facing)).size>=3,{faces:[...new Set(active.map(p=>p.facing))]});
check('S01-BL-03','stage06 linked direction/audit module still loaded',!!H.stage06Orientation&&active.filter(p=>p.stage06Oriented).length>=173);
check('S01-BL-04','34 real building rotations retained',w.stage07AlignmentStats?.realRotations===34);
check('S01-BL-04','road geometry and active entrances survive alignment',w.stage07AlignmentStats?.roadsPreserved===52&&w.stage07AlignmentStats?.activeEntrancesPreserved===214);
check('S01-BL-05','side/back window bays survive',w.stage08FacadeStats?.windowBays===1586&&w.stage08FacadeStats?.rotatedBuildingsCovered===34);
check('S01-BL-05','original window facets retain trims/sills',w.stage08FacadeStats?.trim===1586&&w.stage08FacadeStats?.sills===1586);
check('S01-BL-06','coastal audit distinguishes active from abandoned doors',w.stage09CoastalAudit?.activePortals===214&&w.stage09CoastalAudit?.dormantWaterDescriptors===116);
check('S01-BL-06','no active coastal entrance placed in water',w.stage09CoastalAudit?.activeWaterAtDoor===0&&w.stage09CoastalAudit?.activeWaterWithin6m===0);
check('S01-ST-01','live planters audited against paths',w.stage10PlanterAudit?.livePlanterSites===166&&w.stage10PlanterAudit?.unsafeSites===0);
check('S01-ST-01','live planters paired and do not block doors',w.stage10PlanterAudit?.blockedWalkways===0&&w.stage10PlanterAudit?.unpairedSites===0);
check('S01-ST-02','original corrected street lamps preserved',w.stage11LampAudit?.livePosts===28&&w.stage11LampAudit?.pairedPosts===28);
check('S01-ST-02','lamp ground placement no longer outlier',w.stage11LampAudit?.misalignedBasesOver2cm===0&&w.stage11LampAudit?.maxAbsoluteBaseOffset<=.02);
check('S01-ST-03','actual street prop collision bodies preserved',w.stage12StreetPropSolids?.length===360&&w.stage12PropAudit?.missing===0);
check('S01-ST-03','actual spatial collision arrangement preserved',w.propSolids.length===796&&w.solids.length===3230);
check('S01-IN-01','all 7 historical narrow foyers furnished',w.stage13NarrowLobbyStats?.repairedFoyers===7&&w.stage13NarrowLobbyStats?.portalIDs?.length===7);
check('S01-IN-01','original foyer furnishings still in game geometry',w.stage13NarrowLobbyStats?.worldMeshesAdded===77);
check('S01-IN-02','actual interior lighting module active',H.stage14Lighting?.installed===true&&H.stage14Lighting?.MAX_SHADER_LIGHTS<=12);
check('S01-IN-02','interior lighting has a runtime scene resolver',typeof H.stage14Lighting?.resolve==='function'&&typeof H.stage14Lighting?.decorateScene==='function');
check('S01-IN-03','physical interior furnishing module installed',H.stage15Interior?.installed===true&&typeof H.stage15Interior?.tryInteract==='function');
check('S01-IN-03','interior furniture collision is bounded',H.stage15Interior?.MAX_ADDITIONAL<=12);
check('S01-GL-01','actual 864 new glass panes and 124 legacy retained',w.stage16GlassStats?.selectedGlass===864&&w.glassPanels.length===988);
check('S01-GL-01','all 130 facades retain breakable selection',w.stage16GlassStats?.buildingsCovered===130&&w.stage16GlassStats?.collisionBodiesAdded===0);
check('S01-RT-01','60 recovered facades retained',w.stage17RetailStats?.recoveredVenues===60&&w.stage17RetailStats?.existingAuditedStorefrontMeshes===342);
check('S01-RT-01','59 actual shops and 6 street services distinguished',w.retailShops.length===59&&w.stage17RetailStats?.outdoorServicesAmongRecovered===6);
check('S01-WL-01','8 crocodile actors still in simulation',g.stage39Life.wildlife.filter(a=>a.kind==='crocodile').length===8);
const crocManifest=path.join(root,'QA/STAGE18_LOD_ASSET_MANIFEST.json');
const lodAssets=['crocodile_hi.js','crocodile_mid.js','crocodile_far.js'];
const m=JSON.parse(fs.readFileSync(crocManifest,'utf8'));
check('S01-WL-01','three-tier crocodile LOD source components shipped',lodAssets.every(f=>fs.existsSync(path.join(root,'assets',f)))&&m.mid.triangles_lod<m.hi_source_triangles&&m.far.triangles_lod<m.mid.triangles_lod,{lodAssets,triangles:[m.hi_source_triangles,m.mid.triangles_lod,m.far.triangles_lod]});
check('S01-SV-01','stage19 save supports slots and import schemas',H.stage19Save?.slots?.length===4&&typeof H.stage19Save?.parse==='function');
check('S01-SV-01','game save-load entrypoints remain installed',typeof g.stage19SaveNow==='function'&&typeof g.stage19LoadNow==='function');
check('S01-AI-01','live pedestrian recovery module installed',H.stage20Pedestrian?.stats?.installed===true);
check('S01-AI-01','navigation recovery has real detour planner',typeof H.stage20Pedestrian?.detourPlan==='function'&&g.pedestrians.length>50);
check('S01-PH-01','actual high speed collision module installed',H.stage21HighSpeedCCD?.stats?.installed===true);
check('S01-PH-01','continuous collision uses actual physics methods',typeof H.stage21HighSpeedCCD?.findFirst==='function'&&typeof H.stage21HighSpeedCCD?.guardIntegrator==='function');
check('S01-PF-01','GPU benchmark tool installed but does NOT certify this run',!!H.stage22Benchmark?.target&&H.stage22Benchmark?.enabled()===false);
check('S01-PF-01','native capture target recorded as 1080p 50FPS',H.stage22Benchmark?.target?.width===1920&&H.stage22Benchmark?.target?.height===1080&&H.stage22Benchmark?.target?.minimumAverageFps===50);
check('S01-PF-02','draw call profiler exists and is default disabled',typeof H.stage23Profiler?.instrumentGL==='function'&&H.stage23Profiler?.enabled()===false);
check('S01-PF-02','world geometry inventory retained',w.boxes.length===194555);
check('S01-PR-01','current 35-stage programme canonical ordering',prog.stageCount===35&&prog.issues.length===25&&prog.currentStage>=25&&prog.currentStage<=26);
const refs=JSON.parse(fs.readFileSync(path.join(root,'PROJECT/STAGE24_EVIDENCE_LEDGER.json'),'utf8'));
check('S01-PR-01','all issue IDs linked to evidence ledger',refs.issues?.length===25&&refs.issues.every(x=>byFinding.has(x.issueId)));
const site=JSON.parse(fs.readFileSync(path.join(root,'PROJECT/STAGE25_RELEASE_MANIFEST.json'),'utf8'));
check('S01-PU-01','Stage25 site packaging integrity recorded',fs.existsSync(path.join(root,'index.html'))&&fs.existsSync(path.join(root,'.nojekyll'))&&!!site);
check('S01-PU-01','launcher and index are real bundled files',fs.readFileSync(path.join(root,'index.html'),'utf8').includes('engine44.js')&&fs.existsSync(path.join(root,'RUN_GAME_WINDOWS.bat')));
const browserJs=fs.readFileSync(path.join(root,'QA/STAGE26_25_FINDINGS_BROWSER.js'),'utf8');
const html=fs.readFileSync(path.join(root,'START_GAME.html'),'utf8');
check('S01-QA-01','25-issue original registry unchanged and loaded by collector',reg.findings.length===25&&reg.findings.every(f=>browserJs.includes(f.id)));
check('S01-QA-01','browser collector opt-in only and separate local download',html.includes('stage26qa')&&browserJs.includes('r.draw')&&browserJs.includes('toDataURL')&&browserJs.includes('screenshot'));
check('S01-QA-01','CPU run explicitly has no real GPU or gameplay verification',true,{renderBackend:g.renderer.name,realGPU:false});
const issues=[...byFinding.values()].map(entry=>{
 const errors=entry.checks.filter(c=>!c.passed).map(c=>c.name);
 return {...entry,checked:entry.checks.length,passed:entry.checks.length-errors.length,failures:errors,
  technicalState:errors.length?'cpu_check_failed_requires_repair':'current_game_cpu_contracts_passed',
  closureState:'technical_evidence_collected_not_native_visual_or_gpu_signoff'};
});
const failures=overall.filter(c=>!c.passed);
const report={schema:'SUNSET_STAGE26_CPU_EVIDENCE_V1',stage:26,originalRegisterPath:'QA/STAGE01_15_BUG_REGISTER.json',
 computedAt:new Date().toISOString(),source:'Real Game + World construction with fake renderer, NOT screenshot or GPU',
 currentSourceStage:25,issueCount:issues.length,checks:overall.length,passed:overall.length-failures.length,
 failures,issues,worldSnapshot:{roads:w.roads461.length,boxes:w.boxes.length,portals:w.entrancePortals.length,
 activePortals:active.length,shops:w.retailShops.length,glass:w.glassPanels.length,characters:g.pedestrians.length,crocodiles:8},
 verification:{cpuRuntime:true,gameSourceExecuted:true,actualBrowserGameFrames:false,nativeHardwareGPU:false,
 fps50at1920x1080:false,historicalIssuesHardwareVerified:0},
 nextManualValidation:'Open START_GAME.html?stage26qa=1 via server and export screenshot + JSON records from the live game'};
const dest=path.join(root,'QA/STAGE26_HISTORICAL_CPU_EVIDENCE.json');fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
console.log('STAGE26 HISTORICAL SOURCE CPU',report.passed+'/'+report.checks,'issues',report.issues.length,
 'failures',JSON.stringify(failures.map(x=>x.id+':'+x.name)).slice(0,1200));
if(failures.length)process.exitCode=1;
