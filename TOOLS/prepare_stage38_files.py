#!/usr/bin/env python3
"""Write precise cumulative stage38 LOD docs, one stage only, no runtime rebuilding."""
from pathlib import Path
import json,hashlib,shutil
R=Path('/mnt/data/sunset_stage38_master')
S=Path('/mnt/data/sunset_stage38_site')
a=json.loads((R/'QA/STAGE38_LOD_ACCEPTANCE_RESULT.json').read_text())
w=json.loads((R/'QA/STAGE38_LOD_WORKLOAD_CPU.json').read_text())
assert a['passed']==a['total']==84
assert a['convertedModels']==4944 and a['staticWorld']==196817
assert all(c['submittedChangePct']<0 for c in w['measured'])
plan=R/'PROJECT/105_STAGE_PLAN_HE.md'
t=plan.read_text()
for n,name in [(37,'אופטימיזציית רינדור'),(38,'LOD חכם')]:
 old=f'- {n}. **{name}**'
 new=f'- {n}. **{name}** — הושלם; ראה PROJECT/STAGE{n}_'
 if n==37:new+='RENDER_REPORT_HE.md.'
 if n==38:new+='LOD_REPORT_HE.md.'
 assert t.count(old)==1,(old,t.count(old))
 t=t.replace(old,new,1)
plan.write_text(t)
report=f'''# SUNSET STATE — שלב 38/105: LOD חכם ומבוקר

## מקור ושימור

- מקור מצטבר רשמי: `SUNSET_STATE_STAGE37_OF105_FULL.zip`, SHA-256 לפי `SUNSET_STATE_STAGE37_CHECKSUMS.txt`.
- שלב 38 משנה רק שלושה קובצי runtime (`engine44.js`, `index.html`, `START_GAME.html`) וקובצי תיעוד/מניפסט. נשמרו גיבויים לפני שינוי ב־`BACKUPS/STAGE38_OF105/`.
- כל מודלי המכוניות INTERCEPTOR, דמויות ה־NPC, מודלי בעלי החיים והבניינים וה־LOD שכבר נבנו בשלבים 11/17/18/30–32 נשמרים. אין שינוי במודל הפיזי, בגופי ההתנגשות, במבנים, במפה, או בפורמט השמירה.
- מוגבלות מקור היסטורית משלבים 33–35 נותרת מתועדת ב־`PROJECT/STAGE36_SOURCE_PROVENANCE_HE.md`; שלב 38 לא ממלא קובצי פיתוח שלא היו בבסיס.

## השינוי שבוצע בקוד

1. רמות פירוט גאומטריות אמיתיות (לא קוביות במקום מודלים): `urban_crown_lod38`, `urban_frond_lod38`, `sphere_lod38`, `cylinder_lod38`.
2. רק עצים, שיחים, כפות דקל וענפי עץ עם חומר `foliage` או `bark` עוברים את ההחלפה. שאר גאומטריית העיר נשארת זהה.
3. **4,944** חלקים מתוך **196,817** אובייקטי עולם נבחרו בפועל להתאמת LOD. פירוט הזיהוי הראשוני: {a['eligibleCandidates']} — חלקם כבר בעלי LOD מוגדר, והם מדולגים.
4. המרחק שנבחר תלוי בגודל האובייקט ונבדק מול מגבלת הנראות. המודל המלא נשמר בקרבת המצלמה, והמודל הקל נכנס במעבר dither משלים של 84 מטר (על בסיס shader קיים).
5. אובייקטי render-only זמניים לא משנים את מערך העולם, נתוני שמירה, AI או פיזיקה. WeakMap מייצר וממחזר עותקי LOD יציבים גם בין מנגנוני A/B.
6. אפשר לכבות: `?stage38LodOff=1` (או `__SUNSET_STAGE38_LOD_OFF=true` בקונסול ואז לרענן). החלפה דינמית באותה סצנה בונה מחדש את מטמון האובייקטים הגלויים ומבטלת את המטמון המספרי הישן של שלב 37.

## מדידות ובדיקות

- **84/84 בדיקות קבלה** של שלב 38: גאומטריה, משולשים, זהות חומרים/מיקום, 6 זוויות מצלמה, תזמון מעבר, A/B ומטמון.
- **70/70 בדיקות רינדור שלב 37** עברו מחדש, כולל A/B של אינדקס התאים ו־WebGL API מדומה.
- ברמת הגאומטריה של החלקים שהוחלפו, חישוב משולשים במצב רחוק: **{a['theoreticalFoliageTriangles']['before']:,} → {a['theoreticalFoliageTriangles']['after']:,}**, ירידה של **{a['theoreticalFoliageTriangles']['reductionPercent']:.2f}%**. זה חישוב גאומטרי, לא FPS.
- מדגם 16,281 אובייקטים (כולל כל האובייקטים הרלוונטיים ו־1/17 מהשאר): ב־6 זוויות, מספר משולשי הצמחייה שנשלחו *לכאורה* לציור לפי רשימת ה־CPU קטן ב־**{abs(max(x['submittedChangePct'] for x in w['measured'])):.1f}%–{abs(min(x['submittedChangePct'] for x in w['measured'])):.1f}%**. נעשה חישוב מספר המשולשים, לא פרופיל GPU; מספר מופעי הרינדור דווקא גדל בתוך אזורי המעבר.
- רגרסיות: שמירה 95/95, CCD רכב 39/39, פנים/חנויות 13/13, דמויות 35/35, רכבים 37/37, חיות 46/46, כלי ניטור 33/33 + 16/16.
- כל הקבצים שמקורם בשלב 37 נשמרו, ללא שינויים לא מתועדים. בדיקות חדשות תועדו תחת `QA/STAGE38_*`.

## מה **לא** נבדק

- לא בוצעה כאן בדיקת רינדור WebGL2 על כרטיס מסך פיזי, צילום מסך מאומת או בדיקת FPS ב־1920×1080.
- אין מדד אמיתי של שימוש ב־VRAM, זמן GPU או הבהוב גאומטריה בזמן נהיגה מהירה; חובת בדיקה בעזרת `STAGE38_LOD_AB_GUIDE.html` על מחשב המשתמש.
- התוצאה איננה הבטחה לשיפור FPS כללי. אם הדגם הרחוק יראה פחות טוב בחומרה מסוימת, ניתן לכבות את שלב 38 ללא שינוי בשמירה.

**השלב הבא: 39/105 — טעינה הדרגתית של אזורים, מודלים וטקסטורות.**
'''
(R/'PROJECT/STAGE38_LOD_REPORT_HE.md').write_text(report)
state={'project':'SUNSET STATE','stage':38,'programmeTotal':105,'completed':True,'nextStage':39,
 'baseSource':'SUNSET_STATE_STAGE37_OF105_FULL.zip','baseSite':'SUNSET_STATE_STAGE37_GITHUB_PAGES_SITE.zip',
 'sourcePreservationRequired':True,'historicalSourceLimitation':'PROJECT/STAGE36_SOURCE_PROVENANCE_HE.md',
 'renderOnlyLoDObjects':a['convertedModels'],'worldObjects':a['staticWorld'],
 'qa':{'stage38LOD':[84,84],'stage37Renderer':[70,70],'save':[95,95],
        'vehicleCCD':[39,39],'interiors':[13,13],'characters':[35,35],
        'traffic':[37,37],'wildlife':[46,46],'stage36Profiler':[33,33],'stage36Integration':[16,16]},
 'nativeGpuVerified':False,'fullHd50FpsVerified':False,'publicDeployment':False,
 'optOut':'?stage38LodOff=1'}
