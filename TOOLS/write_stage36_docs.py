#!/usr/bin/env python3
"""Document Stage36 measurement evidence and the exact 36-105 roadmap."""
from pathlib import Path
import hashlib,json,datetime
root=Path(__file__).resolve().parent.parent
qa=root/'QA'
base=json.loads((qa/'STAGE36_BOUNDED_CPU_PROFILE.json').read_text())
checks=json.loads((qa/'STAGE36_PROFILER_ACCEPTANCE_RESULT.json').read_text())
assert checks['passed']==checks['total']==33

groups=[
('ביצועים ואופטימיזציה',['בדיקת ביצועים יסודית','אופטימיזציית רינדור','LOD חכם','טעינה הדרגתית','אופטימיזציית AI ופיזיקה','מבחני עומס']),
('גרפיקה מציאותית',['חומרים וטקסטורות PBR','תאורת שמש וצללים','השתקפויות וזכוכית','מזג אוויר ואטמוספרה','יום ולילה','גימור תמונה']),
('כבישים, תשתיות ועיצוב העיר',['תיקון רשת הכבישים','גשרים ומחלפים','מדרכות ותשתיות רחוב','שטח טבעי והפרשי גובה','חופים, נמלים ומקווי מים','פרטים סביבתיים']),
('בניינים וחללי פנים',['חזיתות בניינים','כניסות ולובי','מעליות וחדרי מדרגות','דירות ומשרדים','חנויות ומבני ציבור','חיבור פנים־חוץ ובדיקות']),
('הדמות הראשית והאנימציות',['אנטומיה ופרופורציות','שיפור הפנים','הליכה וריצה מקצועיות','קפיצה, נפילה וטיפוס','אינטראקציות','מצלמה ושליטה']),
('דמויות NPC ועולם אנושי חי',['מגוון דמויות','שגרת חיים','ניווט עירוני','אינטראקציות חברתיות','תגובות לאירועים','זיכרון והתנהגות עקבית']),
('נהיגה, רכבים ותחבורה',['פיזיקת נהיגה','מודלים ופנים רכבים','תאונות ונזקים','תנועה אזרחית','תחבורה ציבורית ומסילות','תחבורה ימית ואווירית']),
('משימות, כלכלה ומשחקיות',['מערכת משימות מורחבת','סיפורים ודמויות','כלכלה חיה','עסקים ומקומות שימושיים','התקדמות ותגמולים','איזון וחוויית משחק']),
('משטרה ובינה מלאכותית',['זיהוי עבירות','ניידות ומרדפים','שוטרים ברגל','מערכת דרגות חיפוש','מסוקים ויחידות מיוחדות','איזון המשטרה']),
('בעלי חיים ועולם טבעי',['דולפינים','דגים','תנינים','פלמינגו','אנפות וציפורי מים','מערכת אקולוגית משולבת']),
('סאונד וממשק משתמש',['סאונד סביבתי תלת־ממדי','אפקטים מדויקים','מוזיקה ואווירה','מפת משחק וניווט','ממשק מקצועי ונגיש']),
('שמירות, יציבות ובדיקות סופיות',['מערכת שמירה מלאה','שמירה אמינה ושחזור','בדיקות משחק ממושכות','בדיקות דפדפנים וחומרה','גימור ומסירה'])]
roadmap=[];n=36
md=['# SUNSET STATE — תוכנית המשך מדויקת, שלבים 36–105','',
 'השלבים 1–35 הושלמו בגרסת מועמדת לשחרור. שלב 36: בדיקת ביצועים. כל `המשך` מתקדם בשלב אחד בלבד.',
 'יש להתחיל מהארכיון האחרון, לבצע גיבוי, לשמר את המשחק, לבדוק ולתעד מגבלות.', '']
for section,titles in groups:
 md += ['## '+section,'']
 for title in titles:
  roadmap.append({'stage':n,'section':section,'title':title,'status':'completed' if n==36 else 'pending'})
  md.append(f'- {n}. **{title}**'+(' — הושלם: מדידת CPU, כלי דפדפן ומיפוי מגבלות.' if n==36 else ''))
  n+=1
 md.append('')
