# Gallery storage and delivery investigation (#217)

Status: cache optimization implemented; the recipe pilot implementation is described in [recipe-pilot.md](recipe-pilot.md), with public publication **default-off** pending real-mobile acceptance. WebP preview conversion is not enabled.
Measured against the renderer at `70dda3ee5cac1b82179b1cec372107151c90aa27`.

## Reproduce

Run `node scripts/benchmark-gallery.mjs`. Uses the pinned project tools and declared development-only Sharp/Miniflare dependencies; neither is part of the browser bundle. The benchmark registers the bundled Pretendard OTF, renders synthetic text compositions with the production renderer and encodes with the production GIF exporter. Sharp converts those GIFs to lossless animated WebP. No user data or public gallery objects are used.

The table below records one local run; raw generated output stays outside the repository. Native `@napi-rs/canvas`, warm fonts, 24 equal-complexity canvases and 60 render batches do **not** establish mobile browser performance. Rendering cost excludes font transfer, React, browser compositing, other app work and thermal throttling. Three GIF encodes per case give an indicative median, not a stable performance SLA. Gzip sizes compress one recipe independently; a list could compress differently. Static WebP has no animation duration; moving samples retain 20 frames/1200ms. Lossless conversion is not a complete cross-browser visual/disposal acceptance test.

| Synthetic composition | GIF bytes | Lossless WebP bytes | Recipe JSON bytes | Gzipped JSON bytes | 24 draws p95 ms |
| --------------------- | --------: | ------------------: | ----------------: | -----------------: | --------------: |
| Static, 1 layer       |      2049 |                 910 |               306 |                237 |            1.27 |
| Bounce, 1 layer       |     25531 |               17824 |               308 |                239 |            2.88 |
| Jelly, 4 layers       |     20856 |               18498 |               775 |                298 |            6.82 |
| Roll, 12 layers       |     70634 |               50302 |              1981 |                391 |           23.03 |

A warm native batch of complex recipes already costs a material fraction of a display frame. GIF encoding is deferred until download (indicative medians 8–53ms here), not repeated during animation. The native test does not measure JS main-thread stalls on real mobile hardware, worst-case 40-grapheme layers, or device emoji substitution.

## Decision: ship cache first

Immutable content-hash image URLs now use a named Workers Cache API cache and one-year browser caching. Canonical origin/path keys avoid query-string cache fragmentation. Successful GETs only; lists and counted POST downloads remain uncached. Cache failures fall back to R2, and R2 bodies stream rather than buffering for preview delivery. Asset removal requires cache purge; browser-held immutable copies cannot be immediately revoked. There is currently no product deletion endpoint.

This reduces repeated origin I/O and transfer, **not stored R2 bytes or first-view bytes**. Cache API is data-center local and does not imply tiered/global cache reuse. Production edge hit ratios have not been measured. Custom-domain production verification is needed; workers.dev and dashboard previews do not exercise effective edge caching.

## WebP decision

Lossless WebP reduced these synthetic GIF sizes, but the reduction varies by composition. Keeping both formats increases storage, so enabling it by default does not address the user's storage objective. Do not add a second media pipeline before deciding recipe eligibility. Retain GIF download compatibility. For image/uploaded-font compositions that remain binary-backed, measure representative actual compositions before adopting animated WebP previews.

## Proposed next architecture: restricted recipe-backed text mochi

A good direction for storage/network efficiency, but **not all text is portable**. Start with text-only layers using the three exact self-hosted font assets, disallow external/uploaded font references, and reject or use the current GIF path for system-emoji-dependent content. A family name alone does not identify a font file; current FontFace uploads use page-lifetime resources. Google Fonts CSS/faces can change. Native emoji shaping and Intl grapheme behavior can vary across browser/OS versions. Even pinned fonts/renderers are not a promise of byte-identical cross-platform output.

Suggested public record:

- Canonical, versioned data: `schemaVersion`, `rendererVersion`, immutable font-asset version/digest and validated settings.
- Text layers only: text, stable layer order, position, scale, rotation/flips, line height, colors/gradients; shared background, motion, speed and repeat delay. Exclude UI selection, history, upload identifiers, font labels and unused fields from public records.
- JSON byte limit, bounded layer/grapheme/line counts, finite/ranged numbers, fixed enumerations, strict hex colors, indexed character-color bounds and font allowlist. Reject unknown versions/fields before hashing/storing. TypeScript types and the editor's current client validator are not a server schema.
- Content hash of canonical validated record, not ordinary property-order-dependent client JSON. Preserve a renderer/font implementation for every supported version or explicitly migrate records; never silently redraw old IDs using changed semantics.

Client runtime:

- One shared requestAnimationFrame scheduler for visible canvases only, at the motion's useful sampling rate rather than unlimited per-card 60fps loops; no animation work offscreen or while the document is hidden. Static items and reduced-motion users draw once.
- Cache shared font loads and per-recipe text layout where measurements justify it. Do not repeatedly segment/measure identical text at every frame.
- Render/export only the clicked item on demand with progress and retry. If an encode measurably blocks mobile interaction, use a supported worker rendering/encoding path rather than adding it speculatively now.
- Change the download-count endpoint: a recipe-backed item has no server GIF to serve. Define counts as accepted download attempts (not completed local saves), increment after successful local generation, preserve origin/rate limits and atomic counters. Keep existing GIF counting behavior for binary items.
- Existing GIFs stay valid; their settings cannot be recovered from pixels. No conversion or deletion of existing public objects as part of this proposal. New record kinds must have explicit schema/API/UI contracts.

Acceptance before enabling recipe publication:

1. Real mobile Chrome and Safari, cold/warm fonts: 12/24 visible cards, maximal text/layers and mixed record kinds. Measure frame budgets, long tasks, memory and actual download latency, with app controls still responsive.
2. Cross-device glyph/color/gradient/motion and GIF timing/disposal checks; inaccessible fonts and unsupported versions produce actionable errors, not silent substitution.
3. Strict API validation, recipe deduplication, backward compatibility, publication failure/local download recovery, count/sort/pagination and malicious payload tests.
4. Publication UI clearly states that text/settings will be public. This intentionally changes the current rendered-GIF-only disclosure/source-data boundary; it must ship with the new format, not as an invisible backend optimization.

## Sources

- [Cloudflare R2 Cache API](https://developers.cloudflare.com/r2/examples/cache-api/) — explicit cache use, streaming body and custom-domain constraints.
- [Workers Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/) — cache locality and response semantics.
- [Google gif2webp](https://developers.google.com/speed/webp/docs/gif2webp) — lossless animation conversion/compression controls.
- Owning code: `src/server/worker.ts`, `src/lib/emoji.ts`, `src/lib/font-loading.ts`, `src/components/editor/FontPicker.tsx`; product contract `specs/editor.md` E6/E4.
