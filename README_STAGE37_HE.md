# SUNSET STATE — שלב 37 מתוך 105

שלב 37 הוסיף אופטימיזציה שמרנית למנוע WebGL2: חיפוש תאים מספרי, שימוש חוזר בזיכרון GPU המוקצה לרשתות סטטיות, והימנעות מקריאות ציור ריקות.

הבדיקה המרכזית: `QA/run_stage37_render_acceptance.cjs`. דוח: `PROJECT/STAGE37_RENDER_REPORT_HE.md`.

כדי לכבות את השיפור לשם השוואה: `index.html?stage37RenderOff=1`. כדי למדוד: `STAGE37_AB_BENCHMARK.html` דרך שרת HTTP מקומי.

אין שינוי במודלים, במפה, בצללים, בשמירה או ב־LOD. אין אישור ל־50FPS על GPU אמיתי.

ארכיון שלב 36 נשמר כבסיס, וקובצי הריצה ששונו גובו תחת `BACKUPS/STAGE37_OF105`.
