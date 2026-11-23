from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[1]
def put(n,s):
 p=r/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s.strip()+'\n','utf8')
def jsonput(n,o):put(n,json.dumps(o,ensure_ascii=False,indent=2))
sha=hashlib.sha256((r.parent/'SUNSET_STATE_STAGE28_OF35_FULL.zip').read_bytes()).hexdigest()
print('STAGE28_SOURCE_SHA',sha)
qa=json.loads((r/'QA/STAGE29_ACCEPTANCE_RESULT.json').read_text())
reg=json.loads((r/'QA/STAGE29_REGRESSION_SMOKE_RESULT.json').read_text())
assert qa['passed']==qa['total']==13 and reg['passed']==reg['total']==8
put('PROJECT/STAGE29_OF35_REPORT_HE.md',f'''# SUNSET STATE — שלב 29 מתוך 35 | פנים, חנויות, מעליות ותאורה

**בסיס העבודה האמיתי:** `SUNSET_STATE_STAGE28_OF35_FULL.zip` עם SHA-256 `{sha}`. הארכיון המקורי נשמר בנפרד ללא שינויים.

## מה בוצע בקוד

1. נוסף `assets/stage29_interior_retail_polish.js` המותקן אחרי מערכת הפנים של שלב 15 ואחרי החנויות והשמירות. סצנות הפנים ממשיכות להיבנות באופן עצל (on-demand) על בסיס המודלים והמערכות הקיימות.
2. חללי פנים: שלושה פסי גמר ותאורה מוגבלת על תקרת המסדרון; שלט קומות ופיזור תאורה אמיתי בפתח המעלית; שני פסי רצפה דקים משני צידי הפתח; גמר קיר מעל דלפק הקבלה בקומת הלובי. פרטים מובחנים לפי חומר המבנה וקומה. הכל בלי הוספת קירות או גופי התנגשות.
3. חנויות: פסי תקרה, קווי גמר בחלק האחורי, הצללה מעל הכניסה; שני מקורות אור GPU קיימים-בצינור-הקיים לכל סצנת חנות (ליד הכניסה וליד הקופה). לוח הצבעים מותאם לסוג העסק.
4. מעלית ושילוט: מידע דינמי על קומה, המרחק אל לוח המעלית, מצב נסיעה, הגעה ליעד והנחיה למדרגות. בחנות מופיע מרחק לדלפק ומקשי הפעולה. המידע נוסף ל-HUD הקיים בלי לשנות לחצנים או מעבר קומות.
5. שימור: 52 כבישים, 1,982 פרטי חזית של שלב 28, 214 כניסות פעילות, 59 חנויות, 988 לוחות זכוכית, 3,230 גופי עולם ו-796 גופי רחוב נשארו בדיוק במספרם. אין גופי התנגשות חדשים בסצנות שבוצעו בהן השינויים.
6. גבולות עומס: לכל חלל פנים עד תשעה פרטי גאומטריה חדשים ומקור אור אחד; לכל חנות עד חמישה פרטים חדשים ושני מקורות אור. מנגנון התאורה של שלב 14 נשאר מוגבל ל-12 אורות שנשלחים לשיידר; טווחי נראות הפרטים החדשים 15–165 מטר.
7. תאימות: `?stage29InteriorsOff=1` משבית את שכבת השדרוג בלבד וחוזר לסצנות הבסיס. הגדרות השמירה, הכסף, המשימות, העסקאות, דלתות הפנים, המדרגות והגשרים אינן משתנות.

## ראיות בדיקות אוטומטיות

- **13/13** בדיקות קבלה על קוד העולם האמיתי ב-Node עם רנדרר מדומה. נבדקו **214/214 חללי פנים פעילים**, 10 קומות נוספות ו-**59/59 חנויות**. בוצעו **56 השוואות A/B** של סצנות הפנים. 0 תקלות אבחון.
- **95/95** בדיקות שמירה/טעינה של שלב 19 הושלמו מחדש בהצלחה.
- **39/39** בדיקות התנגשויות רכב של שלב 21 הושלמו מחדש בהצלחה.
- **8/8** בדיקות שימור קצרות של מנגנון הניווט ומערכות העולם עברו.
- **לא הושלמה** רגרסיית Stage20 הארוכה (הגיעה למגבלת זמן הריצה). אין להציג את 22/22 שלה כהישג חדש של שלב 29.

## מגבלות פתוחות

אין אישור חזותי של חללי הפנים על GPU אמיתי, בדיקת FPS ב-1920×1080/50FPS, סקר נגישות במעבר רציף בכל דלת או בדיקת פרסום GitHub Pages ציבורית. גם לא הוכח שהמשחק הגיע לרמת AAA פוטוריאליסטית.

### המשך

**שלב 30:** ליטוש שחקן, פנים, אנימציות ודמויות NPC. השינויים הבאים חייבים להיבנות רק על בסיס קובץ שלב 29.
''')
put('README_STAGE29_CHANGES_HE.md',f'''# SUNSET STATE — גרסת שלב 29/35

זהו **המשך ישיר** של קוד המשחק והנכסים המלאים של שלב 28, ללא בנייה מחדש.

- נוסף מודול ליטוש פנימי מקומי ואופציונלי: `assets/stage29_interior_retail_polish.js`.
- נבדקו 214 בניינים נגישים ו-59 סצנות חנויות, עם תאורה משתלבת במנוע המקורי ושילוט ממוקד למעליות, לדלפקים ולחנויות.
- עד תשעה פרטים חדשים למבנה בזמן כניסה ועד חמישה לחנות; גופי התנגשות, דלתות, רשומות בניין ומצבי שמירה נשארו כפי שהיו.
- בדיקות קוד: 13/13 קבלה, 95/95 שמירות, 39/39 CCD, 8/8 בדיקות ניווט קצרות. בדיקת ניווט ממושכת חרגה מהמגבלה.
- A/B: הוסף `?stage29InteriorsOff=1` לכתובת המשחק כדי לבטל רק את השדרוג החדש.
- **לא נבדקו:** GPU חומרתי, 50FPS ברזולוציית 1080p, איכות רינדור אנושית ופרסום ציבורי.

## הפעלה

פתח את אתר המשחק דרך שרת HTTP מקומי (למשל `python -m http.server 8000` בתוך תיקיית האתר), ואז `http://localhost:8000/index.html`. לפרסום מרוחק השתמש בחבילת GitHub Pages הייעודית.
''')
put('README_STAGE29_GITHUB_PAGES_HE.md',f'''# SUNSET STATE 29/35 — חבילת GitHub Pages

1. חלץ את ארכיון האתר כך ש-`index.html`, `START_GAME.html` ו-`assets/` יהיו בשורש.
2. העלה את התוכן, כולל `.nojekyll`, למאגר GitHub Pages (Deploy from branch או GitHub Actions).
3. אמת בכתובת הציבורית את טעינת המשחק ללא 404 בקבצים ונסה כניסה לחנות ולמעלית.
4. בדוק השוואה `?stage29InteriorsOff=1`; בדוק את תאורת החנויות בלילה, נגישות הדלתות ומחירי קנייה.
5. בדוק FPS ב-1920×1080 על כרטיס גרפי אמיתי. **אין אישור ל-50FPS מהמבחנים המקומיים.**

החבילה נבדקת מקומית בלבד; **לא פורסמה באתר ציבורי**.
''')
put('QA/STAGE29_MANUAL_WEBGL_CHECKLIST_HE.md','''# רשימת QA ידנית — שלב 29

בדוק במחשב עם GPU אמיתי ובשרת HTTP, לא ב-Node עם renderer מדומה.

- [ ] בצע כניסה הליכתית ללובי של 4 בניינים גדולים ו-4 בתים קטנים; ללא התנגשות בלתי-נראית או חפיפת רהיטים עם המעבר.
- [ ] עבור מ-0 לקומה 1 במעלית ובמדרגות, חזור ללובי ובדוק התאמה לשילוט.
- [ ] בדוק בניינים קטנים ללא קומות: הממשק אינו מציע קומת פנטום, וההנחיות אינן מסתירות כפתורים.
- [ ] בדוק 6 סוגי חנויות, התקרבות לדלפק, קנייה, יציאה בהליכה דרך הדלת; בלי שינוי במלאי או בכסף.
- [ ] בדוק לילה/יום: תאורת מעברים, מעליות, תקרה וחנויות משתנה בעוצמה ונשארת תחת 12 אורות לשיידר.
- [ ] ודא שהשינוי מופיע רק כשפעיל, ונעלם עם `?stage29InteriorsOff=1` ללא פגיעה בנכסים הקודמים.
- [ ] בדוק זליגת אור, z-fighting, חפיפות של שלטי המעלית והקבלה עם התקרה.
- [ ] הרץ 1080p חומרתי במשך לפחות 10 דקות עם FPS/p95 וצלם ראיות מתוך המשחק עצמו; ללא טענה מוקדמת ל-50FPS.
- [ ] בדוק לאחר שמירה/טעינה חזרה לחנות, התקדמות קומה וסיום משימה.
- [ ] אמת HTTP ו-WebGL2 בפריסה הציבורית אם בוצעה העלאה בפועל.
''')
# Update cumulative plan, inserting the new stage summary at the top.
p=r/'PROJECT/35_STAGE_PLAN_HE.md';s=p.read_text('utf8')
s=s.replace('## Current stage: 28/35 - existing building facades CPU/A-B accepted; hardware GPU/visual pending',
 '''## Current stage: 29/35 - interior/retail polish accepted in CPU A/B; GPU/visual pending''',1)
