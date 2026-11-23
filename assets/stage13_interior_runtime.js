/* Install Stage13/35 scene furnishing after the original engine and stage05-07 hooks. */
if(!globalThis.Heatline?.stage13NarrowLobbies?.installInterior)
  throw Error('Stage13 lobby component not loaded');
globalThis.Heatline.stage13NarrowLobbies.installInterior();