(R/'PROJECT/STAGE38_CURRENT_STATUS.json').write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n')
readme='''# SUNSET STATE — שלב 38 מתוך 105

LOD אמיתי לאובייקטי צמחייה רחוקים, עם מעבר dither חכם ומדורג המשמר צלליות, חומרים וצבעים.

- 4,944 עצים/שיחים/ענפים (חלקי רינדור) עברו לנתיב LOD. אין שינוי בקוד האופי, בגופי התנגשויות או במודלים המקוריים.
- 84/84 בדיקות קבלה; 70/70 בדיקות רינדור קודמות; 95/95 שמירות; 39/39 רכב; 13/13 חנויות; 35/35 דמויות; 37/37 תנועה; 46/46 חיות; 33/33 ו־16/16 שלב 36.
- שיפור תיאורטי של 60.65% במספר משולשי האובייקטים במצב רחוק; במדגם CPU הפחתה של 30.5%–51.7% במשולשים הנשלחים לציור. אין עדיין בדיקת FPS על GPU אמיתי.
- ביטול השדרוג: `?stage38LodOff=1`.
- `STAGE38_LOD_AB_GUIDE.html` מסביר איך להשוות באותו מחשב.

מידע נוסף: `PROJECT/STAGE38_LOD_REPORT_HE.md`.
''' 
(R/'README_STAGE38_HE.md').write_text(readme)
pub='''# Stage 38/105 — פתיחת גרסת הדפדפן

חלץ את חבילת האתר לשרת סטטי, למשל GitHub Pages או HTTPS אחר, והפעל `index.html` כרגיל.

- מצב LOD החדש מופעל כברירת מחדל.
- מצב בסיס: `index.html?stage38LodOff=1`.
- לניטור FPS באותו מחשב: `index.html?stage36qa=1` מול `index.html?stage36qa=1&stage38LodOff=1`.
- דף השוואה: `STAGE38_LOD_AB_GUIDE.html`.
- כל קובצי המשחק של שלב 37 נשמרו. אין קישור פרסום ציבורי מאומת בשלב זה.
- בדיקות CPU אינן מאשרות שיפור GPU או 50FPS ב־1920×1080.
'''
(R/'README_STAGE38_GITHUB_PAGES_HE.md').write_text(pub)
(R/'QA/STAGE38_MANUAL_GPU_CHECKLIST_HE.md').write_text('''# שלב 38 — בדיקות GPU ידניות שטרם בוצעו

- [ ] לפתוח את המשחק עם כלי ניטור שלב 36 על כרטיס מסך אמיתי.
- [ ] להשוות LOD מופעל וכבוי באותה רזולוציה/מקום/שעה/מזג אוויר.
- [ ] לרשום median/p95 FPS וזמני GPU, זיכרון ו־Draw Calls (ולא רק ממוצע FPS).
- [ ] לבדוק שש זוויות: מרכז העיר, גשרים, חוף, שכונות, דקל מקרוב, מגדלים.
- [ ] לעבור ליד צמרות עצים במרחקי 120–400 מטר ולחפש popping, חורים, flicker והבדלי צבע.
- [ ] לאמת צללים, גשם, שקיעה ותנועה מהירה (רכב ומסוק) בעשר דקות לפחות.
- [ ] לבדוק מעבר LOD לפני ואחרי כניסה לבניין ושמירה/טעינה.
- [ ] לוודא 50FPS ב־1920×1080 במחשב היעד; אם לא, לתעד ולהמשיך ל־39–41.

עד השלמת בדיקות אלה, אין אישור רינדור GPU מלא או יעד 50FPS.
''')
# Friendly self-contained browser guide, no proprietary images or network.
guide='''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SUNSET STATE · LOD A/B · שלב 38</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;font:16px system-ui,Arial,sans-serif;background:linear-gradient(140deg,#142638,#0b131f);color:#edf4fa}main{max-width:930px;padding:40px 24px;margin:auto}.eyebrow{letter-spacing:.2em;color:#7ab2ce;font-size:12px}h1{font-size:clamp(28px,5vw,48px);margin:10px 0}p{line-height:1.7;color:#c2cedb}section{background:#192b3c;border:1px solid #36516a;border-radius:20px;padding:24px;margin:25px 0}.links{display:flex;flex-wrap:wrap;gap:14px;margin-top:16px}a{background:#f1c48b;color:#142638;border-radius:12px;padding:12px 18px;text-decoration:none;font-weight:700}a.secondary{background:#2b4156;color:#edf4fa;border:1px solid #526981}ul,ol{line-height:2}code{color:#ffe5b0}small{color:#9badc1}</style></head><body><main><div class="eyebrow">SUNSET STATE / 38 OF 105</div><h1>השוואת LOD במחשב שלך</h1><p>בדיקה מדויקת של רמות הפירוט בצמרות, ענפים ושיחים. בשני המצבים המשחק ומיקומי האובייקטים זהים; רק מודל הרינדור הרחוק משתנה.</p><section><h2>פתיחת המשחק והשוואה</h2><div class="links"><a href="index.html?stage36qa=1" target="_blank" rel="noopener">LOD משופר + מדידה</a><a class="secondary" href="index.html?stage36qa=1&amp;stage38LodOff=1" target="_blank" rel="noopener">מצב מקורי + מדידה</a></div><p>מומלץ להשוות כל מצב בנפרד. פתיחת שני המשחקים במקביל עלולה לעוות את התוצאה.</p></section><section><h2>פרוטוקול הבדיקה</h2><ol><li>קבע 1920×1080 בהגדרות הרינדור ובדוק שזאת רזולוציית GPU אמיתית.</li><li>צפה בעצים, דקלים ושיחים גם מקרוב וגם מ־150–400 מטר.</li><li>השווה תנועת מצלמה ורכב, ופנייה מהירה מול צמרות; בדוק הבהוב וחורים.</li><li>בדוק מרכז עיר, גשרים, חוף, שכונה, פנים וחוץ.</li><li>ייצא JSON/CSV מכלי הביצועים של שלב 36, והשווה FPS חציוני ואחוזון 95.</li><li>אם מופיע הבדל בולט, כבה את Stage38 עד לתיקון; אין שינוי בנתוני השמירה.</li></ol></section><small>הערה: זהו דף בדיקה. נתוני CPU אינם תחליף למדידת GPU על חומרת היעד. לא פורסם שרת ציבורי.</small></main></body></html>'''
(R/'STAGE38_LOD_AB_GUIDE.html').write_text(guide)
# Copy only intended new and changed site files; preserve all other site content bitwise.
for rel in ['index.html','START_GAME.html','engine44.js','assets/stage38_adaptive_lod.js',
            'README_STAGE38_HE.md','README_STAGE38_GITHUB_PAGES_HE.md','STAGE38_LOD_AB_GUIDE.html']:
 p=S/rel;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/rel,p)
print('Wrote stage38 report, status, README, manual checklist, and site A/B guide. Site file count:',sum(p.is_file() for p in S.rglob('*')))
