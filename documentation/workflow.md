# Issue-driven workflow

1. Select or create an issue with scope and acceptance criteria.
2. Update the owning specification before implementation. Link requirements to meaningful tests.
3. Use `feat/<issue>-<topic>` or `fix/<issue>-<topic>` branches.
4. Implement and run full local `yarn verify` (including Vitest). Workers Builds executes static/type/build checks only via its injected `WORKERS_CI=1`. Test browser behavior with Aside CLI.
5. Open a PR with `Closes #N`, local results and explicit gaps. Review for secrets before publishing.
6. Squash merge only. GitHub deletes the merged head branch automatically when the repository setting is enabled.

Repository administration is separate from local hooks. Husky can be bypassed and cannot establish server-side checks. Main must require a PR and block deletion/force push through GitHub rules. Do not require hosted status checks: no GitHub Actions are used.
