# Immutable recipe font set v1

Original WOFF2 font subsets, not build output. Sources:

- Black Han Sans and Jua: `@fontsource/black-han-sans@5.3.0`, `@fontsource/jua@5.3.0`, original `index.css` unicode ranges and WOFF2 files.
- Pretendard Regular 400: `pretendard@1.3.9`, original static dynamic-subset CSS and WOFF2 files.

Each original font license is retained here. Family names are scoped to `Mochi v1 …`, WOFF alternatives removed, display set to block. No glyph outlines or unicode ranges are changed. Vite emits content-hashed URLs and deduplicates identical existing font assets. Fonts are requested by unicode-range on demand, not as a whole-font download.

Do not update these files in place when upgrading editor fonts. Introduce a new supported font/renderer version while retaining v1 source assets, or explicitly migrate old records. `src/lib/emoji-v1.ts` is the corresponding versioned renderer; `src/lib/emoji.ts` is the current editor facade, not the entry point for historic recipes.