needle='**הנחיית עבודה:**'
assert needle in s
s=s.replace(needle,
 '''Stage29 continued from the uploaded Stage28 cumulative archive. On-demand polishing adds at most 9 decorative meshes and one real lamp to each active interior scene and 5 decorative meshes and two lamps per shop scene. All 214 active interior plans and 59 shops were exercised in CPU QA, including 56 A/B scene comparisons; 13/13 checks passed. The Stage20 long test timed out; short navigation smoke 8/8 and Stage19 save 95/95 / Stage21 CCD 39/39 passed. **Native GPU/1080p 50FPS and visual QA remain open.** Source: `PROJECT/STAGE29_CURRENT_STATUS.json`.

'''+needle,1)
s=s.replace('| 29 | ליטוש פנים, חנויות, מעליות ותאורה | ממתין |',
 '''| 29 | ליטוש פנים, חנויות, מעליות ותאורה | **קוד ובדיקות CPU הושלמו:** 214/214 חללי פנים, 59/59 חנויות, 56 A/B, 13/13 קבלה; 0 גופי התנגשות נוספים. **GPU/FPS ואימות חזותי פתוחים** |''',1)
p.write_text(s,'utf8')
# Preserve progress history, do not rewrite earlier stages.
p=r/'PROJECT/35_STAGE_PROGRESS.json';obj=json.loads(p.read_text())
assert obj['currentStage']==28 and obj['nextStage']==29
obj['currentStage']=29;obj['nextStage']=30
obj['completedStages'].append(29)
if 29 not in obj['completedTechnicalStages']:obj['completedTechnicalStages'].append(29)
for entry in obj['finishing']:
 if entry['stage']==29:
  entry['status']='source_polish_cpu_accepted_hardware_visual_pending'
  entry['evidence']='QA/STAGE29_ACCEPTANCE_RESULT.json'
