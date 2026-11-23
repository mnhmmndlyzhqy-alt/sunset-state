/* SUNSET STATE 4.7.6 — additional stepwise A/B guard at fixed native pixels.
 * Reuses the exact 4.7.5 baseline and its three previous reversible stages.
 * Live FPS samples are only available inside the player's browser/GPU. */
var Heatline=globalThis.Heatline||{};
(function(H){
 'use strict';
 const Parent=H.PerformanceGuard475;
 if(typeof Parent!=='function')throw Error('4.7.6 needs performance_475.js');
 class PerformanceGuard476 extends Parent{
   constructor(g){super(g);this.build='4.7.6';}
   setGroup(name,enabled){
     const renderer=this.g.renderer;
     if(!renderer)return;
     const flags=renderer.groupFlags476 ||= {pilot:false,district:false,lobby:false};
     flags[name]=enabled===true;
     this.flushCull();
   }
   setRoute(on){
     // The activity is gameplay, not a removable visual effect. Never erase a
     // player's live delivery because a noisy benchmark window gets slower.
     this.routeObserving=on===true;
     this.g.marketLoop476?.setEnabled(true);
   }
   reset(){
     super.reset();
     this.extraResults=[];this.groupsVerified=false;this.nextIndex=0;this.sustainedSlow476=0;
     for(const name of ['pilot','district','lobby'])this.setGroup(name,false);
     this.setRoute(false);
   }
   beginNew(now){
     this.completed=false;this.nextIndex=0;
     this.setGroup('pilot',true);this.enter('pilot476',now);
     this.status='4.7.6 שלב א: חזיתות וחנויות ברובע המרכזי';
   }
   finishGroup(label,current,prior,group){
     const native=current?.native===true;
     const valid=!!current&&current.samples>0&&native;
     if(!valid){
       this.setGroup(group,false);
       const rec={stage:label,passed:false,unverified:true,native1080:native,
         note:'Full-HD samples unavailable. Stage disabled, not counted as a performance pass.'};
       this.reviews.push(rec);return false;
     }
     return this.compare(label,current,prior,()=>this.setGroup(group,false));
   }
   sample(frameMs,now,active){
     if(this.phase==='pilot476'||this.phase==='district476'||this.phase==='lobby476'||this.phase==='route476'){
       if(!active||!this.gl()||!Number.isFinite(frameMs)||frameMs<1||frameMs>500)return;
       if(!this.native()){
         this.status='4.7.6: פחות מ־1080p אמיתי, מפסיק בדיקות ומשבית פרטים';
         for(const group of ['pilot','district','lobby'])this.setGroup(group,false);
         this.enter('unverified476',now);return;
       }
       if(this.samples.length<this.maxFrames)this.samples.push(frameMs);
       if(now-this.phaseStart<4700)return;
       if(this.phase==='pilot476'){
         const m=this.record('pilot476');if(this.finishGroup('רחוב מסחרי',m,this.accepted,'pilot'))this.accepted=m;
         this.setGroup('district',true);this.enter('district476',now);
         this.status='4.7.6 שלב ב: זהות חזותית לשכונות ולמבנים';return;
       }
       if(this.phase==='district476'){
         const m=this.record('district476');if(this.finishGroup('שכונות',m,this.accepted,'district'))this.accepted=m;
         this.setGroup('lobby',true);this.enter('lobby476',now);
         this.status='4.7.6 שלב ג: גימורי לובי (דרושה גם בדיקה בתוך מבנה)';return;
       }
       if(this.phase==='lobby476'){
         const m=this.record('lobby476');
         if(!this.g.inside){
           this.reviews.push({stage:'לובי',unverified:true,passed:false,note:'No interior active during sampling. Lobby performance requires repeating F9 inside a lobby.'});
           // Keep the low-poly wall trim available; monitor still rolls it back on
           // sustained low FPS once an interior is actually visited.
         }else if(this.finishGroup('לובי',m,this.accepted,'lobby'))this.accepted=m;
         this.setRoute(true);this.enter('route476',now);
         this.status='4.7.6 שלב ד: רצף פעילות רכבים וניווט';return;
       }
       if(this.phase==='route476'){
         const m=this.record('route476');
         this.reviews.push({stage:'פעילות מסירת רכב',unverified:true,passed:false,
           observedFps:m?.fps??null,native1080:m?.native===true,
           note:'Mission logic is always active and was not separately A/B isolated. No claim that FPS did not regress.'});
         this.enter('monitor',now);this.completed=true;this.groupsVerified=true;
         this.status='בדיקה הסתיימה · יש לבדוק בנפרד בנהיגה, בטיסה ובלובי';return;
       }
     }
     if(this.phase==='unverified476'){
       // On a context resize, a manual F9 rerun is the safe recovery path.
       if(this.native())this.status='1080p חזר, הפעל F9 למדידה חוזרת';
       return;
     }
     const before=this.phase;
     super.sample(frameMs,now,active);
     if(before==='detail'&&this.phase==='monitor'&&this.gl()&&this.native())this.beginNew(now);
     // If the location changes *after* the stage A/B windows, shed the most
     // expensive optional 4.7.6 group in order; essential city is preserved.
     if(this.phase==='monitor'&&this.native()&&this.base?.fps>=50){
       this.sustainedSlow476=this.g.fps<48?this.sustainedSlow476+1:0;
       if(this.sustainedSlow476>300){
         for(const name of ['district','pilot','lobby'])if(this.g.renderer.groupFlags476?.[name]){
           this.setGroup(name,false);
           this.status='בקרת FPS מתמשכת: פרטי '+name+' הושבתו (1920×1080 נשמר)';
           this.reviews.push({stage:'late '+name,passed:false,regressed:true,
             note:'Sustained <48 FPS at native resolution after prior >=50 FPS baseline.'});
           break;
         }
         this.sustainedSlow476=0;
       }
     }
     if(this.phase==='monitor'&&this.g.inside&&this.g.renderer.groupFlags476?.lobby){
       // Interior-specific protection: retain native resolution, and shed
       // additional lobby trim if sustained throughput is below 50 fps.
       if(this.g.fps<45&&this.g.activeFrames>180){
         this.g._lowLobbyFrames476=(this.g._lowLobbyFrames476||0)+1;
         if(this.g._lowLobbyFrames476>180){this.setGroup('lobby',false);
           this.status='לובי: FPS נמוך לאורך זמן, גימורים אופציונליים הושבתו';}
       }else this.g._lowLobbyFrames476=0;
     }
   }
   report(){
     const base=super.report(),flags=this.g.renderer?.groupFlags476||{};
     return {...base,build:'4.7.6',stage:this.phase,
       newCityStages:{pilot:!!flags.pilot,district:!!flags.district,lobby:!!flags.lobby},
       deliveryMission:this.g.marketLoop476?.summary?.()||null,
       verification:{liveGpuTestCompleted:this.completed&&this.native(),
         benchmarkLimitation:'Moving game scenes are not identical between stages. FPS must be retested on the user GPU at 1920x1080, in a car, on foot and inside a lobby.'}};
   }
   download(){
     const data=JSON.stringify(this.report(),null,2),blob=new Blob([data],{type:'application/json'});
     const url=URL.createObjectURL(blob),a=document.createElement('a');
     a.download='SUNSET_STATE_476_STAGEWISE_1080P_FPS_REPORT.json';a.href=url;
     document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
   }
 }
 H.PerformanceGuard475=PerformanceGuard476;
})(Heatline);
