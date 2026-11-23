/* SUNSET STATE Stage 26: optional in-game historical evidence collector.
   ?stage26qa=1 only. A PASS is USER-REPORTED, never automatic GPU/visual certification.
   Captures a real frame from the game's renderer.draw, not a generated illustration. */
(function(){
'use strict';
const PARAM='stage26qa';
if(!new URLSearchParams(location.search).has(PARAM)) return;
if(window.__SUNSET_STAGE26_QA)return;
const ISSUES=[{"id":"S01-RD-01","stage":2,"title":"תיקון היפוך מסלול בכביש northRing","how":"סע בשני הכיוונים בכביש הטבעת הצפוני ובדוק רציפות מסלול.","expected":"Vehicles traverse northRing both ways without U-turn, clipping, unexplained braking or teleport; map layout remains unchanged."},{"id":"S01-RD-02","stage":3,"title":"תיקון פנייה חדה בכביש privateSpine469","how":"סע בעיקול privateSpine469 ובדוק היעדר פניית פרסה מפתיעה.","expected":"AI and player maintain appropriate road-lane continuity through the bend."},{"id":"S01-BL-01","stage":4,"title":"הנגשת כניסות קיימות לבניינים","how":"היכנס למבנה ותיק, בדוק מעבר דרך דלת, יציאה ומפלסי קומות.","expected":"Entry, floor changes, and return to street work in the selected target buildings, without fake decorative-only entries."},{"id":"S01-BL-02","stage":5,"title":"הוספת כניסות למבנים החדשים","how":"היכנס לכמה מבני CITY20 חדשים, דרך הדלת הפיזית ובחזרה.","expected":"Important mapped buildings have doors placed on usable street-facing sides and walkable interiors."},{"id":"S01-BL-03","stage":6,"title":"התאמת כיוון הדלתות לחזיתות","how":"בדוק דלתות הפונות לצד הרחוב בארבעה כיוונים.","expected":"Doors around test blocks align naturally with street faces without clipping into walls or traffic."},{"id":"S01-BL-04","stage":7,"title":"התאמת כיוון בניינים למבנה הרחובות","how":"בדוק מבנים הסמוכים לכבישים נטויים ואת התאמת הדלתות.","expected":"Buildings relate to road directions instead of a globally uniform grid; parking and doors remain navigable."},{"id":"S01-BL-05","stage":8,"title":"שדרוג חלונות בחזיתות צד ואחור","how":"התבונן בחזיתות הצד ובגב המבנים ובפרטי החלונות.","expected":"Building facade variety holds up from street corners and in overhead camera views."},{"id":"S01-BL-06","stage":9,"title":"בדיקת כניסות המסווגות כמים","how":"בדוק כניסות ליד קו החוף וודא שאין כניסה פעילה בתוך מים.","expected":"No entrance or wall visually sits in incorrect water/terrain; no existing valid coastal portal is moved arbitrarily."},{"id":"S01-ST-01","stage":10,"title":"בדיקה ומיקום מחדש של אדניות בעייתיות","how":"בדוק אדניות ליד דלתות, מדרכות, כבישים ותעלות.","expected":"No props appear inside roads, canals or safe walking corridors; road and door map preserved."},{"id":"S01-ST-02","stage":11,"title":"בדיקה ומיקום מחדש של 30 פנסי רחוב חשודים","how":"בדוק פנסים בגובה הקרקע ואת המרחק מכבישים.","expected":"No streetlights float, overlap road lanes or clip building entrances."},{"id":"S01-ST-03","stage":12,"title":"התנגשויות לחפצי רחוב מוצקים","how":"נסה להיתקל באדנית, עמודון ופנס בלי לעבור דרכם.","expected":"Player and vehicles cannot phase through bollards/planter bases in a controlled test."},{"id":"S01-IN-01","stage":13,"title":"השלמת ריהוט בשבע מבואות","how":"היכנס לשבעת הלובאים הצרים ובדוק ריהוט ומעברים.","expected":"Every target ready lobby has working accessible fixtures and no fake inaccessible rooms."},{"id":"S01-IN-02","stage":14,"title":"השלמת תאורת פנים מתפקדת","how":"השווה תאורה בלובי ביום, בלילה ובקומות שונות.","expected":"Interior lamps visibly illuminate adjacent surfaces at night without breaking 50 FPS target."},{"id":"S01-IN-03","stage":15,"title":"חללי פנים נגישים, התנגשות ואינטראקציות","how":"התקרב לריהוט בתוך מבנה, בדוק התנגשות והפעלת E.","expected":"Furniture cannot be walked through where solid and working floors link to actual paths."},{"id":"S01-GL-01","stage":16,"title":"שילוב חלונות נבחרים במערכת הזכוכית השבירה","how":"ירה על חלון נבחר, בדוק סדקים ושברים ולאחריהם רסיסים.","expected":"A controlled impact can affect intended windows without shattering unrelated decorative geometry."},{"id":"S01-RT-01","stage":17,"title":"בדיקת רגרסיה ושימור תיקון 60 העסקים","how":"היכנס לחנות, קנה פריט, צא ובדוק שירות רחוב.","expected":"All intended commercial venues have storefront metadata and stable visible entry/counter access."},{"id":"S01-WL-01","stage":18,"title":"שיפור LOD ומעברי דגמים לתנינים","how":"התקרב והתרחק מתנין וצפה במעברי פירוט ללא קפיצות.","expected":"No abrupt model silhouette changes in a fixed-distance fly-in/walk-in test; GPU budget monitored."},{"id":"S01-SV-01","stage":19,"title":"שמירה וטעינה מלאות של מצב המשחק","how":"שמור בכמה משבצות, צא, טען ובדוק כסף, משימה ומיקום.","expected":"Reload returns to a user-saved position and important gameplay/vehicle state without corrupting old progress."},{"id":"S01-AI-01","stage":20,"title":"תיקון ניווט הולכי רגל בצמתים ובעומסים","how":"צפה בהולכי רגל בצומת עמוס ובדוק שאין הליכה לתוך מכשולים.","expected":"Pedestrians navigate crossings and varied streets in 10+ minute real play without repeated deadlocks or teleportation."},{"id":"S01-PH-01","stage":21,"title":"בדיקת התנגשויות מהירות וחדירת מחסומים","how":"בדוק פגיעה ברכב במחסום צר במהירות, בלי מעבר דרך הקיר.","expected":"No collision tunneling or arbitrary vehicle hanging at critical bridges and roadside solids."},{"id":"S01-PF-01","stage":22,"title":"אימות 50 FPS ב־1920×1080 עם GPU אמיתי","how":"בצע מדידת stage22qa ב־1920×1080 על GPU חומרתי; נדרשות 6 סצנות.","expected":"At least 50 sustainable display FPS plus p95<=20ms in target scenes, with internal render buffer actually 1920x1080."},{"id":"S01-PF-02","stage":23,"title":"מדידת עומס גאומטריה, זיכרון וקריאות ציור","how":"בצע מדידת stage23qa וייצא ספירת draw calls והעלאות נתונים.","expected":"No unacceptable startup delay, frame spikes or memory growth in real 10+ minute sessions."},{"id":"S01-PR-01","stage":24,"title":"איחוד מסמכי התקדמות וגרסאות","how":"השווה מצב תוכנית 35 השלבים לרישומי הבדיקות והגרסאות.","expected":"All progress files agree about Recovery 7/7 and Stage 1 status."},{"id":"S01-PU-01","stage":25,"title":"אריזה נוחה ופרסום למשחק הדפדפן","how":"פתח את האתר דרך GitHub Pages או שרת HTTP וודא טעינת נכסים.","expected":"Player can open the published game without manually installing dependencies."},{"id":"S01-QA-01","stage":26,"title":"סגירת תקלות היסטוריות עם ראיות משחק","how":"בצע תרחישים מכל הסעיפים, שמור צילומי משחק וייצא דוח.","expected":"Bug ledger records PASS/FAIL/NOT TESTED with exact scene screenshots and coordinates."}];
const K='SUNSET_STAGE26_QA_REPORT_V1';
const records={};let selected=ISSUES[0].id;
let startedAt=new Date().toISOString();
try{const old=JSON.parse(localStorage.getItem(K)||'null');if(old?.schema===1){Object.assign(records,old.records||{});startedAt=old.startedAt||startedAt;}}catch(_){}
const state={issues:ISSUES,records,source:'Real SUNSET STATE browser user observations',realGpuCertified:false,
 app:null,ready:false,capturedFrames:0,exportReport:null,captureFrame:null,snapshot:null,setMark:null};
window.__SUNSET_STAGE26_QA=state;
const readGame=()=>window.__SUNSET_PERFORMANCE06_GAME||null;
function snapshot(){
 const g=readGame(),w=g?.world,r=g?.renderer,gl=r?.gl;
 let version=null,renderer=null,vendor=null;
 if(gl&&typeof gl.getParameter==='function'){
  try{version=String(gl.getParameter(gl.VERSION)||'');renderer=String(gl.getParameter(gl.RENDERER)||'');vendor=String(gl.getParameter(gl.VENDOR)||'');}catch(_){}
 }
 return {capturedAt:new Date().toISOString(),source:g?'actual game in this browser':'game unavailable',
  gameLoaded:!!g,gameRunning:!!g?.running,inside:!!g?.indoor,retail:!!g?.retailVisit,
  position:g?.avatar?[Number(g.avatar.x.toFixed(2)),Number(g.avatar.z.toFixed(2))]:null,
  world:g?{roads:w?.roads461?.length??null,activeEntrances:w?.entrancePortals?.filter(p=>p.interiorReady).length??null,
   shops:w?.retailShops?.length??null,glass:w?.glassPanels?.length??null,
   allBoxes:w?.boxes?.length??null,collision:w?.solids?.length??null,
   props:w?.propSolids?.length??null,crocodiles:g?.stage39Life?.wildlife?.filter(a=>a.kind==='crocodile').length??null}:null,
  display:{canvas:[r?.canvas?.width??null,r?.canvas?.height??null],rendererName:r?.name||null,
   webglVersion:version,vendor,renderer},
  note:'This snapshot is diagnostic metadata, not visual proof, hardware-GPU benchmark, or native FPS validation.'};
}
state.snapshot=snapshot;
function persist(){try{localStorage.setItem(K,JSON.stringify({schema:1,startedAt,records}));}catch(_){}}
function setMark(issueId,mark,notes){
 if(!ISSUES.some(i=>i.id===issueId)||!['pass','fail','unverified'].includes(mark))return false;
 records[issueId]={mark,notes:String(notes||'').slice(0,1200),recordedAt:new Date().toISOString(),
   snapshot:snapshot(),provenance:'manual judgement by person operating the actual game, NOT automated QA'};
 persist();refresh();return true;
}
state.setMark=setMark;
function report(){
 const byStatus={pass:0,fail:0,unverified:0,notTested:0};
 for(const issue of ISSUES){const s=records[issue.id]?.mark;if(s in byStatus)byStatus[s]++;else byStatus.notTested++;}
 return {schema:'SUNSET_STAGE26_MANUAL_EVIDENCE_V1',startedAt,exportedAt:new Date().toISOString(),
  warning:'PASS statuses are user reports; screenshots must be inspected; browser evidence is NOT GPU/50FPS certification.',
  project:'SUNSET STATE',stage:26,originalIssueCount:ISSUES.length,byStatus,issueDefinitions:ISSUES,
  results:records,latestSnapshot:snapshot(),screenshotsAreSeparateLocalDownloads:true,
  certified50Fps1080p:false,verifiedHardwareGpuByThisTool:false};
}
state.exportReport=report;
function download(name,body,type){
 const blob=new Blob([body],{type}),url=URL.createObjectURL(blob);const a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function exportReport(){download('SUNSET_STAGE26_BROWSER_EVIDENCE.json',JSON.stringify(report(),null,2),'application/json');}
// Capture the real WebGL canvas synchronously immediately after the game's paint call.
// This avoids fake screenshots and avoids capturing a cleared preserveDrawingBuffer:false buffer.
function captureFrame(issueId=selected){
 const g=readGame(),r=g?.renderer,c=r?.canvas;
 if(!g||!r||!c||typeof r.draw!=='function'||typeof c.toDataURL!=='function')return {ok:false,reason:'No active game renderer'};
 if(state.awaitingFrame)return {ok:false,reason:'Another screenshot capture is pending'};
 const original=r.draw;state.awaitingFrame=true;
 let done=false;
 r.draw=function(){
  let output;
  try{output=original.apply(this,arguments);}finally{
   if(r.draw===wrapped)r.draw=original;
   done=true;state.awaitingFrame=false;
   try{
    const url=c.toDataURL('image/png');
    if(!/^data:image\/png;base64,/.test(url)||url.length<5000)throw Error('Blank or inaccessible framebuffer');
    const name='SUNSET_STAGE26_'+issueId.replace(/[^a-zA-Z0-9-]/g,'')+'_'+Date.now()+'.png';
    const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    state.capturedFrames++;
    if(records[issueId]){records[issueId].screenshots=(records[issueId].screenshots||[]).concat(name).slice(-20);persist();}
    if(msg)msg.textContent='צילום מתוך הרינדור האמיתי נשמר: '+name;
   }catch(e){if(msg)msg.textContent='לא ניתן ללכוד את הקנבס: '+String(e.message||e)+' — השתמש בצילום מסך של הדפדפן.';}
  }
  return output;
 };
 const wrapped=r.draw;
 setTimeout(()=>{if(!done&&r.draw===wrapped){r.draw=original;state.awaitingFrame=false;if(msg)msg.textContent='לא התקבל פריים בזמן. הפעל את המשחק ונסה שוב.';}},4000);
 return {ok:true,pending:true};
}
state.captureFrame=captureFrame;
let msg=null,dropdown=null,detail=null,notes=null,summary=null;
function el(tag,text,css){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(css)e.style.cssText=css;return e;}
function button(label,handler){const b=el('button',label,'padding:7px 9px;margin:3px;border-radius:7px;border:1px solid #a4c6d8;background:#183c4c;color:#fff;cursor:pointer;font:12px Arial');b.type='button';b.addEventListener('click',handler);return b;}
function refresh(){if(!summary||!detail)return;const done=ISSUES.filter(i=>records[i.id]?.mark==='pass').length;
 summary.textContent='דיווחי PASS ידניים: '+done+'/'+ISSUES.length+' · צילומי קנבס: '+state.capturedFrames+' · GPU/FPS: לא מאומת';
 const item=ISSUES.find(i=>i.id===selected)||ISSUES[0];
 detail.textContent='['+item.id+'] '+item.title+'\nמה לבדוק: '+item.how+'\nקריטריון מקורי: '+item.expected+'\nמצב: '+(records[item.id]?.mark||'לא נבדק');
 if(notes&&document.activeElement!==notes)notes.value=records[item.id]?.notes||'';
}
function boot(){if(state.ready)return;state.ready=true;
 const host=el('aside',null,'position:fixed;z-index:99999;top:12px;right:12px;width:min(390px,calc(100vw - 24px));max-height:84vh;overflow:auto;direction:rtl;text-align:right;color:#f0f7ff;background:#102733f2;border:1px solid #729bab;border-radius:12px;padding:12px;box-shadow:0 12px 30px #0009;font:12px/1.5 Arial,system-ui');
 host.id='sunset-stage26-evidence';const title=el('strong','SUNSET STATE | ביקורת היסטורית 26/35','display:block;font-size:17px;color:#ecd59d;margin-bottom:7px');
 const warning=el('p','זהו כלי לאיסוף ראיות ממשחק אמיתי. סימון ״עבר״ הוא דיווח שלך בלבד, לא אישור אוטומטי, ולא בדיקת 50FPS.','margin:6px 0');
 summary=el('div','','padding:7px;border-radius:7px;background:#254657;margin:8px 0');
 dropdown=el('select',null,'width:100%;padding:8px;color:white;background:#244657;border:1px solid #659aad;border-radius:6px;margin-bottom:8px');
 for(const s of ISSUES){const o=el('option',s.stage+'/35 · '+s.id+' · '+s.title);o.value=s.id;dropdown.append(o);} dropdown.value=selected;
 dropdown.addEventListener('change',()=>{selected=dropdown.value;refresh();});
 detail=el('pre','','font:12px/1.6 Arial,system-ui;white-space:pre-wrap;max-height:190px;overflow:auto;margin:5px 0;padding:8px;background:#1a3a48;border-radius:8px');
 notes=el('textarea',null,'box-sizing:border-box;width:100%;height:57px;color:white;background:#153642;border:1px solid #729bab;border-radius:6px;padding:5px;resize:vertical');
 notes.placeholder='הערות, מיקום, מה בדיוק ראית או נבדק…';notes.addEventListener('keydown',e=>e.stopPropagation());notes.addEventListener('keyup',e=>e.stopPropagation());
 const controls=el('div');controls.append(button('עבר (דיווח ידני)',()=>setMark(selected,'pass',notes.value)),button('נכשל',()=>setMark(selected,'fail',notes.value)),button('לא אומת',()=>setMark(selected,'unverified',notes.value)));
 const ops=el('div');ops.append(button('צילום פריים אמיתי',()=>{const s=captureFrame();if(!s.ok)msg.textContent=s.reason;}),button('ייצוא JSON',exportReport));
 msg=el('div','יש להפעיל את המשחק לפני צילום מסך.','font-size:11px;white-space:pre-wrap;margin:6px 0;color:#e3ddb6');
 const close=button('הסתר חלונית',()=>{host.style.display='none';const reopen=button('QA 26',()=>{host.style.display='block';reopen.remove()});reopen.style.cssText='position:fixed;top:7px;right:7px;z-index:99999;padding:7px;background:#164b59;color:white;border:1px solid white';document.body.appendChild(reopen)});
 host.append(title,warning,summary,dropdown,detail,notes,controls,ops,msg,close);document.body.appendChild(host);state.app=host;refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
