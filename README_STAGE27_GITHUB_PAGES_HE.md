# SUNSET STATE — GitHub Pages (שלב 27/35)

זוהי חבילת אתר סטטית שממשיכה ישירות את משחק SUNSET STATE. יש להעלות את **תוכן ה-ZIP של האתר** (ולא את ZIP קוד המקור) לשורש מאגר GitHub Pages המתאים. הגרסה לא פורסמה מרחוק בשלב זה.

1. חלץ את `SUNSET_STATE_STAGE27_GITHUB_PAGES_SITE.zip`.
2. העתק את כל הקבצים שבתוך הארכיון (כולל `index.html`, `engine44.js`, `assets/`, `.nojekyll` ו־`QA/`) לשורש המאגר הקיים של המשחק. שמור גיבוי של הגרסה הקודמת; אל תפרסם משחק חדש במאגר אחר אם ברצונך לשמר את הכתובת.
3. בצע Commit ו־Push דרך GitHub Desktop. באתר GitHub פתח Settings → Pages ובחר Publish from main branch / root, אם טרם הוגדר.
4. ודא שהאתר נטען בכתובת ש־GitHub מציג; בדוק שגיאות טעינה 404, הליכה, נהיגה, כניסות לבניינים ושמירת משחק.
5. השווה עם `?stage27RoadsOff=1` אם ברצונך לבחון את פרופילי הכבישים ללא תיקון 27.

להפעלה מקומית: חילוץ ZIP ואז `RUN_GAME_WINDOWS.bat`, או `python -m http.server 8000` ופתיחת `http://localhost:8000/`.

**מצב בדיקות:** תיקון דרכים/גשרים עבר בדיקות CPU וקבלה. פרסום ציבורי, רינדור אמיתי על GPU ויעד 50FPS ב־1920x1080 **לא אומתו**. מדריך הבדיקה: `QA/STAGE27_MANUAL_WEBGL_CHECKLIST_HE.md` (בחבילת המקור).
