# Preview avatars (#206)

Source: https://github.com/hakilee/iconloom-skill (abstract showcase, row-major numbers 3, 4, 8, 11, 12, 13, 15, 16, 17, 18, 19, 20).

Preserve reference geometry, palettes, overlap, lighting and transparent 16-unit bounds. Display at 36px on the existing neutral rounded avatar surface. Distinct cues: triple lens discs; pearl leaves; axial woven bands; braided disc; crossed petals; five-lobe vortex; six-tile halo; pillow braid; four-lens orbit; five cushions; five-capsule star; leaf crown. These abstract avatars do not encode a person’s identity; names and avatars vary independently.

Generate light/dark pairs from the shared source specs with the upstream scripts/generate.py --spec documentation/research/preview-avatars/specs.json --out public/preview-avatars, then validate with scripts/validate.py public/preview-avatars. The app currently uses light surfaces; dark variants preserve the source pairing, without adding a theme switch. No geometric redesign is intended.

Upstream revision: `352448cf221efc0badd1cb85e74504efd3ddff2d`. Browser review: preserved reference silhouettes, gradients and overlaps at 16/32/128px on light/dark surfaces; no design repairs or newly claimed visual improvements. Small abstract forms intentionally simplify at native size. SVG validation passed for all 24 files.
