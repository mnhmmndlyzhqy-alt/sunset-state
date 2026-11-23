/* Stage05 runtime interior hook: executes AFTER engine44.js defines the real scene builders,
 * but BEFORE DOMContentLoaded creates the game. No global engine rewrite. */
if(!globalThis.Heatline?.stage05City20?.installInterior)
  throw Error('Stage05 CITY20 entrance module not loaded');
globalThis.Heatline.stage05City20.installInterior();
