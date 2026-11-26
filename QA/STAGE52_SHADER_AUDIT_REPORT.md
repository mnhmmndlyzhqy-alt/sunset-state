# Shader audit

Scanned 152 JavaScript files: engine44.js and JavaScript files directly in assets/. Found 27 shader templates.

Summary: 16 fragment shaders; 0 loops with nonconstant or unresolved bounds; 8 lexical expensive-call occurrences in loops (nested loops may repeat occurrences).

Static source audit; not a GPU profile. Template variants count once. Shared RC_UNIFORMS and RC_FUNCS are expanded where referenced; other interpolations and runtime shader patches are not evaluated. Counts and unused-uniform results can therefore be incomplete, and conditional compilation is not evaluated. Loop call findings are lexical: calls hidden inside helper functions are not attributed to callers. Unresolved loop bounds are candidates, not proof of runtime variability.

## engine44.js:2221 — vertex/unknown

- Version: `300 es` at engine44.js:2221.
- Unused declared uniforms: none detected.
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## engine44.js:2235 — fragment

- Version: `300 es` at engine44.js:2235.
- Default float precision: highp at engine44.js:2236.
- Unused declared uniforms: none detected.
- Sampler uniforms: 2 (sceneColor at engine44.js:2237, sceneDepth at engine44.js:2237).
- Fragment highp: engine44.js:2236 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.
- Unresolved JavaScript interpolations: `Heatline.SCENE_FAR.toFixed(1)`.

## engine44.js:2911 — vertex/unknown (vertex)

- Version: `300 es` at engine44.js:2911.
- Unused declared uniforms: none detected.
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## engine44.js:2946 — vertex/unknown (skyVertex)

- Version: `300 es` at engine44.js:2946.
- Unused declared uniforms: none detected.
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## engine44.js:2953 — fragment (skyFragment)

- Version: `300 es` at engine44.js:2953.
- Default float precision: highp at engine44.js:2954.
- Unused declared uniforms: none detected.
- Sampler uniforms: 1 (uSkyTexture at engine44.js:2960).
- Fragment highp: engine44.js:2954 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## engine44.js:3029 — fragment (fragment)

- Version: `300 es` at engine44.js:3029.
- Default float precision: highp at engine44.js:3030.
- Unused declared uniforms: none detected.
- Sampler uniforms: 9 (uAsphaltAlbedo at engine44.js:3040, uAsphaltNR at engine44.js:3040, uConcreteAlbedo at engine44.js:3040, uConcreteNR at engine44.js:3040, uMasonryAlbedo at engine44.js:3041, uMasonryNR at engine44.js:3041, uEnvironment at engine44.js:3041, uShadow at engine44.js:3042, uCoastalDepth461 at engine44.js:3043).
- Fragment highp: engine44.js:3030, engine44.js:3031 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: `for(int i=0;i<2;i++)` at engine44.js:3301: normalize at engine44.js:3306, normalize at engine44.js:3307; `for(int i=0;i<12;i++)` at engine44.js:3635: pow at engine44.js:3640, normalize at engine44.js:3642, normalize at engine44.js:3647, pow at engine44.js:3648.

## engine44.js:4233 — vertex/unknown (skidVS)

- Version: `300 es` at engine44.js:4233.
- Unused declared uniforms: none detected.
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## engine44.js:4241 — fragment (skidFS)

- Version: `300 es` at engine44.js:4241.
- Default float precision: highp at engine44.js:4242.
- Unused declared uniforms: `uTime` (engine44.js:4244).
- Sampler uniforms: 0.
- Fragment highp: engine44.js:4242 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## engine44.js:4295 — vertex/unknown (pointVS)

- Version: `300 es` at engine44.js:4295.
- Unused declared uniforms: none detected.
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## engine44.js:4309 — fragment (pointFS)

- Version: `300 es` at engine44.js:4309.
- Default float precision: highp at engine44.js:4310.
- Unused declared uniforms: none detected.
- Sampler uniforms: 0.
- Fragment highp: engine44.js:4310 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## engine44.js:4419 — vertex/unknown (vsSource)

- Version: `300 es` at engine44.js:4419.
- Unused declared uniforms: none detected.
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## engine44.js:4429 — fragment (fsSource)

- Version: `300 es` at engine44.js:4429.
- Default float precision: highp at engine44.js:4430.
- Unused declared uniforms: none detected.
- Sampler uniforms: 0.
- Fragment highp: engine44.js:4430 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## engine44.js:17325 — vertex/unknown (VERT)

- Version: `300 es` at engine44.js:17325.
- Unused declared uniforms: none detected.
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## engine44.js:17385 — fragment (FRAG)

- Version: `300 es` at engine44.js:17385.
- Default float precision: highp at engine44.js:17386.
- Unused declared uniforms: `uORM` (engine44.js:17388), `uRough` (engine44.js:17390), `uMetal` (engine44.js:17390), `uUseOrm` (engine44.js:17390), `uDaylight` (engine44.js:17390), `uWet` (engine44.js:17390).
- Sampler uniforms: 3 (uAlbedo at engine44.js:17388, uNormal at engine44.js:17388, uORM at engine44.js:17388).
- Fragment highp: engine44.js:17386 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## assets/stage39_grass.js:16 — vertex/unknown (VS)

- Version: `300 es` at assets/stage39_grass.js:16.
- Unused declared uniforms: none detected.
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## assets/stage39_grass.js:54 — fragment

