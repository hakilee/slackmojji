# Recipe pilot delivery (#218)

Implementation is present but **public publication is default-off**. #218 remains open for real-mobile acceptance; do not infer physical-device performance from native or viewport-emulation results.

## Format and rollout

- Apply `migrations/0003_mochi_recipes.sql` before deploying this reader/writer. Existing records gain nullable `recipe`; their IDs, filenames, bytes, counters and R2 GIFs are preserved.
- Normal builds omit recipe publication. A controlled pilot requires BOTH `VITE_ENABLE_MOCHI_RECIPES=true` during the client build AND Worker `ENABLE_MOCHI_RECIPES=true`. The committed Worker value is false. Do not enable publicly before the remaining acceptance below.
- Existing recipe reads/downloads continue to work if publication is subsequently disabled. Binary items keep their existing API and behavior. A rollback to code predating this migration cannot render recipe records, so do not roll back readers after publishing recipes without a migration plan.
- Text must contain ASCII printable characters/newlines or Hangul, be nonblank and at most 40 code points/three lines per layer, with 1–12 layers. Images, custom/remote fonts, emoji and unsupported characters use the GIF publication path. Uploaded font labels are excluded. Restricting the alphabet avoids combining/emoji shaping and native fallback dependence; it is intentionally not arbitrary Unicode support.
- Zod strict objects reject unknown fields at each level; numeric ranges, literal enums, color syntax/index bounds and schema/renderer/font versions are validated server-side. Raw and normalized JSON are bounded to 16KiB. Canonical parsed field order/default transforms and lowercase colors own the content hash, not client JSON property order. Recipe identity does not include UI selection, history, layer IDs or font labels.
- D1 stores recipe JSON and its actual canonical UTF-8 size; no corresponding GIF is written to R2. Existing binaries remain untouched. Public text/settings are disclosed in the checkbox label for eligible pilot publication.
- Version 1 renderer lives in `src/lib/emoji-v1.ts`; the editor facade re-exports it for now. Historic recipes import v1 directly. Versioned, licensed source font subsets live in `src/lib/recipe-fonts-v1`, with private family aliases and content-hashed build URLs. Retain these sources when upgrading future editor fonts/renderers; do not update v1 semantics in place. A browser's glyph rasterization is still not a byte-identity guarantee across platforms.

## Rendering and downloads

One shared IntersectionObserver and requestAnimationFrame loop owns recipe canvases. Font work is deferred until visibility and shared in a bounded promise map; failures remove the pending entry for retry. Animation drawing is sampled at the selected motion interval, not on every display refresh. Document visibility stops queued frames, and static/reduced-motion items draw once. Lifecycle tests cover visible/offscreen transitions, shared scheduling, hidden/resumed documents, reduced-motion changes and final cleanup.

Measured text layout is cached per immutable preview entry only after its pinned fonts load. The ordinary editor and exporter do not reuse stale layout across edits/font changes. Cache lifetime ends with the canvas registration. Native comparison runs include the cached renderer path; they are not mobile/browser acceptance evidence.

Only clicked recipe items encode GIF. The browser checks the supported schema/version and pinned-font load, then creates a bounded 128×128 GIF via v1. It starts the local download before calling `/api/mochi/:id/count`; counting failure reports that the file was created without pretending the count succeeded. This endpoint counts accepted local-generation download attempts, not completed saves, uses same-origin POST validation and the existing download rate limit, and cannot count binary items. Binary `/download` keeps its served-response count semantics. Previews never count.

Recipe code/fonts are lazy-loaded for recipe gallery items; existing GIF-only lists do not download the extra recipe-preview CSS. A publication failure preserves the already generated local file and reports failure. No worker/offscreen encoding pipeline was added without evidence; real-mobile encoding responsiveness remains a rollout gate.

## Evidence

- `yarn verify`: 12 test files, 193 tests passed (API validation, canonical deduplication, D1-only recipe storage, origin/rate checks, count isolation, version/field rejection, lifecycle and actual decoded GIF geometry/timing).
- Local Worker with isolated `/tmp` persistence: eligible text/settings publication returned a recipe row, no GIF; listing, canvas pixels, local gallery GIF download and separate count succeeded. A legacy GIF was added locally to verify mixed previews, binary download and ranking counts. 390px viewport had no horizontal overflow.
- Downloaded gallery GIF was decoded independently: 128×128, 20 frames, 60ms each. Publication-disabled 415 response preserved the local download and displayed publication failure. No production test records were created.
- Native benchmark `node scripts/benchmark-gallery.mjs`: warm 24-canvas p95 cached batches were 0.34/0.36/0.85/2.38ms for the four documented synthetic cases in one run. These exclude browser rendering, cold fonts, mobile CPU/thermal characteristics and maximal 40-character layers. Raw generated output is kept outside the repo. Do not treat these numbers as a real-device SLA.
- Physical mobile devices were not connected. iOS Simulator and Android Emulator commands both returned `DEVICE_IN_USE`; the permitted 1000ms wait retry also failed. Other sessions were neither reused nor closed. No mobile engine acceptance is claimed.

## Local reproduction

```sh
VITE_ENABLE_MOCHI_RECIPES=true yarn build
yarn wrangler d1 migrations apply slackmojji-gallery --local --persist-to /tmp/slackmojji-recipes-pilot
yarn wrangler dev --local --port 8787 --infer-origin-from-routes=false --persist-to /tmp/slackmojji-recipes-pilot --var ENABLE_MOCHI_RECIPES:true
```

The route-origin override is necessary here: otherwise the first configured legacy redirect domain becomes the local request origin, redirecting the development browser to production. Never create fixture records against production.

## Remaining acceptance / issue status

#218 stays open, with publication disabled, until real mobile Chrome and Safari cover cold/warm fonts, 12/24-card workloads, maximal allowed text/layers, mixed kinds, hidden/offscreen/reduced-motion behavior, font failures/unsupported versions, interaction long tasks, memory, downloaded GIF timing/disposal and cross-device glyph/transform/color output. Measure export latency before deciding whether worker encoding is necessary. Record explicit delivery evidence before activation; do not silently relax this gate to emulator-only testing.
