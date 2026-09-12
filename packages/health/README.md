# @openstatus/health

Framework-agnostic core for health endpoints: a probe runner, a cached
checker, response rendering, and a Fetch-API handler. Zero dependencies; runs
on Deno, Node, Bun and edge runtimes.

Adapters: [`@openstatus/health-hono`](https://jsr.io/@openstatus/health-hono),
[`@openstatus/health-elysia`](https://jsr.io/@openstatus/health-elysia),
[`@openstatus/health-express`](https://jsr.io/@openstatus/health-express),
[`@openstatus/health-next`](https://jsr.io/@openstatus/health-next).

## Install

```sh
deno add jsr:@openstatus/health
npm install @openstatus/health
```

## Usage

```ts
import { createHealthHandler, httpProbe, readEnv } from "@openstatus/health";

const handler = createHealthHandler({
  path: "/health",
  probes: [
    {
      name: "database",
      critical: true,
      run: () => db.run(sql`select 1`),
    },
    {
      name: "redis",
      skip: () => readEnv("UPSTASH_REDIS_REST_URL") == null,
      run: () => redis.ping(),
    },
    httpProbe({ name: "unkey", url: "https://api.unkey.com/v2/liveness" }),
  ],
});

Deno.serve(handler);
```

`GET /health` answers:

```json
{
  "status": "degraded",
  "checkedAt": "2026-09-11T12:00:00.000Z",
  "latencyMs": 41,
  "checks": [
    { "name": "database", "status": "ok", "critical": true, "latencyMs": 3 },
    { "name": "redis", "status": "skipped", "critical": false, "latencyMs": 0 },
    { "name": "unkey", "status": "timeout", "critical": false, "latencyMs": 5000, "error": "timed out after 5000ms" }
  ]
}
```

`HEAD` returns the same status code with no body. Other methods get `405`.
Without `path` the handler answers on every URL; with it, anything else gets
`404` (a trailing slash is tolerated either way).

Errors are masked by default — a failing probe reports `"error": "failed"`.
Pass `formatError: "message"` to see the real message while developing, or
read on for the trade-off.

## Probes

```ts
interface Probe {
  name: string;
  critical?: boolean;                 // default false
  timeoutMs?: number;                 // default 5000
  skip?: () => boolean | Promise<boolean>;
  run: (signal: AbortSignal, ctx: ProbeContext) => ProbeResult | Promise<ProbeResult>;
}

interface ProbeContext {
  name: string;
  critical: boolean;
  timeoutMs: number;                  // the effective timeout for this run
}
```

A probe is healthy when `run` resolves and failed when it rejects or throws.
The `signal` aborts when `timeoutMs` elapses; pass it to `fetch` and other
cancellable calls. `ctx` tells the probe its own name and effective timeout,
so it can set a shorter internal deadline or log which check it is.

`skip` runs first, inside the same timeout window. `true` reports the check as
`skipped` without calling `run` — use it for optional dependencies that are
not configured in every environment. It may be async, so feature flags and
secret lookups work too.

`probe(options)` is an identity helper that gives you autocomplete on `run`'s
parameters without an explicit `: Probe` annotation:

```ts
const redis = probe({
  name: "redis",
  run: (signal, ctx) => fetch(`${url}/ping`, { signal }),
});
```

`readEnv(name, source?)` reads one variable through `process.env` under Node,
Bun, Deno and Workers with `nodejs_compat`, and answers `undefined` instead of
throwing where env access is denied — Deno without `--allow-env` throws on both
`process.env` and `Deno.env.get`. Pass `source` to supply the values yourself,
which is how tests avoid mutating the environment.

Status aggregation:

| Result | Report status |
| ------ | ------------- |
| every probe ok or skipped | `ok` |
| a non-critical probe failed or timed out | `degraded` |
| a critical probe failed or timed out | `unhealthy` |

Probe names must be unique; duplicates throw when the endpoint is created.

A probe that ignores `signal` and settles after its deadline is still reported
as `timeout`; the late result is discarded and can never surface as an
unhandled rejection.

## Options

The options are layered so that each function only accepts what it uses:

| Type | Accepted by | Adds |
| ---- | ----------- | ---- |
| `RunProbesOptions` | `runProbes()` | `timeoutMs`, `formatError` |
| `HealthCheckOptions` | `createHealthCheck()` | `probes`, `cacheMs`, `cacheFailuresMs`, `onReport` |
| `HealthResponseOptions` | `renderHealthResponse()` | `exposeChecks`, `unhealthyStatusCode`, `degradedStatusCode` |
| `HealthHandlerOptions<Ctx>` | `createHealthHandler()`, adapter `healthHandler()` | `extend` |
| `HealthRouteOptions<Ctx>` | `createHealthHandler()`, adapter `healthRoute()` | `path` |

Each type extends the one above it, so an object typed as
`HealthRouteOptions` works everywhere.

| Option | Default | Description |
| ------ | ------- | ----------- |
| `probes` | — | Probes to run, concurrently, on every uncached request. |
| `path` | `"/health"` | Route the adapter mounts. On `createHealthHandler` there is no default: unset answers every URL, set returns `404` elsewhere. Ignored by Next.js, where the file is the route. |
| `cacheMs` | `5000` | Reuse the last `ok` report for this long; concurrent callers share one round. `0` disables. |
| `cacheFailuresMs` | `cacheMs` | Same, for `degraded` and `unhealthy` reports. Set `0` so a readiness poller sees recovery on its next tick instead of waiting out the cache. |
| `timeoutMs` | `5000` | Default per-probe timeout; a hung probe reports `timeout`. |
| `exposeChecks` | `true` | Include `latencyMs` and `checks` in the body. `false` returns only `status` and `checkedAt` — for public endpoints. |
| `unhealthyStatusCode` | `503` | HTTP status for `unhealthy`. Set `200` to always answer 200 and let callers read `status`. |
| `degradedStatusCode` | `200` | HTTP status for `degraded`. |
| `extend` | — | `(report, ctx) => object` merged into the body: request id, vitals, or a `server` object from a hosting package. `ctx` is the framework request context. Anything `JSON.stringify` accepts is fine — `interface` types and `Date`s included. `status`, `checkedAt`, `latencyMs` and `checks` always win; put your data under your own keys. |
| `formatError` | `"generic"` | What goes in a check's `error` field. `"generic"` reports `"failed"` / `"timed out after Nms"` and never leaks messages. `"message"` reports `error.message`. Or supply `(error: Error) => string`. |
| `onReport` | — | `(report) => void` called once per uncached round, after the probes finish. Log it, emit a metric, page on `unhealthy`. Errors thrown or rejected inside are swallowed. |

## Helpers

- `httpProbe({ name, url, method?, headers?, expectStatus?, fetch? })` — reachability probe for any HTTP endpoint.
- `expectOk(response, expectStatus?)` — rejects unless the response is 2xx (or the given status).
- `probe(options)` — identity function for authoring probes with inference.
- `runProbes(probes, { timeoutMs?, formatError? })` — one round, no caching.
- `createHealthCheck(options)` — `{ report(), invalidate() }` with caching and in-flight de-duplication.
- `renderHealthResponse(report, options, extended?)` — `{ status, headers, body }` for custom adapters.
- `createHealthHandler(options)` — `(request: Request) => Promise<Response>`.
- `createLazyHealthHandler((env, request) => options)` — the same handler, built once on the first request. For runtimes where configuration only exists per request, such as Cloudflare Workers' `fetch(request, env)`:

  ```ts
  export default {
    fetch: createLazyHealthHandler<Request, Env>((env) => ({
      probes: [tursoProbe({ client: createClient(env.DATABASE_URL) })],
    })),
  };
  ```

- `readEnv(name, source?)` — portable environment lookup that never throws.

## Testing

`@openstatus/health/testing` ships the doubles the packages test themselves
with, so you can test your own probes and adapters without a network:

```ts
import { runProbes } from "@openstatus/health";
import { fakeFetch, hangFetch, okProbe, failingProbe, hangingProbe } from "@openstatus/health/testing";

const report = await runProbes([
  okProbe("a"),
  failingProbe("b", true),
  myProbe({ fetch: fakeFetch({ status: 503 }) }),
]);
```

- `fakeFetch({ status?, body?, onFetch? })` — a `fetch` that answers immediately and reports each call's `url`, `method`, `headers` and `signal`.
- `hangFetch(track?)` — a `fetch` that never resolves; sets `track.aborted` when the signal fires.
- `okProbe(name, critical?)`, `failingProbe(name, critical?, error?)`, `hangingProbe(name, critical?, timeoutMs?)` — probes with a known outcome.