- Version: `300 es` at assets/stage39_grass.js:54.
- Default float precision: highp at assets/stage39_grass.js:57.
- Unused declared uniforms: `rcShadowTexel` (assets/stage39_grass.js:61).
- Sampler uniforms: 2 (uShadow at assets/stage39_grass.js:59, rcSkyLUT at assets/stage39_realism_render.js:43).
- Fragment highp: assets/stage39_grass.js:57, assets/stage39_grass.js:57 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.
- Unresolved JavaScript interpolations: `hdr ? 1 : 0`.

## assets/stage39_realism_core.js:395 — vertex/unknown (SKIN_VS)

- Version: `300 es` at assets/stage39_realism_core.js:395.
- Unused declared uniforms: none detected.
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.
- Unresolved JavaScript interpolations: `NB`.

## assets/stage39_realism_core.js:407 — fragment (SHADOW_FS)

- Version: `300 es` at assets/stage39_realism_core.js:407.
- Default float precision: highp at assets/stage39_realism_core.js:409.
- Unused declared uniforms: none detected.
- Sampler uniforms: 0.
- Fragment highp: assets/stage39_realism_core.js:409 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## assets/stage39_realism_core.js:412 — fragment

- Version: `300 es` at assets/stage39_realism_core.js:412.
- Default float precision: highp at assets/stage39_realism_core.js:415.
- Unused declared uniforms: none detected.
- Sampler uniforms: 2 (uShadow at assets/stage39_realism_core.js:417, rcSkyLUT at assets/stage39_realism_render.js:43).
- Fragment highp: assets/stage39_realism_core.js:415, assets/stage39_realism_core.js:415 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: `for(int i=0;i<12;i++)` at assets/stage39_realism_core.js:455: pow at assets/stage39_realism_core.js:458.
- Unresolved JavaScript interpolations: `hdr ? 1 : 0`.

## assets/stage39_realism_render.js:662 — fragment

- Version: `300 es` at assets/stage39_realism_render.js:662.
- Default float precision: highp at assets/stage39_realism_render.js:665.
- Unused declared uniforms: `uSkyQuality` (assets/stage39_realism_render.js:667), `uDaylight` (assets/stage39_realism_render.js:668), `uSunDirection` (assets/stage39_realism_render.js:669), `uSkyTexture` (assets/stage39_realism_render.js:670).
- Sampler uniforms: 2 (uSkyTexture at assets/stage39_realism_render.js:670, rcSkyLUT at assets/stage39_realism_render.js:43).
- Fragment highp: assets/stage39_realism_render.js:665 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.
- Unresolved JavaScript interpolations: `hdr ? 1 : 0`.

## assets/stage39_realism_render.js:1022 — vertex/unknown (FULLSCREEN_VS)

- Version: `300 es` at assets/stage39_realism_render.js:1022.
- Unused declared uniforms: none detected.
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## assets/stage39_realism_render.js:1026 — fragment (DOWN_FS)

- Version: `300 es` at assets/stage39_realism_render.js:1026.
- Default float precision: highp at assets/stage39_realism_render.js:1028.
- Unused declared uniforms: none detected.
- Sampler uniforms: 1 (src at assets/stage39_realism_render.js:1029).
- Fragment highp: assets/stage39_realism_render.js:1028 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## assets/stage39_realism_render.js:1045 — fragment (UP_FS)

- Version: `300 es` at assets/stage39_realism_render.js:1045.
- Default float precision: highp at assets/stage39_realism_render.js:1047.
- Unused declared uniforms: none detected.
- Sampler uniforms: 1 (src at assets/stage39_realism_render.js:1048).
- Fragment highp: assets/stage39_realism_render.js:1047 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## assets/stage39_realism_render.js:1058 — fragment (FINAL_FS)

- Version: `300 es` at assets/stage39_realism_render.js:1058.
- Default float precision: highp at assets/stage39_realism_render.js:1060.
- Unused declared uniforms: none detected.
- Sampler uniforms: 3 (sceneColor at assets/stage39_realism_render.js:1061, sceneDepth at assets/stage39_realism_render.js:1061, bloomTex at assets/stage39_realism_render.js:1061).
- Fragment highp: assets/stage39_realism_render.js:1060 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: `for(int i=0;i<22;i++)` at assets/stage39_realism_render.js:1154: texture at assets/stage39_realism_render.js:1158.
- Unresolved JavaScript interpolations: `H.SCENE_FAR ? H.SCENE_FAR.toFixed(1) : '5050.0'`.

## assets/stage39_realism_render.js:1517 — fragment (fs)

- Version: `300 es` at assets/stage39_realism_render.js:1517.
- Default float precision: highp at assets/stage39_realism_render.js:1519.
- Unused declared uniforms: none detected.
- Sampler uniforms: 0.
- Fragment highp: assets/stage39_realism_render.js:1519 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## assets/terrain_463.js:92 — vertex/unknown

- Version: `300 es` at assets/terrain_463.js:92.
- Unused declared uniforms: none detected.
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

## assets/terrain_463.js:101 — fragment

- Version: `300 es` at assets/terrain_463.js:101.
- Default float precision: highp at assets/terrain_463.js:102.
- Unused declared uniforms: none detected.
- Sampler uniforms: 1 (shadowMap at assets/terrain_463.js:108).
- Fragment highp: assets/terrain_463.js:102, assets/terrain_463.js:103 (review for mediump where precision permits).
- Loops with nonconstant or unresolved bounds: none detected.
- Expensive calls inside loops: none detected.

