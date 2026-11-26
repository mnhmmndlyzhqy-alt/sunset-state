# Stage 52 rendering and resolution

Stage 52 keeps the Stage 51 model selections and streams moving instances in one upload per opaque, transparent, or sun-shadow pass. Each static shape retains its vertex array binding across frames. Deforming characters reuse their transform buffers across frames. The original mesh data, instance order, transparency groups, shadow culling, and bone matrices are preserved.

The HDR composite uses the center sample directly when the scene is displayed at its rendered size. Catmull–Rom reconstruction still runs when the output is larger than the rendered scene. The sharpening step limits bright and dark overshoot using neighboring pixel values. Native and fixed higher-resolution modes keep the full effect stack.

## Resolution preferences

| Mode | Internal resolution policy |
| --- | --- |
| 1080p | Default. Requests at least 1920×1080 while preserving the canvas aspect. |
| Native | Uses the canvas dimensions multiplied by the browser device pixel ratio. |
| 1440p | Requests at least 2560×1440 while preserving the canvas aspect. |
| Custom | Uses 50–150% of the native internal dimensions in one-percentage-point increments. |
| Auto | Starts at native size. Uses measured frame time to select a bounded scale of 65–100%. |

All modes respect the WebGL texture/renderbuffer dimensions and the renderer's framebuffer pixel cap. Settings persist in a rendering preference. Auto uses a configurable 30–120 FPS target. It waits for sustained slow or fast frames before changing resolution. If a smaller frame fails to improve frame time, it restores the previous scale and waits before testing again. F4 toggles Auto and the last fixed mode. The reported dimensions come from the renderer's actual internal and output sizes.

The settings interface uses `Heatline.render52.getSettings()`, `setSettings(patch, game)`, `status(game)`, and `toggleAdaptive(game)`. The engine's shadow pass delegates geometry submission after computing its original model groups. The instance packer accepts a destination buffer and a float offset so it can write each group into the upload buffer directly.

## Verification

Run `node QA/stage52_render_acceptance.cjs --compare` from the integrated repository. The comparison uses Stage 51 commit `96316d2`. To compare with an extracted Stage 51 source directory, set `STAGE52_BASELINE_ROOT` to that directory. For a render-only worktree, set `STAGE52_ENGINE_ROOT` to the worktree with the integrated engine hooks. Run the same command without `--compare` to exercise Stage 52 on its own.

The recorder submits the real render methods for a deterministic workload with 5,800 static instances, 1,690 moving instances, and 90 measured frames after warmup. It compares model order, the cull state, and exact Float32 instance bytes for each shape submission. Character verification compares bone matrices on the first and final recorded frames for a 40-actor crowd.

| Measured operation | Stage 51 | Stage 52 |
| --- | ---: | ---: |
| Instance-buffer uploads | 6,345 | 185 |
| Array/element buffer bindings | 18,180 | 185 |
| Vertex attribute enables, pointer updates, and divisors | 258,525 | 58,275 |
| Reuse of vertex arrays through bind calls | 460 | 6,225 |
| Draw submissions | 17,235 | 17,235 |
| Instance bytes submitted | 15,134,400 | 15,134,400 |
| Skin Float32 allocations over 25 measured frames | 70,000 | 0 |

The measured results quantify CPU-side submission and allocation work in a GL recorder. Browser pixels, GPU speed, and the resulting FPS on a specific machine remain unverified.
