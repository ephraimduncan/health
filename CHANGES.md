# Changelog

## 0.1.0

Initial release.

- `@openstatus/health`: dependency-free core — `runProbes()`,
  `createHealthCheck()` (TTL cache + in-flight de-duplication),
  `renderHealthResponse()`, Fetch-API `createHealthHandler()`, and the
  `httpProbe()` / `expectOk()` / `probe()` helpers. Reports aggregate to
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
  `@openstatus/health-drizzle` (`select 1` via `execute` or `run`), `@openstatus/health-supabase`
  (`health_connection_pressure()` RPC with a `maxConnectionPercent`
  threshold).
- Published to JSR and npm (ESM + CJS, `sideEffects: false`, one output
  module per source file); a CI job asserts that importing one package never
  bundles another framework or client library.
