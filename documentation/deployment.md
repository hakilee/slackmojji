# Production deployment

Public hostname: `slackmojji.haklee.me`. Cloudflare account: `haklee` (`93300edc910b267d9a3f0efd51bf600d`); Worker: `slackmojji`. The repository's `wrangler.json` owns assets, account and custom-domain configuration. The app remains a CSR application on Workers Static Assets; same-origin `/api/*` requests run `src/server/worker.ts` with D1/R2 bindings, not Pages or SSR. Navigation requests use SPA fallback; assets retain their normal file responses.

Use the pinned Wrangler development dependency through Yarn. Authenticate with `yarn wrangler login` if needed, then confirm `yarn wrangler whoami` includes the intended account. Keep credentials, `.wrangler/`, `.dev.vars*`, `.env*` and browser state out of Git. Never log authentication tokens.

## Merge-triggered release (#157)

Configured release path: Cloudflare Workers Builds connected to `hakilee/slackmojji`, production branch `main`, repository root `/`, preview builds disabled. GitHub Actions remain unused. GitHub branch protection requires PRs; a squash merge produces the main push that triggers the release.

- Build command: `corepack enable && yarn install --immutable && yarn verify`
- `WORKERS_CI=1` is injected by Cloudflare. `scripts/verify.mjs` retains format/lint/design-system/types/build checks but leaves Vitest execution to local pre-push verification. `yarn test` remains unconditional.
- Deploy command: `yarn wrangler d1 migrations apply slackmojji-gallery --remote && yarn wrangler deploy`
- Build environment: `NODE_VERSION=24.18.0`, `HUSKY=0` (remote Git hooks only; `yarn verify` remains mandatory).
- Build API token must authorize deployment of this Worker and access to its configured D1/R2 resources. Keep token values in Cloudflare, never in this repository.
- Do not enable previews against production bindings. A failed build must not execute the deploy command.

The GitHub connection and these settings are saved in Cloudflare. The first main merge validates the complete automatic release path; #157 owns build and deployment evidence.

## Manual recovery release

After the issue-linked PR is squash-merged and the working tree is clean on the accepted main commit:

```sh
yarn install --immutable
yarn verify
yarn wrangler d1 migrations apply slackmojji-gallery --remote
yarn wrangler deploy
yarn wrangler deployments list
```

Worker URL: `https://slackmojji.haklee.workers.dev`. A deployment updates the Worker and its custom domain immediately; there is no separate staging Worker or release-isolation environment. Validate locally before deploying. GitHub Actions are not used. For manual recovery, upload only the verified local `dist` output. The configured Workers Builds path must pass its static/type/build checks before deployment; complete tests run locally before push.

Confirm public HTTP 200, TLS, custom-domain routing and exact HTML/JS/CSS/font asset bytes. Use Aside CLI to verify text/font/motion editing, local font upload and GIF download on the production hostname. Record accepted commit, Worker version and results on the owning issue/PR. Native renderer tests do not establish production browser behavior. API failures return generic errors without credentials; no external error monitoring is configured.

## Domain and migration boundary

Cloudflare is authoritative for `haklee.me`. The Worker custom domain owns only `slackmojji.haklee.me`; Wrangler may replace the superseded DNS record for this hostname when attaching it. Preserve unrelated DNS records, services and nameservers. Do not buy or transfer a domain.

For the initial migration only, derive a temporary configuration without routes, pointing at the exact same `dist`, then validate workers.dev before assigning the custom domain:

```sh
node --input-type=module <<'JS'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const config = JSON.parse(readFileSync('wrangler.json', 'utf8'));
delete config.$schema;
config.routes = [];
config.assets.directory = resolve('dist');
mkdirSync('.wrangler', { recursive: true });
writeFileSync('.wrangler/initial-cutover.json', JSON.stringify(config));
JS
yarn wrangler deploy --config .wrangler/initial-cutover.json
# Verify workers.dev assets and browser behavior before changing the hostname.
yarn wrangler triggers deploy
```

The temporary configuration is ignored and is not a second Worker or a normal release path. Remove it after cutover. After public Workers routing and browser behavior pass, remove the former `hakui/slackmoji` Vercel project and all its deployments, then verify absence through project/deployment APIs. Do not remove unrelated Vercel projects. Remove local `.vercel/` linked state after successful cleanup; retain the ignore rule to prevent old credentials from being committed.

Official configuration references: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), [SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/), [custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

## Public gallery operations (#128)

- D1 `slackmojji-gallery` (`64629ec2-ed63-4b67-9adb-e46eb468db2d`) stores metadata/counters; private R2 bucket `slackmojji-gallery` stores content-addressed GIFs. Both are new resources in haklee. No public R2 bucket URL is needed.
- Local full stack: `yarn build`, `yarn wrangler d1 migrations apply slackmojji-gallery --local`, then `yarn wrangler dev --port 8787`. Tests use Wrangler platform proxies with isolated disposable D1/R2 state.
- `POST /api/mochi` publishes a validated GIF; `GET /api/mochi?sort=recent|popular&offset=0` returns 24 items; `GET /api/mochi/:id/image` is an uncounted preview; `POST /api/mochi/:id/download` returns an attachment and atomically increments the counter. POST requires a matching Origin. Counts are served responses, not unique people or proof that a save completed. Private local downloads are not counted.
- Publication optionally includes `X-Mochi-Filename` with a percent-encoded content-derived GIF filename. The Worker sanitizes and stores it; lists return `filename` and downloads return UTF-8 `Content-Disposition`. Identical content retains the first filename. Migration0002 preserves old rows with `slackmoji.gif`; source names cannot be recovered from old GIFs.
- Content hashes make retries converge without duplicate rows. R2 is written before D1 so visible rows never precede their asset. A failed DB insert may leave an unlisted content-addressed object; retry repairs it. Do not delete that object blindly during concurrent publication. Operators can reconcile orphan objects against D1 after quiescing writes.
- Rate bindings limit publication to 10/minute and counted downloads to 60/minute per connecting IP per Cloudflare location. These are abuse friction, not authentication, global hard quotas or unique-download guarantees. Raw IPs are not stored in D1. See [Cloudflare rate-limit semantics](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
- To remove a published item, use a parameterized/admin-reviewed D1 deletion for the exact content hash, then delete only its `HASH.gif` R2 object. Preview responses may remain cached for up to a day. Preserve unrelated rows/objects. Production QA must remove only records created by that QA run.

## Corrected infrastructure naming (#183)

Canonical hostname is `slackmojji.haklee.me`. The Worker also owns `slackmoji.haklee.me` and the interim `mojji.haklee.me`, redirecting both with308 and preserving path/query/method. Canonical non-API requests pass to ASSETS. The repository and Worker are `slackmojji`; the local checkout directory need not match.

D1/R2 `slackmojji-gallery` preserve all gallery IDs, filenames, bytes and counters. Previous resources are inactive rollback backups only. Automatic main deployment retains static/type/build verification; local pre-push retains full tests. Visible Korean brand is 슬랙모찌.
