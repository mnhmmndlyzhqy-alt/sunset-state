# SUNSET STATE — תוכנית תיקון וליטוש של 35 שלבים

## Current stage: 35/35 - final release candidate built; native GPU/visual, full HD 50FPS and public deployment still pending

Stage27 built **from the exact uploaded Stage26 cumulative source archive**, not from a new game. Six true shared-road height discontinuities were fixed on 39 road samples; the deliberately grade-separated northRing/westExpress crossing retains its 6.45m difference. Ground terrain lookup resolves road layers beneath bridges. Stage27 CPU/A-B acceptance 28/28 and parapet/A-B unit 8/8 passed. Seven selected historic regressions passed (some in Stage26-compatibility mode). **50FPS on a native GPU and visual play-through remain unverified**, as does live GitHub Pages publishing. Source of truth: `PROJECT/STAGE27_CURRENT_STATUS.json`.

Stage28 extended the existing 130 CITY20 sites and 84 legacy buildings with 1,982 distance-capped facade details. The underlying 194,835 Stage27 world objects remain identical in A/B SHA-256 projection; 37/37 architectural CPU acceptance and Stage19/20/21 focused regressions passed. **Native GPU quality and Full HD 50FPS still unverified.** Source: `PROJECT/STAGE28_CURRENT_STATUS.json`.

Stage29 continued from the uploaded Stage28 cumulative archive. On-demand polishing adds at most 9 decorative meshes and one real lamp to each active interior scene and 5 decorative meshes and two lamps per shop scene. All 214 active interior plans and 59 shops were exercised in CPU QA, including 56 A/B scene comparisons; 13/13 checks passed. The Stage20 long test timed out; short navigation smoke 8/8 and Stage19 save 95/95 / Stage21 CCD 39/39 passed. **Native GPU/1080p 50FPS and visual QA remain open.** Source: `PROJECT/STAGE29_CURRENT_STATUS.json`.

Stage30 continued from the exact uploaded Stage29 cumulative archive. The original AeroWild hero, Street Character V8 and Urban GLB models are intact. CPU character acceptance 35/35; 70 real NPC pose samples, at most 5 decorative meshes per close NPC and 12 extra hero detail meshes. Stage19/21 and Stage29 regressions passed. **Real WebGL2 visual acceptance and Full HD 50FPS remain unverified.** Source: `PROJECT/STAGE30_CURRENT_STATUS.json`.


Stage31 continued from the verified Stage30 cumulative archive. An opt-out vehicle layer works with the original engine, uses speed-aware wet traction and minor real-damage steering pull, anticipatory civilian service braking before cars/buses on the SAME road level, and up to 10 locally aligned wear details per damaged nearby car; no vehicle assets or colliders are replaced. 37/37 CPU acceptance, save 95/95, CCD 39/39, interiors 13/13, characters 35/35. Previous navigation full test timed out and was not claimed as passed. **Native GPU and 50FPS remain unverified.** Source: `PROJECT/STAGE31_CURRENT_STATUS.json`.

Stage32 continued from the verified Stage31 cumulative source ZIP. 28 water/shore habitat mismatches were rehomed without changing map or GLB assets; 80-second animal and fish simulations plus renderer fallbacks passed 46/46 CPU checks. Existing save, vehicle, character, interior regressions passed. **Native GPU / 50FPS / public deployment remain unverified.** Source: `PROJECT/STAGE32_CURRENT_STATUS.json`.

**הנחיית עבודה:** ממשיכים מהארכיון המצטבר האחרון, תוך שימור מלא של הקוד והנכסים; אין משחק חדש ואין מחיקה של פיצ׳רים.

**חלוקת התוכנית:** שלב 1 = תחקיר; שלבים 2–26 = 25 הממצאים מהדוח, אחד לכל שלב; שלבים 27–35 = תשעה שלבי גימור/קבלה.

