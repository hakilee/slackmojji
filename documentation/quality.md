# Local quality

Use Node 24.18+ and the pinned Yarn release (`yarn`, via Corepack, or `node .yarn/releases/yarn-4.18.1.cjs`). Install with `yarn install --immutable`. Run `yarn prepare` once after cloning.

Locally, `yarn verify` runs formatting (oxfmt), lint (oxlint), the recursive design-system AST/usage inventory gate, strict TypeScript checking (including tests), Vitest and the production build. In Cloudflare Workers Builds (`WORKERS_CI=1`), the same command runs static checks, types and the production build without executing Vitest. Local pre-push verification remains mandatory; `yarn test` always runs tests regardless of environment. Pre-commit runs formatting/lint/typecheck; pre-push runs complete verification. No hosted workflows.

Use colocated `.test.ts` files with named `describe` and `test` imports from Vitest. One top-level suite per file. Arrange, exercise and assert observable behavior; use table cases for meaningful variants. Register cleanup immediately on resource acquisition via `onTestFinished`, or use explicit fixture/hook lifetimes. Await asynchronous work. `allowOnly: false` rejects focused suites. Do not test source spellings or introduce production seams solely for tests.

Canvas tests verify decoded GIF output, not browser presentation. Browser evidence must separately cover editing, preview, download, responsive layout and errors. Record failures and unrun checks honestly.

## System-level test scope (#187, #229)

Retain tests at product boundaries: decoded export/rendering, editing/history resource restoration, font/canvas lifecycle failures, catalog insertability, page-load assignment/storage lifetimes and real D1/R2 API flows. Do not recreate third-party formatters, hardcode catalog/profile rows, or test one-line delegation in isolation. The audit and removals are documented in [test-system-audit](test-system-audit.md).