assert n==106 and len(roadmap)==70
(root/'PROJECT/105_STAGE_PLAN_HE.md').write_text('\n'.join(md)+'\n')
(root/'PROJECT/ROADMAP_36_105.json').write_text(json.dumps(roadmap,ensure_ascii=False,indent=2)+'\n')
progress={'project':'SUNSET STATE','stageProgramme':'36-105 AAA Polish','completedHistoricalStages':35,
 'currentStage':36,'nextStage':37,'completedStages':list(range(1,37)),
 'status':'stage36 local CPU and profiler tests passed; native hardware GPU remains unmeasured',
 'sourceOfTruth':'PROJECT/STAGE36_CURRENT_STATUS.json','lastRunnableBaseline':'SUNSET_STATE_STAGE35_GITHUB_PAGES_SITE.zip',
 'savesCompatible':True,'visualSignoff':False,'native1920x1080FPS50Verified':False,
 'stage36Modules':['assets/stage36_performance_audit.js'],
 'nextTitle':roadmap[1]['title']}
(root/'PROJECT/105_STAGE_PROGRESS.json').write_text(json.dumps(progress,ensure_ascii=False,indent=2)+'\n')
siteSha=hashlib.sha256(Path('/mnt/data/SUNSET_STATE_STAGE35_GITHUB_PAGES_SITE.zip').read_bytes()).hexdigest()
sourceSha=hashlib.sha256(Path('/mnt/data/SUNSET_STATE_STAGE32_OF35_FULL.zip').read_bytes()).hexdigest()
provenance=f'''# מקור גרסת שלב 36 — מידע שחובה לשמר

- **קוד הריצה העדכני** הועתק מארכיון האתר של שלב 35, SHA-256: `{siteSha}`. עותק הבסיס הזה אומת.
- קוד מקור וכלי QA שאינם כלולים בחבילת האתר הועתקו מארכיון המקור המלא האחרון שהיה זמין כאן: **שלב 32**, SHA-256: `{sourceSha}`.
- מסמכים זמינים של שלבים 33–35 מתוך `/mnt/data/sunset_stage35_work` שולבו בפרויקט.
- **ארכיון מקור מלא של שלב 35 לא נמצא בסביבת העבודה של שלב 36**. לכן ארכיון המקור החדש הוא **שחזור מצטבר על בסיס קוד הריצה של שלב 35 ומקורות שלב 32**; אין להצהיר כי הוא מכיל כל קובץ מקור/כלי QA מקורי שייתכן שנוסף בשלבים 33–35.
- קוד המשחק הפעיל, סקריפטי השלבים 33–34, מודלים, נתיבי טעינה, תכני העיר ושמירות במשחק נשמרו כולם מקובצי הריצה של שלב 35.
- קוד המשחק המקורי מגובה ב־`BACKUPS/STAGE36_OF105`; נוספה שכבת ניטור בתנאי `?stage36qa=1` בלבד.
- לא בוצעה מדידת GPU חומרתי או פרסום ציבורי. יעד 50FPS ב־1080p עדיין אינו מאומת.
'''
(root/'PROJECT/STAGE36_SOURCE_PROVENANCE_HE.md').write_text(provenance)
probes=base['cameraProbeScenarios'];heavy=max(probes,key=lambda x:x['cullingAfter60mMs'])
report=f'''# SUNSET STATE — דוח שלב 36 מתוך 105: מדידת ביצועים

## מה בוצע

- שוחזר קוד המשחק **העדכני של שלב 35** מתוך ארכיון האתר שאומת (ראה `STAGE36_SOURCE_PROVENANCE_HE.md`).
- נוספה שכבת ניטור בדפדפן אמיתי `assets/stage36_performance_audit.js`, **פעילה רק עם `?stage36qa=1`**. במצב רגיל אין שינוי בלולאת המשחק.
- 6 סצנות מדידה לבחירה ידנית, 3 שניות חימום ו־20 שניות מדידה, וייצוא JSON ו־CSV.
- נמדדים: קצב פריימים שנצבעו, p50/p95/p99 של זמן בין פריימים, זמני JavaScript ללולאה/עדכון/שליחת Draw, כמות קריאות ציור והעלאות Buffer; דגימות זיכרון JS אם הדפדפן מאפשר; זמן GPU רק אם `EXT_disjoint_timer_query_webgl2` נתמך.
- רזולוציה אמיתית נבדקת מול גודל Drawing Buffer; גם GPU פיזי נדרש לזיהוי. כאשר אינם מאומתים — הדוח אינו מציין עמידה ביעד.
- מדידות משחקיות בדפדפן **לא בוצעו במחשב המשתמש**; כלי המדידה מותקן לביצוען במחשב שלו.

## תוצאות CPU שבוצעו בפועל — לא FPS

בדיקת `QA/run_stage22_cpu_profile.cjs` משתמשת **ב־Game האמיתי, אך ברנדרר מדומה**. 8/8 בדיקות בסיס עברו. בעת טעינת הנתונים:
- אובייקטים סטטיים: {base['world']['staticObjects']:,}; NPC: {base['world']['pedestrians']}; כבישים: {base['world']['totalRoadSegments']}; חנויות: {base['world']['retailShops']}.
- תזמון גאומטריה דינמית: **90 דגימות**, זמן חציוני 3.295ms, ‏p95 ‏10.542ms (הריצה המקורית נשמרה בקובץ `QA/STAGE22_CPU_PROFILE.json`).
- זיכרון תהליך Node בזמן דגימות סינון המדגם: RSS ‏{base['processMemoryMiB']['rss']}MiB, ‏heap ‏{base['processMemoryMiB']['heapUsed']}MiB. **לא זיכרון דפדפן/VRAM**.

## שישה מדגמי סינון גאומטריה

כיוון שהבדיקה המקיפה על כלל העיר חרגה ממגבלת זמן הריצה, נמדדו **{base['world']['sampledStaticObjects']:,} מתוך {base['world']['staticObjects']:,} אובייקטים**, מדגם דטרמיניסטי של כל אובייקט 28. המיקומים הם עמדות בדיקת מצלמה, לא מסעות משחק אמיתיים.

| מדגם | מועמדים נראים | הקמת הסינון (ms) | תזוזה של 60 מטר (ms) |
|---|---:|---:|---:|
'''
for p in probes:
 report+=f"| `{p['label']}` | {p['visibleCandidates']:,} | {p['initCullingMs']} | {p['cullingAfter60mMs']} |\n"
