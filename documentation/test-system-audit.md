# System-level test audit (#187, #229)

User decision: test execution belongs locally, not in the deployment build. No lint/type suppressions, timeout increases, ignored failures, or disabled tests were added.

## Retained boundaries

- Renderer/export: actual decoded 128px PNG/GIF, all supported text/image effects, transparency/background/gradients, transformations/layer ordering, frame count/disposal/timing, palette budget and nonempty output.
- Editor/history: atomic gestures, undo/redo branching and limit, mixed layers, restoration of source image resources/rendered output, async additions and stale panel events.
- Fonts and recipe preview: per-layer requested content, stalled requests, failure identification/recovery, pinned faces, shared visibility scheduler and lifecycle cleanup.
- Public API: real Miniflare D1/R2 storage, idempotence, pagination/ranking, download counting/cache, strict schema and malformed GIF rejection, origins, byte bounds and rate limits. Schema adversarial cases are security/system boundary coverage, not redundant field getter tests.
- Catalogs: complete items survive actual text constraints and are independently insertable; load failure/retry.
- Page-load state: author/color stability and storage failure; readable color property; equal-probability onboarding assignment, persistence, invalid assignment and blocked storage. These are explicit user-visible reload contracts.

## Removed or consolidated

- Removed date-format wrapper fixtures (third-party formatting semantics, no editor system scenario).
- Removed twelve hardcoded profile-name/avatar mapping rows; retained author reload/resource-pair lifecycle and blocked storage.
- Removed three hardcoded kaomoji label/search rows and six emoji metadata/search substring rows; retained whole-catalog insertability and load/retry paths.
- Removed blank-font/direct FontFaceSet wrapper-call and exact error-copy tests; retained mixed-layer font loading, timeout cleanup and failed-layer recovery.
- Removed download-filename helper examples; actual public API filename behavior and download/export boundaries remain.
- Removed isolated Unicode acceptance/segmentation examples duplicated by pasted grapheme limits, catalog insertability and decoded emoji output.
- Removed standalone text deletion/restoration duplicated by the independent-layer edit/delete/undo scenario; source-image resource restoration remains.

## Efficiency without reducing acceptance

The timing test still generates and decodes both GIFs, checks every frame delay and total loop duration, and compares every decoded RGBA byte. Native Buffer equality replaces recursive JavaScript matching of 20 × 128 × 128 × 4 channel values; baseline geometry/frame counts remain checked. A local focused run of four cases fell from 6.16s to 0.643s, not a Cloudflare SLA.

Geometry coverage samples the 20 phases actually exported rather than 120 synthetic phases for every effect/text combination; keeps every effect and multilingual/multiline compositions. The deployment gate uses Cloudflare's documented `WORKERS_CI=1`, not generic `CI`, so ordinary local verification and other environments retain tests. Direct `yarn test` is unconditional.

Reference: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#environment-variables