obj['stage29Metrics']={'sourceStage':28,'sourceArchive':'SUNSET_STATE_STAGE28_OF35_FULL.zip',
 'sourceSHA256':sha,'accessibleInteriorsCpuAudited':214,'shopScenesCpuAudited':59,
 'interiorScenesGenerated':224,'ABInteriorSamples':56,'acceptance':'13/13','saveRegression':'95/95',
 'pedestrianRegression':'short smoke 8/8; historical long suite timed out',
 'ccdRegression':'39/39','worldBoxCountUnchanged':196817,
 'newCollisionBodies':0,'localGpuVerified':False,'native1080p50fpsVerified':False,
 'publicGitHubPagesPublished':False}
obj['latestStageArtifact']='SUNSET_STATE_STAGE29_OF35_FULL.zip'
obj['sourceOfTruth']='PROJECT/STAGE29_CURRENT_STATUS.json'
jsonput('PROJECT/35_STAGE_PROGRESS.json',obj)
status={'schemaVersion':1,'project':'SUNSET STATE','programmeId':'active35','date':'2026-11-23',
 'currentStage':29,'nextStage':30,'completedStages':list(range(1,30)),'remainingStages':list(range(30,36)),
 'sourceArchive':'SUNSET_STATE_STAGE28_OF35_FULL.zip','sourceArchiveSHA256':sha,
 'latestFullArchive':'SUNSET_STATE_STAGE29_OF35_FULL.zip',
 'latestSiteArchive':'SUNSET_STATE_STAGE29_GITHUB_PAGES_SITE.zip',
 'titleHe':'ליטוש פנים, חנויות, מעליות ותאורה',
 'metrics':obj['stage29Metrics'],
 'qualityGates':{'CPUSceneAcceptance':'13/13','saveRegression':'95/95','CCDRegression':'39/39',
 'navigationShortSmoke':'8/8','navigationFullRegression':'timed_out_no_result',
 'realGPU':'not_run','1920x1080FPS50':'not_run','browserVisual':'not_run','publicSite':'not_deployed'},
 'compatibilityToggle':'?stage29InteriorsOff=1',
 'reports':['PROJECT/STAGE29_OF35_REPORT_HE.md','QA/STAGE29_ACCEPTANCE_RESULT.json',
 'QA/STAGE29_REGRESSION_SMOKE_RESULT.json','QA/STAGE29_MANUAL_WEBGL_CHECKLIST_HE.md'],
 'limitations':'No native GPU; no 50FPS verification; long Stage20 suite timed out; no public deployment.'}
jsonput('PROJECT/STAGE29_CURRENT_STATUS.json',status)
# Brief front-matter notices added while retaining all prior documentation below.
for name,msg in [('README_35_STAGE_HE.md','# Current cumulative checkpoint: Stage29/35 (code + CPU scene QA completed; GPU/FPS visual pending)'),
 ('README_GITHUB_PAGES_HE.md','# Latest prepared bundle: STAGE29_GITHUB_PAGES_SITE.zip (local HTTP checked only; no public deployment)')]:
 p=r/name;s=p.read_text('utf8');p.write_text(msg+'\n\n'+s,'utf8')
print('Stage29 documentation and progress generated')