report+=f'''

**חריגה בולטת:** `{heavy['label']}` — {heavy['cullingAfter60mMs']}ms בתזוזת מצלמה אחת במדגם. מדובר **בדגימה יחידה**, לא ברגרסיה מוכחת ולא בנתון של משחקיות בפועל. שלב 37 צריך לחזור על הבדיקה ולבחון רענון הסינון בפרופיל GPU/דפדפן אמיתי.

### בדיקות כלי האבחון

- **{checks['passed']}/{checks['total']} בדיקות יחידה** של הלוגיקה, הפעלה/כיבוי, ניקוי עטיפות GL, זיהוי רזולוציה/מצב סצנה ומדדי דיווח.
- אין סקריפט חיצוני שמעלה מידע לשרת; JSON/CSV נוצרים באמצעות הדפדפן המקומי.
- מעקב אחר `GPU timing` מבוסס שאילתה אסינכרונית ואינו מנסה לנחש נתונים שהדפדפן אינו חושף.

## מה עדיין פתוח

1. מדידה על GPU פיזי ב־1920×1080 ומעלה, בחירת 6 סצנות + אישור שהן בוצעו בפועל.
2. מדידת 50FPS באופן בלתי תלוי עם `?stage22qa=1` (מומלץ, כי כלי שלב 36 מוסיף תקורת מדידה).
3. בדיקת עומס של לפחות שעה, דליפות זיכרון, חימום, מעברים בין בניינים, עיר בלילה/גשם ואופטימיזציה לפי תוצאות.
4. בדיקות תמונה והתרשמות מתנועה ב־Chrome/Edge על חומרת היעד.

**שלב הבא: 37/105 — אופטימיזציית רינדור על סמך הנתונים האמיתיים.**
'''
(root/'PROJECT/STAGE36_PERFORMANCE_REPORT_HE.md').write_text(report)
manual='''# SUNSET STATE — הוראות בדיקת חומרה לשלב 36

1. פתח את האתר באמצעות שרת HTTP מקומי או אחסון סטטי; פתח `STAGE36_BENCHMARK_GUIDE.html`.
2. לחיצה על "התחל בדיקת המשחק" פותחת `index.html?stage36qa=1`.
3. פתח מצב **Native 1080p (F4)**, וודא שרזולוציית Drawing Buffer היא 1920×1080 לפחות.
4. עבור בפועל למרכז העיר ברגל; בחר את הסצנה ולחץ על אישור המיקום ואז "התחל מדידה".
5. חזור עבור: מרכז העיר בנהיגה, גשר/מחלף בנהיגה, מסוק, לובי פנימי, חוף/נמל ברגל. בדיקת המסוק דורשת אישור ידני למיקום והכלי לא מאשר אותו אוטומטית.
6. עבור כל סצנה: 3 שניות חימום ו־20 שניות מדידה רציפה. אל תחליף חלונות או תפתח תפריטים.
7. הורד JSON ו־CSV והעבר אותם לבדיקת שלב 37. אם GPU hardware/זמן GPU/זיכרון JS מוצגים "לא זמין" — אין להמציא ערכים.
8. לקביעת עמידה אמיתית ב־50FPS, הרץ בנפרד את הבדיקה הקלה של שלב 22: `index.html?stage22qa=1`.

הניטור בשלב 36 **מוסיף תקורת CPU מסוימת**; זמני CPU נמדדים בזמן אמת אבל אינם מדדים נקיים של משחק ללא ניטור. ללא כרטיס מסך פיזי ומדידות מהחומרה שלך אין אישור ביצועים ב־1080p.
'''
(root/'QA/STAGE36_MANUAL_HARDWARE_CHECKLIST_HE.md').write_text(manual)
(root/'README_STAGE36_HE.md').write_text('''# SUNSET STATE · שלב 36 מתוך 105

חבילת פרויקט מצטברת: מנוע המשחק העדכני של שלב 35, בתוספת פרופיילר ביצועים אופציונלי משלב 36, תוצאות מדידות CPU ותיעוד מלא של מגבלות המדידה.

**הפעלה רגילה:** `index.html` / `START_GAME.html` (אין שינוי במהלך המשחק).

**הפעלת בדיקת חומרה:** `STAGE36_BENCHMARK_GUIDE.html` או `index.html?stage36qa=1`.

**אימות:** `node QA/run_stage36_profiler_acceptance.cjs` וגם `node QA/run_stage36_bounded_cpu_audit.cjs`.

דוח: `PROJECT/STAGE36_PERFORMANCE_REPORT_HE.md`. שים לב: הרכבת המקור מורכבת מבסיס מקור שלב 32 וקוד ריצה מעודכן שלב 35, כמוסבר בתיעוד המקור.
''')
(root/'README_STAGE36_GITHUB_PAGES_HE.md').write_text('''# שלב 36 — אתר דפדפן סטטי

חלץ את החבילה לתיקיית אתר סטטי ופתח דרך HTTP. המשחק עצמו נפתח `index.html` כרגיל, בלי ניטור.

כדי לבדוק ביצועים אמיתיים, פתח `STAGE36_BENCHMARK_GUIDE.html` ומשם את `index.html?stage36qa=1`.

שש מדידות, דוחות JSON/CSV. כלי הניטור לא מעלה מידע לשרת; אין התחייבות ל־50FPS עד לקבלת נתוני חומרה אמיתיים.

לא פורסם אתר ציבורי במהלך שלב זה.
''')
status={'stage':36,'programTotal':105,'completed':True,'gpuHardwareMeasured':False,'realFpsMeasured':False,
 'cpuProfilerSyntheticTests':checks['passed'],'cpuProfilerSyntheticTotal':checks['total'],
 'sixBoundedCpuScenarios':len(probes),'sampledStaticObjects':base['world']['sampledStaticObjects'],
 'sourceProvenance':'PROJECT/STAGE36_SOURCE_PROVENANCE_HE.md','nextStage':37}
(root/'PROJECT/STAGE36_CURRENT_STATUS.json').write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n')
print('Wrote stage36 report, 70-stage plan and progress')
