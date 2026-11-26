/* SUNSET STATE 51: concise in-game controls and launch feedback. */
(function (H) {
  'use strict';
  H.build51 = { version: '51.0', title: 'Drive & Fly', gpuVerified: false };
  const setup = () => {
    const quality = document.getElementById('quality-mode51');
    if (quality) quality.textContent = H.quality51?.fixed === false ?
      'איכות מודלים: מותאמת למרחק (מצב ביצועים)' : 'איכות מודלים: מפורטת קבועה';
    if (location.protocol === 'file:') {
      const note = document.createElement('aside');
      note.id = 'stage51-file-warning'; note.setAttribute('role', 'status');
      note.textContent = 'כדי שהדיבוב והשיחות ייטענו, פתח את המשחק דרך RUN_GAME_WINDOWS.bat שבתיקיית המשחק. השאר את חלון השרת פתוח בזמן המשחק.';
      document.body.appendChild(note);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})(Heatline);
