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

`GET /` answers:

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

## Probes

```ts
interface Probe {
  name: string;
  critical?: boolean;                 // default false
  timeoutMs?: number;                 // default 5000
  skip?: () => boolean;               // true reports "skipped" without running
  run: (signal: AbortSignal) => ProbeResult | Promise<ProbeResult>;
}
```

`readEnv(name, source?)` reads one variable through `process.env` under Node,
Bun, Deno and Workers with `nodejs_compat`, and answers `undefined` instead of
throwing where env access is denied — Deno without `--allow-env` throws on both
`process.env` and `Deno.env.get`. Pass `source` to supply the values yourself,
which is how tests avoid mutating the environment.

A probe is healthy when `run` resolves and failed when it rejects or throws.
The `signal` aborts when `timeoutMs` elapses; pass it to `fetch` and other
cancellable calls.

Status aggregation:

| Result | Report status |
| ------ | ------------- |
| every probe ok or skipped | `ok` |
| a non-critical probe failed or timed out | `degraded` |
| a critical probe failed or timed out | `unhealthy` |

Probe names must be unique; duplicates throw when the endpoint is created.

## Options

Every adapter accepts the same `HealthEndpointOptions`:

| Option | Default | Description |
| ------ | ------- | ----------- |
| `probes` | — | Probes to run. |
| `path` | `"/health"` | Route path (adapters only). |
| `cacheMs` | `5000` | Reuse the last report for this long; concurrent callers share one round. `0` disables. |
| `timeoutMs` | `5000` | Default per-probe timeout. |
| `exposeChecks` | `true` | Include `latencyMs` and `checks` in the body. `false` returns only `status` and `checkedAt`. |
| `unhealthyStatusCode` | `503` | HTTP status for `unhealthy`. Set `200` to always answer 200. |
| `degradedStatusCode` | `200` | HTTP status for `degraded`. |
| `extend` | — | `(report, ctx) => object` merged into the body: region, request id, vitals. `ctx` is the framework request. |
| `formatError` | generic | `(error: Error) => string` for the `error` field. By default failures report `"failed"` and timeouts `"timed out after Nms"`; supply your own to expose messages. |

## Helpers

- `httpProbe({ name, url, method?, headers?, expectStatus?, fetch? })` — reachability probe for any HTTP endpoint.
- `expectOk(response, expectStatus?)` — rejects unless the response is 2xx (or the given status).
- `runProbes(probes, { timeoutMs?, formatError? })` — one round, no caching.
- `createHealthCheck(options)` — `{ report(), invalidate() }` with caching and in-flight de-duplication.
- `renderHealthResponse(report, options, extended?)` — `{ status, headers, body }` for custom adapters.
- `readEnv(name, source?)` — portable environment lookup that never throws.
