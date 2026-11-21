# Developing ezmon

Bun + Elysia + MongoDB (Mongoose) API and worker in `src/`, React + Vite client in `client/` using the shared ez kit (`client/src/ez/`).

## Commands

Run from the repo root with [Bun](https://bun.sh).

| Task | Command |
| --- | --- |
| Install every package | `bun run install:all` |
| Run the dev servers | `bun run dev` |
| Run the test suite | `bun run test` |
| Lint with Biome | `bun run lint` |
| Apply Biome's safe fixes | `bun run lint:fix` |
| Build the frontend | `bun run build-client` |
| Start in production (PM2 where configured) | `bun run start` |

## Tests

`bun run test` runs the backend tests (`tests/`) and the client's Vitest suite. The Mongo integration tests run only when `MONGO_TEST_URI` points at a throwaway database, e.g. `docker run --rm -p 27017:27017 mongo:7` and `MONGO_TEST_URI=mongodb://127.0.0.1:27017/ezmon_test`.

## Linting

[Biome](https://biomejs.dev) 2.6.8 is the only linter. It is pinned at the repo root, so run it from there: `bun run lint` checks, `bun run lint:fix` applies safe fixes. Configuration is `biome.json`; the formatter is off in the root config, so untouched files are never reformatted. CI runs the same command.

## Branches and releases

There are two long-lived branches:

| Branch | Role |
| --- | --- |
| `development` | Integration branch. Branch from it (`feat/…`, `fix/…`, `chore/…`) and open every PR against it. |
| `master` | Released code. Only `development` is merged into it, by PR. |

No other long-lived branches (`main`, `dev`, `staging`, …) are kept; delete feature branches once merged.

To release: bump the version in `package.json` and `client/package.json`, move the `[Unreleased]` notes in `CHANGELOG.md` under `## [x.y.z] - YYYY-MM-DD`, then merge `development` into `master`. There is no image workflow yet; `test.yml` gates pushes and PRs to both branches. Build the image locally with `docker build -t ezmon .`.

Commits follow [Conventional Commits](https://www.conventionalcommits.org) (`fix(scope): …`) with a body that explains why. Add a `CHANGELOG.md` line under `[Unreleased]` for anything a user would notice. Every behaviour change needs a test; a bug fix needs one that fails without the fix.

## Docker

The image is built from `Dockerfile` on `oven/bun:1.4.5-alpine`. Keep the Bun version there and `bun-version` in `.github/workflows/` in step, and smoke-test a locally built image (`docker build -t ezmon .`) after changing either.

## Enhancements plan

Scope: six enhancement modules + bug fixes, on branch `enhancements`.
Style: Bun + Elysia + Mongoose + React19/Vite. Tabs, double quotes, semicolons.

### Modules
- **A. Per-site check interval** — `interval` field (default 60s, min 15s), worker schedules per-site, not one global cron.
- **B. Latency + uptime history** — Heartbeat TTL → 7d for latency graphs; new `SiteDaily` rollup collection for long-term uptime% (7/30/90d).
- **C. UI: latency graph + uptime badge** — per-site response-time sparkline + uptime% chips.
- **D. Alerting** — Telegram / Discord / Slack / email web-hook dispatch on status change (down + recovery). Config per-site + env keys.
- **E. Advanced checks** — method, headers, expected status, custom timeout, SSL-cert-expiry monitoring.
- **F. Public status page + SVG shield badge** — shareable `/status` (no auth) + badge endpoint.

### Bug fixes (from review)
1. Worker `res.ok===false` → `down` (was `failing` muddled with real down); catch logs truthful status/error not fake `500`.
2. Atomic `findByIdAndUpdate` `$set` instead of load-mutate-full-doc-resave.
3. `hideUrl` schema type → `t.Boolean()` (was `t.String()`).
4. 409 catch only on duplicate-key (`err.code === 11000`), not all create errors.
5. Auth: real protection on write endpoints; keep public GET/status readable.

### Naming
- kebab-case files; camelCase functions; PascalCase models.
- `src/modules/*.js` Elysia route modules; `src/services/*.js` service objects; `src/models/*.js`.
- worker + server split retained; pm2 cluster for server, fork for worker.
