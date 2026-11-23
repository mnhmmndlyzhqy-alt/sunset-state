/* Install Stage07 rotated, single-storey interior scene transform AFTER engine44. */
if(!globalThis.Heatline?.stage07Alignment?.installInterior)
  throw Error('Stage07 exterior pipeline not loaded');
globalThis.Heatline.stage07Alignment.installInterior();
