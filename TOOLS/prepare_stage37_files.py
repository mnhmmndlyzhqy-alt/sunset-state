#!/usr/bin/env python3
"""Prepare cumulative stage37 source/site files without destroying historical docs."""
import json,hashlib,shutil
from pathlib import Path
R=Path('/mnt/data/sunset_stage37_master');S=Path('/mnt/data/sunset_stage37_site')
B=R/'BACKUPS/STAGE37_OF105'; B.mkdir(parents=True,exist_ok=True)
for name in ['engine44.js','index.html','START_GAME.html','assets/stage37_render_optimization.js',
             'STAGE37_AB_BENCHMARK.html']:
 dst=S/name; dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/name,dst)

def baselinebackup(name):
 src=R/name
 if src.exists():
  dst=B/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
for name in ['PROJECT/105_STAGE_PLAN_HE.md','SITE_FILE_MANIFEST.json']:
 baselinebackup(name)
plan=R/'PROJECT/105_STAGE_PLAN_HE.md';data=plan.read_text()
needle='- 37. **אופטימיזציית רינדור**'
assert data.count(needle)==1
data=data.replace(needle,'- 37. **אופטימיזציית רינדור** — הושלם: אינדקס תאים מספרי, שימוש חוזר בבאפרים סטטיים, דילוג על ציור ריק; GPU QA פתוח.')
plan.write_text(data)
render=json.loads((R/'QA/STAGE37_RENDER_ACCEPTANCE_RESULT.json').read_text())
bench=json.loads((R/'QA/STAGE37_CELL_LOOKUP_BENCH.json').read_text())
report=f'''# SUNSET STATE — שלב 37/105: אופטימיזציית רינדור\n\n## בסיס ושימור\n\n- העבודה החלה מארכיון שלב 36 המאומת `SUNSET_STATE_STAGE36_OF105_FULL.zip` (1,141 קבצים).\n- קוד המשחק, המודלים, המפה, הכניסות, החנויות והשמירות קיימים במקור המצטבר. לא נוצר משחק חדש.\n- מקור שלב 36 כבר תועד כשחזור חלקי של קובצי מקור של שלבים 33–35; מגבלה היסטורית זו נותרה גם כאן.\n- גיבוי שלושת קובצי הריצה ששונו נמצא ב־`BACKUPS/STAGE37_OF105/`.\n\n## שיפורים פעילים בקוד המשחק\n\n1. אינדקס עמודות מספרי של תאי שטח בנפח 90 מטר במקום יצירת מפתח מחרוזת לכל בדיקת תא. הסינון מתבצע עדיין על אותם תאים ובאותו סדר; ה־`Map` המקורי נשמר.\n2. באפרים סטטיים של WebGL2 חוזרים להשתמש בשטח GPU שכבר הוקצה דרך `bufferSubData` כשגודל הנתונים מתאים, עם גידול מבוקר של עד 25% לבאפרים עד 8MiB. עותק הנתונים המועבר נשאר זהה.\n3. דילוג על קריאת ציור ריקה של קוביות סטטיות או דינמיות; אין שינוי במודלים שקיבלו משולשים לציור.\n4. חזרה מלאה למסלול הקריאות המקורי באמצעות `?stage37RenderOff=1` או `__SUNSET_STAGE37_RENDER_OFF=true`.\n5. כלי השוואת ביצועים `STAGE37_AB_BENCHMARK.html`, שמשתמש בניטור של שלב 36.\n\n## בדיקות A/B שבוצעו\n\n- בדיקת רינדור/סינון/העלאה: **{render['passed']}/{render['total']}**. השוואת זהות הפניות וסדר האובייקטים בשש עמדות מצלמה, בתזוזה וב־16 רענוני מצלמה רצופים.\n- גודל המדגם: **{render['sampledStatic']:,} מתוך {render['worldStatic']:,}** אובייקטים אמיתיים.\n- בדיקת העברת בתים: WebGL מדומה, הבתים הועברו ללא שינוי והופעלו מקרים של גידול, שימוש חוזר, היעדר נתונים, וכיבוי/הפעלה מחדש.\n- בדיקת מיקרו לחיפוש תאים: מפת עיר אמיתית בדגימה של {bench['workingSample']:,} אובייקטים, {bench['gridCells']} תאים, 6 עמדות מצלמה. זמן חציוני: ישן {bench['medianMs']['legacy']}ms, חדש {bench['medianMs']['indexed']}ms — יחס {bench['relativeRatio']}× **בפעולת חיפוש התאים בלבד**.\n- בדיקת סינון כוללת (לא FPS) על 16 רענונים: זמן חציוני ישן {render['boundedRefreshMs']['legacy']['p50']}ms, חדש {render['boundedRefreshMs']['optimized']['p50']}ms; p95 ישן {render['boundedRefreshMs']['legacy']['p95']}ms, חדש {render['boundedRefreshMs']['optimized']['p95']}ms. התוצאות אינן עקביות; **אין לטעון לשיפור FPS מוכח**.\n\n## רגרסיות\n\n- שמירות: 95/95, התנגשויות רכבים: 39/39, פנים וחנויות: 13/13, דמויות: 35/35, תנועת רכבים: 37/37, חיות: 46/46, בדיקות ניטור שלב 36: 33/33 + 16/16.\n- הבדיקות משתמשות במשחק אמיתי, רינדור CPU מדומה או API WebGL מדומה. לא בוצע רינדור GPU חומרתי.\n\n## עבודה שטרם אומתה\n\n- כרטיס מסך אמיתי — האם השינוי ל־bufferSubData מפחית stalls ב־driver או מחמיר אותם.\n- רזולוציה מקורית 1920×1080; יעד >=50 FPS; בדיקות A/B רצופות בעיר, בפנים, בגשם ובנהיגה.\n- קריאות ציור בפועל והעלאות VRAM אינן מאומתות במכשיר המשתמש; הנתונים של המיקרו אינם מבחן FPS.\n\n**השלב הבא: 38/105 — LOD חכם.**\n'''
(R/'PROJECT/STAGE37_RENDER_REPORT_HE.md').write_text(report)
status={'stage':37,'programmeTotal':105,'completed':True,'nextStage':38,
 'sourceBaseline':'SUNSET_STATE_STAGE36_OF105_FULL.zip',
 'historicalSourceLimitation':'PROJECT/STAGE36_SOURCE_PROVENANCE_HE.md',
 'changes':['numeric cell lookup','static GPU upload capacity reuse','skip empty instance draws'],
 'qa':{'renderAcceptance':[render['passed'],render['total']],'cellLookupMatch':bench['pass'],
    'save':[95,95],'vehicleCCD':[39,39],'interiors':[13,13],
    'characters':[35,35],'traffic':[37,37],'wildlife':[46,46],
    'stage36Profiler':[33,33],'stage36Integration':[16,16]},
 'nativeGPUVerified':False,'fullHd50FpsVerified':False,'publicDeployment':False}
