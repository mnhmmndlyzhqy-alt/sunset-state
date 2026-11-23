# SUNSET STATE — הוראות חבילת אתר, שלב 32/35

- התוכן מיועד לאחסון סטטי של GitHub Pages (לא להעלאת קובץ ה-ZIP כפי שהוא).
- חלץ את `SUNSET_STATE_STAGE32_GITHUB_PAGES_SITE.zip` והעלה **את הקבצים שבתוך הארכיון** לשורש מאגר GitHub Pages. בשורש נמצאים `index.html`, `START_GAME.html`, `.nojekyll`, `engine44.js`, תיקיית `assets` והמסמכים.
- להפעלה מקומית מתוך תיקיית האתר: `python -m http.server 8000`; פתח `http://localhost:8000/index.html`. אל תפעיל `file://` כי טעינת נכסים ומודולים עשויה להיחסם.
- מתג השוואה לשלב הקודם: `?stage32WildlifeOff=1` והפעלת הדף מחדש.
- פרסום בפועל ואימות FPS / GPU לא בוצעו בסביבה זו. יש לבדוק על המחשב שבו המשחק מיועד לרוץ.
