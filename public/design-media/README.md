# design-media

Play-section evidence for `/design`. README claim plates live in [`../readme/`](../readme/).

- `journey-*.svg` — authored court plates for the README filmstrip (img-safe orange balls, no SVG `filter`).
- `capture-*.png` — WebGL stills from `node scripts/capture-design-media.mjs` (`?bigball` + `__sqCapturePlaceBall` for wide frames).
- Live capture: `npm run dev` then `node scripts/capture-design-media.mjs` with `?nobloom` (needs usable GPU WebGL).