(R/'PROJECT/STAGE37_CURRENT_STATUS.json').write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n')
readme='''# SUNSET STATE — שלב 37 מתוך 105\n\nשלב 37 הוסיף אופטימיזציה שמרנית למנוע WebGL2: חיפוש תאים מספרי, שימוש חוזר בזיכרון GPU המוקצה לרשתות סטטיות, והימנעות מקריאות ציור ריקות.\n\nהבדיקה המרכזית: `QA/run_stage37_render_acceptance.cjs`. דוח: `PROJECT/STAGE37_RENDER_REPORT_HE.md`.\n\nכדי לכבות את השיפור לשם השוואה: `index.html?stage37RenderOff=1`. כדי למדוד: `STAGE37_AB_BENCHMARK.html` דרך שרת HTTP מקומי.\n\nאין שינוי במודלים, במפה, בצללים, בשמירה או ב־LOD. אין אישור ל־50FPS על GPU אמיתי.\n\nארכיון שלב 36 נשמר כבסיס, וקובצי הריצה ששונו גובו תחת `BACKUPS/STAGE37_OF105`.\n'''
(R/'README_STAGE37_HE.md').write_text(readme)
(R/'README_STAGE37_GITHUB_PAGES_HE.md').write_text('''# גרסת דפדפן — שלב 37\n\nפרוס את תיקיית האתר דרך שרת סטטי HTTPS או HTTP מקומי. `index.html` מפעיל את המשחק.\n\nפתח `STAGE37_AB_BENCHMARK.html` להשוואה בין המנוע המשופר לגרסת הביקורת.\n\n`?stage37RenderOff=1` מכבה את השיפורים של שלב 37. `?stage36qa=1` מפעיל ניטור FPS/CPU/WebGL לפי בחירה.\n\nאין קישור ציבורי מפורסם ולא בוצעה בדיקת GPU.\n''')
(R/'QA/STAGE37_MANUAL_GPU_CHECKLIST_HE.md').write_text('''# שלב 37 — בדיקות חומרה נדרשות\n\n1. Chrome/Edge עם WebGL2 ו־GPU אמיתי; השאר 1920×1080 ומצב איכות זהה בשתי הריצות.\n2. בדוק במרכז העיר, מול חזיתות צפופות, סביב החנות שעוכבה בשלב 36, על גשרים, לובי וחוף.\n3. הפעל `STAGE37_AB_BENCHMARK.html`; בצע לפחות 3 סבבי A/B של 20 שניות ליחידת בדיקה, תוך שמירת JSON/CSV.\n4. השווה FPS p50/p95, זמני CPU וגאומטריה, Draw Calls, BufferData/BufferSubData, שימוש בזיכרון.\n5. סובב מצלמה מהר, חזור לאותה נקודה, החלף פנים/חוץ ובדוק הבהובים/אובייקטים חסרים.\n6. אם קיימת ירידה עקבית ב־FPS או באיכות, השתמש ב־`?stage37RenderOff=1` ודווח את קובצי המדידה.\n7. אין להצהיר על 50FPS או חסינות ב־GPU ללא הרצת בדיקה זו.\n''')
for name in ['README_STAGE37_HE.md','README_STAGE37_GITHUB_PAGES_HE.md','STAGE37_AB_BENCHMARK.html']:
 shutil.copy2(R/name,S/name)
status['publicFilesPending']=None
print('source docs prepared, site now',len([p for p in S.rglob('*') if p.is_file()]),'files')
