# Changelog

## 0.1.0

Initial release.

- `@openstatus/health`: dependency-free core — `runProbes()`,
  `createHealthCheck()` (TTL cache + in-flight de-duplication),
  `renderHealthResponse()`, Fetch-API `createHealthHandler()`, and the
  `httpProbe()` / `expectOk()` / `probe()` helpers, and `readEnv()` for
  environment lookups that work the same under Node, Bun, Deno and Workers. Reports aggregate to
  `ok | degraded | unhealthy`; timeouts count as failures; error text is
  generic unless `formatError` is supplied.
- Server adapters: `@openstatus/health-hono` (`healthRoute()`),
  `@openstatus/health-elysia` (`health()`), `@openstatus/health-express`
  (`healthRouter()`), `@openstatus/health-next` (`healthRoute()` for the App
  Router). Every adapter answers `GET` and `HEAD`, honours `path`,
  `exposeChecks`, `unhealthyStatusCode`, `degradedStatusCode` and passes its
  framework context to `extend()`.
- Probes: `@openstatus/health-tinybird` (`GET /v0/health`),
  `@openstatus/health-unkey` (`GET /v2/liveness`), `@openstatus/health-turso`
  (`select 1` on a libSQL client), `@openstatus/health-turso-serverless`
  (`select 1` on a `@tursodatabase/serverless` connection),
  `@openstatus/health-drizzle` (`select 1` via `execute` or `run`),
  `@openstatus/health-supabase` (`health_connection_pressure()` RPC with a
  `maxConnectionPercent` threshold).
- Hosting packages: `@openstatus/health-fly`, `@openstatus/health-koyeb`,
  `@openstatus/health-railway`, `@openstatus/health-vercel` and
  `@openstatus/health-cloudflare` render the region, instance and deployment
  that produced the response under a `server` key, through `extend`. Each
  exports `xServer()` for the object and `xExtend()` for the wrapper;
  `platform`, `region`, `instanceId`, `service`, `version` and `environment`
  mean the same thing on every platform, values are passed through exactly as
  the platform sets them, and nothing is rendered off-platform. The Cloudflare
  package reads `request.cf.colo` instead of the environment and never renders
  client geolocation.
- Published to JSR and npm (ESM + CJS, `sideEffects: false`, one output
  module per source file); a CI job asserts that importing one package never
  bundles another framework or client library.
