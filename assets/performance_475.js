/* SUNSET STATE 4.7.5: staged, same-device FPS and native pixel guard. */
var Heatline=globalThis.Heatline||{};
(function(H){
'use strict';
class PerformanceGuard475 {
 constructor(game){
   this.g=game;this.build='4.7.5';this.phases=[];this.reviews=[];
   this.reset();
 }
 gl(){return this.g.renderer?.name==='WebGL2 instancing / GLSL';}
 native(){const r=this.g.renderer;
   return this.gl()&&this.g.visualMode450==='native1080'&&
     r.canvas.width>=1920&&r.canvas.height>=1080;
 }
 flushCull(){const r=this.g.renderer;
   for(const scene of [r.outdoorStatic,r.indoorStatic])if(scene){scene.cullX=Number.NaN;scene.cullZ=Number.NaN;}
 }
 setCulling(value){this.cullEnabled=Boolean(value);this.g.renderer.cullSquared475=this.cullEnabled;this.flushCull();}
 setPacking(value){this.packEnabled=Boolean(value);this.g.renderer.reuseStaticPacking475=this.packEnabled;this.flushCull();}
 setDetails(value){this.enabled=Boolean(value);this.g.renderer?.setOptionalCityDetails475?.(this.enabled);}
 reset(){
   this.phase='warmup';this.samples=[];this.phases=[];this.reviews=[];
   this.phaseStart=0;this.base=this.cull=this.pack=this.detail=this.accepted=null;
   this.completed=false;this.resFailures=0;this.maxFrames=850;
   this.status='מכין מדידת בסיס 1080p';
   if(this.gl()){
     this.setCulling(false);this.setPacking(false);this.setDetails(false);
   }else{this.cullEnabled=false;this.packEnabled=false;this.enabled=false;}
 }
 measure(){
   const sorted=this.samples.slice().sort((a,b)=>a-b);
   if(!sorted.length)return null;
   const mean=sorted.reduce((s,v)=>s+v,0)/sorted.length;
   const p95=sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)];
   const r=this.g.renderer;
   return {samples:sorted.length,fps:+(1000/mean).toFixed(2),p95Ms:+p95.toFixed(2),
     resolution:[r.canvas.width,r.canvas.height],native:this.native(),
     mode:this.g.visualMode450,cutting:this.cullEnabled,reusing:this.packEnabled,details:this.enabled};
 }
 record(label){const m=this.measure();if(m){m.phase=label;this.phases.push(m);}return m;}
 enter(phase,now){this.phase=phase;this.phaseStart=now;this.samples=[];}
 compare(label,current,previous,rollback){
   const before=previous?.fps||0,after=current?.fps||0;
   const regressed=before>0&&(after<before*.95||(before>=50&&after<50));
   this.reviews.push({stage:label,before,after,deltaPct:before?+
     ((after/before-1)*100).toFixed(1):null,regressed,passed:!regressed,
     note:'FPS measured in moving gameplay; camera path not identical.'});
   if(regressed){rollback();this.status=label+': ירידת FPS נמדדה; בוצעה חזרה למצב הקודם תוך שמירה על 1080p';}
   else this.status=label+': מדידה הסתיימה ללא רגרסיה גדולה מ־5%';
   return !regressed;
 }
 sample(frameMs,now,active){
   if(!active||!this.gl()||!Number.isFinite(frameMs)||frameMs<1||frameMs>500)return;
   if(this.g.visualMode450!=='native1080'){
     this.status='מצב מותאם: אי אפשר לאמת 1080p/50FPS';return;
   }
   if(!this.native()){
     this.resFailures++;
     // One immediate retry after a resize/context event, not repeated
     // expensive reallocations on GPUs whose limits are genuinely too low.
     if(this.resFailures===1){
       this.g.renderer.renderPolicy475='native1080';
       this.g.renderer.resize();
     }
     if(!this.native()){
       this.status='1080p לא הושג בחומרה זו — פתח F3';
       this.setDetails(false);return;
     }
   }
   if(!this.phaseStart)this.phaseStart=now;
   if(this.samples.length<this.maxFrames)this.samples.push(frameMs);
   const elapsed=now-this.phaseStart;
   if(this.phase==='warmup'&&elapsed>=1800){
     this.enter('baseline',now);this.status='שלב בסיס: FPS בלי השינויים החדשים';return;
   }
   if(this.phase==='baseline'&&elapsed>=4700){
     this.base=this.record('baseline');this.accepted=this.base;this.setCulling(true);
     this.enter('cull',now);this.status='שלב 1: סינון גאומטריה משופר';return;
   }
   if(this.phase==='cull'&&elapsed>=4700){
     this.cull=this.record('cull');
     const ok=this.compare('סינון',this.cull,this.accepted,()=>this.setCulling(false));
     if(ok)this.accepted=this.cull;
     this.setPacking(true);this.enter('pack',now);
     this.status+=' · שלב 2: העלאת גאומטריה';return;
   }
   if(this.phase==='pack'&&elapsed>=4700){
     this.pack=this.record('pack');
     if(this.compare('העלאת מודלים',this.pack,this.accepted,()=>this.setPacking(false)))
       this.accepted=this.pack;
     this.setDetails(true);this.enter('detail',now);
     this.status+=' · שלב 3: פרטי עיר';return;
   }
   if(this.phase==='detail'&&elapsed>=4700){
     this.detail=this.record('detail');
     if(this.compare('פרטי עיר',this.detail,this.accepted,()=>this.setDetails(false)))
       this.accepted=this.detail;
     this.enter('monitor',now);this.completed=true;return;
   }
   if(this.phase==='monitor'&&elapsed>=8500){
     const m=this.record('monitor');
     if(this.enabled&&this.pack&&this.pack.fps>=50&&m&&m.fps<48){
       this.setDetails(false);this.status='ירידה מאוחרת ב-FPS: הפרטים האופציונליים הושבתו';
     }
     this.enter('monitor',now);
   }
 }
 report(){const r=this.g.renderer;
   return {build:this.build,date:new Date().toISOString(),browser:navigator.userAgent,
     target:{width:1920,height:1080,minFps:50},actual:[r.canvas.width,r.canvas.height],native1080:this.native(),
     stage:this.phase,status:this.status,enabled:{culling:this.cullEnabled,packing:this.packEnabled,cityDetails:this.enabled},
     baseline:this.base,culling:this.cull,packing:this.pack,withDetails:this.detail,
     review:this.reviews.slice(),history:this.phases.slice(-30),resolutionFailures:this.resFailures,
     caveat:'A/B measured in active game, not identical camera paths; compare same place to reduce noise. No guarantee of 50 FPS on all GPUs.'};
 }
 download(){
   const url=URL.createObjectURL(new Blob([JSON.stringify(this.report(),null,2)],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download='SUNSET_STATE_475_1080P_FPS_REPORT.json';
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
}
H.PerformanceGuard475=PerformanceGuard475;
})(Heatline);
