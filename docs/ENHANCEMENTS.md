# ezmon — Enhancements Plan

Scope: six enhancement modules + bug fixes, on branch `enhancements`.
Style: Bun + Elysia + Mongoose + React19/Vite. Tabs, double quotes, semicolons.

## Modules
- **A. Per-site check interval** — `interval` field (default 60s, min 15s), worker schedules per-site, not one global cron.
- **B. Latency + uptime history** — Heartbeat TTL → 7d for latency graphs; new `SiteDaily` rollup collection for long-term uptime% (7/30/90d).
- **C. UI: latency graph + uptime badge** — per-site response-time sparkline + uptime% chips.
- **D. Alerting** — Telegram / Discord / Slack / email web-hook dispatch on status change (down + recovery). Config per-site + env keys.
- **E. Advanced checks** — method, headers, expected status, custom timeout, SSL-cert-expiry monitoring.
- **F. Public status page + SVG shield badge** — shareable `/status` (no auth) + badge endpoint.

## Bug fixes (from review)
1. Worker `res.ok===false` → `down` (was `failing` muddled with real down); catch logs truthful status/error not fake `500`.
2. Atomic `findByIdAndUpdate` `$set` instead of load-mutate-full-doc-resave.
3. `hideUrl` schema type → `t.Boolean()` (was `t.String()`).
4. 409 catch only on duplicate-key (`err.code === 11000`), not all create errors.
5. Auth: real protection on write endpoints; keep public GET/status readable.

## Naming
- kebab-case files; camelCase functions; PascalCase models.
- `src/modules/*.js` Elysia route modules; `src/services/*.js` service objects; `src/models/*.js`.
- worker + server split retained; pm2 cluster for server, fork for worker.