| שלב | משימה | מצב |
|---:|---|---|
| 1 | תחקיר עמוק ומדידות משחק | קוד/נתונים נבדקו; אימות GPU חזותי פתוח |
| 2 | תיקון היפוך מסלול בכביש northRing (`S01-RD-01`) | תיקון קוד אושר בבדיקות CPU; בדיקה חזותית פתוחה |
| 3 | תיקון פנייה חדה בכביש privateSpine469 (`S01-RD-02`) | תיקון קוד אושר בבדיקות CPU; בדיקה חזותית פתוחה |
| 4 | הנגשת כניסות קיימות לבניינים (`S01-BL-01`) | 84/84 מבנים ותיקים נגישים בבדיקות מנוע; 215 רישומים ישנים נשארו מושבתים; אימות גרפי פתוח |
| 5 | הוספת כניסות למבנים החדשים (`S01-BL-02`) | 130/130 כניסות פעילות עם פתח וחלל פנים; 32/32 בדיקות CPU; אימות GPU פתוח |
| 6 | התאמת כיוון הדלתות לחזיתות (`S01-BL-03`) | 173 כניסות הועברו לחזית בטוחה יותר; 41 נשארו במקומן; 22/22 בדיקות CPU ו־173/173 מעברי הליכה; אימות GPU פתוח |
| 7 | התאמת כיוון בניינים למבנה הרחובות (`S01-BL-04`) | 34 מבנים חד־קומתיים סובבו פיזית (מעטפת, התנגשות, דלת ופנים); 96 נותרו ללא סיבוב משיקולי בטיחות/מעליות/התאמה; 23/23 בדיקות CPU ו־34/34 הליכות; GPU פתוח |
| 8 | שדרוג חלונות בחזיתות צד ואחור (`S01-BL-05`) | נוספו 1,586 חלונות חזותיים ב־130 מבנים; 5,834 חלקי רינדור חדשים, ללא שינוי התנגשויות; 28/28 בדיקות CPU, 34/34 הליכות; WebGL/FPS פתוח |
| 9 | בדיקת כניסות המסווגות כמים (`S01-BL-06`) | 116 המקרים הם רישומים מושבתים בלבד; 0 כניסות פעילות במים, 0 גישות פעילות במים עד 6 מ׳. נוסף סיווג מתוקן ומנגנון QA אוטומטי; 25/25 עברו, GPU פתוח |
| 10 | בדיקה ומיקום מחדש של אדניות בעייתיות (`S01-ST-01`) | 181 דגלי עבר הסתברו כנתונים שהוסרו בשלב 4; 166 אדניות פעילות עם 0 חפיפות לכביש/מים/דלת/התנגשויות, נבדקו תשע נקודות לכל בסיס; נוסף מנגנון בדיקה והעברה בטוחה לתקלות עתידיות; 39/39 בדיקות קוד, אימות WebGL פתוח |
| 11 | בדיקה ומיקום מחדש של 30 פנסי רחוב חשודים (`S01-ST-02`) | 30 הם דגלים היסטוריים טרום שלב 4; בפועל יש 28 פנסים פעילים מהקבוצה, בלי חפיפות כביש/מים/דלת. זוהו 22 בסיסים בסטיית גובה מעל 2 ס״מ, מהם חמישה מעל 20 ס״מ. 25 זוגות עמוד–ראש יושרו לגובה הקרקע, 0 הוזזו בצירי X/Z. נוספה בקרת מיקום ומצב השוואה; 118/118 בדיקות CPU, WebGL פתוח |
| 12 | התנגשויות לחפצי רחוב מוצקים (`S01-ST-03`) | 360 גופים פיזיים חדשים: 166 בסיסי אדניות, 166 עמודונים, 28 עמודי תאורה; 1,476/1,476 בדיקות CPU, A/B ופיזיקה עברו; WebGL/FPS פתוח |
| 13 | השלמת ריהוט בשבע מבואות (`S01-IN-01`) | 7/7 compact foyers furnished, 77 world and 70 in-scene decorative parts; 110/110 CPU, A/B 9/9, WebGL pending |
| 14 | השלמת תאורת פנים מתפקדת (`S01-IN-02`) | 214 חללי כניסה קיבלו 608 מקורות אור נבחרים בזמן ריצה ו-1,216 חלקי גופי תאורה; 2,532/2,532 בדיקות קוד, A/B 39/39; אימות WebGL/FPS פתוח |
| 15 | חללי פנים נגישים, התנגשות ואינטראקציות (`S01-IN-03`) | בוצע בקוד: 214 חללי כניסה, 534 גופי התנגשות חדשים בריהוט בטוח, 1,018 נקודות E; שבעת ספסלי שלב 13 פיזיים, 20 חללים צרים מקבלים בדיקת אמנות קיר ללא חסימה. 3,477/3,477 בדיקות CPU עברו, WebGL/FPS פתוחים |
| 16 | שילוב חלונות נבחרים במערכת הזכוכית השבירה (`S01-GL-01`) | 864 חלונות חדשים שבירים ב־130 מבנים, כולל 34 מסובבים; ירי, רכב, רסיסים ופיצוץ מחוברים למנוע. 7,815/7,815 בדיקות CPU, A/B 7/7, Stage08 בתאימות 28/28, Stage15 מדגם 406/406; קירות אטומים נשארים; GPU/FPS פתוחים |
| 17 | בדיקת רגרסיה ושימור תיקון 60 העסקים (`S01-RT-01`) | 60 חזיתות תיקון/342 פרטים נשמרו: 54 חנויות פנים, 6 שירותי רחוב, ועוד 5 חנויות עצמאיות; 927/927 בדיקות E/קנייה/דלת/דלפק, 9/9 A/B, רגרסיות 16 ו־15 עברו; GPU פתוח |
| 18 | שיפור LOD ומעברי דגמים לתנינים (`S01-WL-01`) | שלושה דגמי LOD מקוריים מאותו ריג (195,560 / 64,156 / 9,532 משולשים), היסטרזיס ומעבר מקוטע־מסך 0.38 שנ׳, 8 תנינים; 36/36 בדיקות בחירה, 4,376 בדיקות GLB, פענוח אמיתי ל־2 נכסים, 21/21 שימור עולם; GPU ו־FPS פתוחים |
| 19 | שמירה וטעינה מלאות של מצב המשחק (`S01-SV-01`) | נוספה שמירת סשן רחבה: 3 משבצות, אוטומטית, ייצוא/ייבוא וגיבוי; כסף/מוסך/משימות, מיקום, מבנה וקומה, חנויות, רכב ותחמושת נשמרים. 95/95 CPU ו־17/17 UI/שמירה אוטומטית; תנועה דינמית/מרוץ פעיל ותחבורה ציבורית לא משוחזרים במלואם; אימות דפדפן/GPU פתוח |
| 20 | תיקון ניווט הולכי רגל בצמתים ובעומסים (`S01-AI-01`) | נוספה התאוששות ניווט מקומית: עקיפה בטוחה מוקדמת למכשולים, מניעת היפוך חוזר ומסלול מדרכה חלופי אחרי 8 שניות מעבר חסום; 22/22 בדיקות CPU, ‏12/12 A/B, ‏600 שניות סימולציה ל־8 הולכי רגל; רינדור/GPU/50FPS ומשחק אמיתי 10+ דקות עדיין פתוחים |
| 21 | בדיקת התנגשויות מהירות וחדירת מחסומים (`S01-PH-01`) | נוספה הגנת swept OBB/AABB סלקטיבית לאחר מנגנון ששת הצעדים, ללא החלפת פיזיקה או מערכת נזק. 39/39 בדיקות מנוע, 16/16 עולם מלא, 180/180 חציות דרך גופי רחוב קיימים; 745 מקרי בסיס לא שחזרו חדירה ולכן ההגנה מניעתית למקרי קצה. GPU/50FPS ובדיקת משחק ממושכת פתוחים |
| 22 | אימות 50 FPS ב־1920×1080 עם GPU אמיתי (`S01-PF-01`) | נבנה כלי מדידה אמיתי מתוך לולאת המשחק (6 סצנות, בדיקת framebuffer וכרטיס GPU, p95 ו־FPS), עם 52/52 בדיקות קוד ו־9/9 בדיקות UI; פרופיל CPU אמיתי 8/8. **אישור יעד 50FPS על GPU חומרתי עדיין פתוח**: אין GPU בסביבת העבודה, Chromium WebGL2 לא זמין |
| 23 | מדידת עומס גאומטריה, זיכרון וקריאות ציור (`S01-PF-02`) | 194,555 עצמים סטטיים; 5 זוויות מצלמה, 34,637–109,328 מועמדים לציור; חידוש חישוב לאחר תזוזה 37–88ms ב־CPU מדומה GPU; 24/24 מדידות עולם, 51/51 כלי WebGL מדומה, 14/14 UI ב־Chromium. **קריאות GPU אמיתיות ו־50FPS עדיין לא נמדדו**; נוסף פרופיילר opt-in בלבד |
| 24 | איחוד מסמכי התקדמות וגרסאות (`S01-PR-01`) | הושלם: מוני התוכנית והממצאים אוחדו; 23/25 ממצאים תועדו; 50FPS ו־GPU עדיין פתוחים |
| 25 | אריזה נוחה ופרסום למשחק הדפדפן (`S01-PU-01`) | GitHub Pages static bundle READY; 2511/2511 local HTTP, 123/123 syntax; remote deployment and GPU pending |
| 26 | סגירת תקלות היסטוריות עם ראיות משחק (`S01-QA-01`) | נוסף בודק קוד למנוע המשחק המצטבר: 51/51 בדיקות ב־25/25 הממצאים המקוריים; כלי דפדפן אופציונלי לאיסוף ראיות וצילום פריים מקורי, 32/32 בדיקות יחידה. שימור מערכות 16,19–23 עבר; בדיקת חנויות מורחבת לא הושלמה מחדש. **אימות חזותי אנושי, GPU ו־50FPS עדיין פתוחים** |
| 27 | איחוד סופי של דרכים, גשרים, שטח וקו החוף | **קוד ובדיקות CPU הושלמו:** 6/6 חיבורים יושרו, גשר דו־מפלסי נשמר; 28/28+8/8 קבלה, בדיקות רגרסיה ייעודיות עברו. **WebGL/GPU/50FPS ואימות חזותי פתוחים.** |
| 28 | ליטוש מקצועי של הבניינים וחזיתות העיר | **קוד ובדיקות CPU הושלמו:** 130 CITY20 + 84 מבנים ותיקים, 1,982 פרטי חזית עם LOD, 37/37 בדיקות A/B, רגרסיות 19/20/21 עברו; **בדיקת GPU/FPS ואיכות חזותית פתוחה** |
| 29 | ליטוש פנים, חנויות, מעליות ותאורה | **קוד ובדיקות CPU הושלמו:** 214/214 חללי פנים, 59/59 חנויות, 56 A/B, 13/13 קבלה; 0 גופי התנגשות נוספים. **GPU/FPS ואימות חזותי פתוחים** |
| 30 | ליטוש דמות שחקן, פנים, אנימציות ודמויות NPC | **קוד ובדיקות CPU הושלמו:** 12 פרטי שחקן, עד 5 פרטי NPC קרוב, התאמות עיניים/פנים ותנועה ושימור מקורות; 35/35 בדיקות דמות, 95/95 שמירה, 39/39 פיזיקה, 8/8 ניווט קצר ו-13/13 פנים; **GPU/FPS ואימות חזותי פתוחים.** |
| 31 | ליטוש רכבים, תחבורה, נזק ותחושת הנהיגה | **קוד ובדיקות CPU הושלמו:** התערבות אחיזה מבוקרת במשטח רטוב, משיכת הגה קלה בנזק, בלימה צפויה של מכוניות תנועה מול רכב/אוטובוס ומרקמי נזק לפי אזור עם LOD; 37/37 בדיקות קבלה, 95/95 שמירה, 39/39 פיזיקה, 13/13 חללי פנים ו־35/35 דמויות. **WebGL2 אמיתי, FPS, בדיקת ניווט היסטורית מלאה ופרסום ציבורי פתוחים.** |
| 32 | ליטוש מודלי בעלי חיים, תנועה ובתי גידול | **קוד ובדיקות CPU הושלמו:** 28 בתי גידול הותאמו לקו החוף (10 פלמינגו, 4 אנפות, 6 דולפינים ו־8 דגי שונית); תיקוני תנועה, נחיתה ועיגון למפלס המים, בלי שינוי נכסי GLB או התנגשויות; 46/46 קבלה ו־95/95 שמירה, 39/39 פיזיקה, 13/13 פנים, 35/35 דמויות, 37/37 כלי רכב. **WebGL/GPU/FPS/פרסום עדיין פתוחים.** |
| 33 | AI, משימות, כסף, משטרה וממשק משחק מהנה | **קוד ובדיקות CPU הושלמו:** 3 משימות אזרחיות חדשות על גבי יומן קיים (13 בסך הכול); 61/61 בדיקות קבלה, 95/95 שמירה, 39/39 פיזיקת רכבים, 13/13 חנויות ופנים; תצוגת ארנק ותיעוד עסקאות לסשן, בלימת ניידות בטוחה להולכי רגל. **בדיקת GPU/FPS, ניווט היסטורי ממושך ופרסום ציבורי פתוחים.** |
| 34 | ליטוש רינדור, חומרים, סאונד וביצועים | **קוד ובדיקות CPU הושלמו**: 147/147 קבלה; 120 בחירות תאורה שקולות, 7 השוואות מצלמה, מטמון 4 דגימות לכל אפקט, סינון נורמלים לחומרים מבריקים, שימוש חוזר בהעלאות גאומטריה. רגרסיות 19/21/29/30/31/32/33 עברו. **GPU אמיתי, 50FPS ופרסום פתוחים.** |
| 35 | QA מקצה לקצה, שמירה וטעינה, מסירה ופרסום | **בדיקות קוד/מסירה הושלמו במגבלות הסביבה**: 8 סבבי רגרסיה בוצעו; משחק ומשימות נבדקו במנוע עם רנדרר מדומה. חבילות מקור ואתר וקובצי SHA-256 נבנו. **שחקן אמיתי / GPU / 50FPS / פרסום כתובת HTTPS ציבורית לא אומתו**. |

הערה: מס׳ 16 בדוח 25 הממצאים מתאר תקלה היסטורית שתוקנה קודם. בשלב 17/35 יבוצעו בדיקות רגרסיה ושימור התיקון, לא תיקון מדומה של באג שעדיין קיים.

## מגבלות בדיקה
בדיקות העולם, הפיזיקה והתנועה בסביבת Node משתמשות בקוד המשחק האמיתי אך ללא רינדור GPU. איכות ויזואלית, קצב פריימים וממשק נבדקים בנפרד על מחשב אמיתי.

## מקור הממצאים
`QA/STAGE01_15_BUG_REGISTER.json` — 25 הממצאים כפי שתועדו בשלב 1.
