# Preview avatars (#206)

Source: https://github.com/hakilee/iconloom-skill (abstract showcase, row-major numbers 3, 4, 8, 11, 12, 13, 15, 16, 17, 18, 19, 20).

Preserve reference geometry, palettes, overlap, lighting and transparent 16-unit bounds. Display at 36px on the existing neutral rounded avatar surface. Distinct cues: triple lens discs; pearl leaves; axial woven bands; braided disc; crossed petals; five-lobe vortex; six-tile halo; pillow braid; four-lens orbit; five cushions; five-capsule star; leaf crown. Each name has a fixed avatar; select a different profile on reload.

| Name             | Showcase number | Avatar            |
| ---------------- | --------------- | ----------------- |
| Gene (진)        | 3               | triple-lens       |
| Izy (이지)       | 4               | pearl-leaves      |
| Rubato (루바토)  | 8               | tri-axial-weave   |
| Loopy (루피)     | 11              | braided-disc      |
| Everett (에버렛) | 12              | crossed-petals    |
| Orra (오라)      | 13              | five-lobe-vortex  |
| Coke (코크)      | 15              | six-tile-halo     |
| Cola (콜라)      | 16              | pillow-braid      |
| Ria (리아)       | 17              | four-lens-orbit   |
| Crong (크롱)     | 18              | five-cushions     |
| Chloe (클로이)   | 19              | five-capsule-star |
| Hailey (헤일리)  | 20              | leaf-crown        |

Generate light/dark pairs from the shared source specs with the upstream scripts/generate.py --spec documentation/research/preview-avatars/specs.json --out public/preview-avatars, then validate with scripts/validate.py public/preview-avatars. The app currently uses light surfaces; dark variants preserve the source pairing, without adding a theme switch. No geometric redesign is intended.

Upstream revision: `352448cf221efc0badd1cb85e74504efd3ddff2d`. Browser review: preserved reference silhouettes, gradients and overlaps at 16/32/128px on light/dark surfaces; no design repairs or newly claimed visual improvements. Small abstract forms intentionally simplify at native size. SVG validation passed for all 24 files.
