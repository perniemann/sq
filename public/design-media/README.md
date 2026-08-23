# design-media

Play-section evidence for `/design`. README claim plates live in [`../readme/`](../readme/).

- `journey-*.svg` — authored court plates (fixtures). Prefer these in CI/headless.
- Live WebGL PNG capture: `node scripts/capture-design-media.mjs` with `npm run dev`
  and `?nobloom` (requires usable GPU WebGL; SwiftShader often yields black frames).
