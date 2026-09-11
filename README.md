# @openstatus/health

[![main](https://github.com/openstatusHQ/health/actions/workflows/main.yaml/badge.svg)](https://github.com/openstatusHQ/health/actions/workflows/main.yaml)
[![JSR](https://jsr.io/badges/@openstatus/health)](https://jsr.io/@openstatus/health)
[![npm](https://img.shields.io/npm/v/@openstatus/health)](https://www.npmjs.com/package/@openstatus/health)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Tree-shakable health endpoints for JavaScript servers. A dependency-free core
runs *probes* against your dependencies and renders `ok | degraded |
unhealthy`; thin adapters mount it as `GET /health` on your framework; thin
probe packages know how to ping one dependency each.

Runs on Deno, Node ≥ 22, Bun and edge runtimes. Published to JSR and npm.

```json
{
  "status": "degraded",
  "checkedAt": "2026-09-11T12:00:00.000Z",
  "latencyMs": 41,
  "checks": [
    { "name": "database", "status": "ok",      "critical": true,  "latencyMs": 3 },
    { "name": "redis",    "status": "skipped", "critical": false, "latencyMs": 0 },
    { "name": "tinybird", "status": "timeout", "critical": false, "latencyMs": 5000, "error": "timed out after 5000ms" }
  ]
}
```

## Packages

### Core

| Package | JSR | npm | Description |
| ------- | --- | --- | ----------- |
| [`@openstatus/health`](packages/health) | [![JSR](https://jsr.io/badges/@openstatus/health)](https://jsr.io/@openstatus/health) | [![npm](https://img.shields.io/npm/v/@openstatus/health)](https://www.npmjs.com/package/@openstatus/health) | Probe runner, caching, response rendering, Fetch-API handler |

### Server adapters

| Package | JSR | npm | Description |
| ------- | --- | --- | ----------- |
| [`@openstatus/health-hono`](packages/hono) | [![JSR](https://jsr.io/badges/@openstatus/health-hono)](https://jsr.io/@openstatus/health-hono) | [![npm](https://img.shields.io/npm/v/@openstatus/health-hono)](https://www.npmjs.com/package/@openstatus/health-hono) | Hono adapter |
| [`@openstatus/health-elysia`](packages/elysia) | [![JSR](https://jsr.io/badges/@openstatus/health-elysia)](https://jsr.io/@openstatus/health-elysia) | [![npm](https://img.shields.io/npm/v/@openstatus/health-elysia)](https://www.npmjs.com/package/@openstatus/health-elysia) | Elysia adapter |
| [`@openstatus/health-express`](packages/express) | [![JSR](https://jsr.io/badges/@openstatus/health-express)](https://jsr.io/@openstatus/health-express) | [![npm](https://img.shields.io/npm/v/@openstatus/health-express)](https://www.npmjs.com/package/@openstatus/health-express) | Express 4 / 5 adapter |
| [`@openstatus/health-next`](packages/next) | [![JSR](https://jsr.io/badges/@openstatus/health-next)](https://jsr.io/@openstatus/health-next) | [![npm](https://img.shields.io/npm/v/@openstatus/health-next)](https://www.npmjs.com/package/@openstatus/health-next) | Next.js App Router adapter |

### Providers

| Package | JSR | npm | Description |
| ------- | --- | --- | ----------- |
| [`@openstatus/health-drizzle`](packages/drizzle) | [![JSR](https://jsr.io/badges/@openstatus/health-drizzle)](https://jsr.io/@openstatus/health-drizzle) | [![npm](https://img.shields.io/npm/v/@openstatus/health-drizzle)](https://www.npmjs.com/package/@openstatus/health-drizzle) | Drizzle ORM `select 1` probe |
| [`@openstatus/health-supabase`](packages/supabase) | [![JSR](https://jsr.io/badges/@openstatus/health-supabase)](https://jsr.io/@openstatus/health-supabase) | [![npm](https://img.shields.io/npm/v/@openstatus/health-supabase)](https://www.npmjs.com/package/@openstatus/health-supabase) | Supabase connection-pressure probe |
| [`@openstatus/health-tinybird`](packages/tinybird) | [![JSR](https://jsr.io/badges/@openstatus/health-tinybird)](https://jsr.io/@openstatus/health-tinybird) | [![npm](https://img.shields.io/npm/v/@openstatus/health-tinybird)](https://www.npmjs.com/package/@openstatus/health-tinybird) | Tinybird reachability probe |
| [`@openstatus/health-turso`](packages/turso) | [![JSR](https://jsr.io/badges/@openstatus/health-turso)](https://jsr.io/@openstatus/health-turso) | [![npm](https://img.shields.io/npm/v/@openstatus/health-turso)](https://www.npmjs.com/package/@openstatus/health-turso) | Turso libSQL `select 1` probe (`@libsql/client`) |
| [`@openstatus/health-turso-serverless`](packages/turso-serverless) | [![JSR](https://jsr.io/badges/@openstatus/health-turso-serverless)](https://jsr.io/@openstatus/health-turso-serverless) | [![npm](https://img.shields.io/npm/v/@openstatus/health-turso-serverless)](https://www.npmjs.com/package/@openstatus/health-turso-serverless) | Turso `select 1` probe over the serverless driver (`@tursodatabase/serverless`) |
| [`@openstatus/health-unkey`](packages/unkey) | [![JSR](https://jsr.io/badges/@openstatus/health-unkey)](https://jsr.io/@openstatus/health-unkey) | [![npm](https://img.shields.io/npm/v/@openstatus/health-unkey)](https://www.npmjs.com/package/@openstatus/health-unkey) | Unkey liveness probe |

### Hosting

| Package | JSR | npm | Description |
| ------- | --- | --- | ----------- |
| [`@openstatus/health-fly`](packages/fly) | [![JSR](https://jsr.io/badges/@openstatus/health-fly)](https://jsr.io/@openstatus/health-fly) | [![npm](https://img.shields.io/npm/v/@openstatus/health-fly)](https://www.npmjs.com/package/@openstatus/health-fly) | Fly.io region, machine and deployment |
| [`@openstatus/health-koyeb`](packages/koyeb) | [![JSR](https://jsr.io/badges/@openstatus/health-koyeb)](https://jsr.io/@openstatus/health-koyeb) | [![npm](https://img.shields.io/npm/v/@openstatus/health-koyeb)](https://www.npmjs.com/package/@openstatus/health-koyeb) | Koyeb region, instance and deployment |
| [`@openstatus/health-railway`](packages/railway) | [![JSR](https://jsr.io/badges/@openstatus/health-railway)](https://jsr.io/@openstatus/health-railway) | [![npm](https://img.shields.io/npm/v/@openstatus/health-railway)](https://www.npmjs.com/package/@openstatus/health-railway) | Railway region, replica, environment and deployment |
| [`@openstatus/health-vercel`](packages/vercel) | [![JSR](https://jsr.io/badges/@openstatus/health-vercel)](https://jsr.io/@openstatus/health-vercel) | [![npm](https://img.shields.io/npm/v/@openstatus/health-vercel)](https://www.npmjs.com/package/@openstatus/health-vercel) | Vercel region, environment and deployment |
| [`@openstatus/health-cloudflare`](packages/cloudflare) | [![JSR](https://jsr.io/badges/@openstatus/health-cloudflare)](https://jsr.io/@openstatus/health-cloudflare) | [![npm](https://img.shields.io/npm/v/@openstatus/health-cloudflare)](https://www.npmjs.com/package/@openstatus/health-cloudflare) | Cloudflare Workers colo and version metadata |

Each package is its own concern with its own peer dependencies: importing
`@openstatus/health-hono` never pulls Express, and importing
`@openstatus/health-unkey` never pulls Drizzle. CI bundles a one-line consumer
of every package and fails if any other framework or client library lands in
the output.

## Quick start

Install the core plus one adapter and the probes you need:

```sh
deno add jsr:@openstatus/health jsr:@openstatus/health-hono jsr:@openstatus/health-turso
npm install @openstatus/health @openstatus/health-hono @openstatus/health-turso
```

### Hono

```ts
import { Hono } from "hono";
import { healthRoute } from "@openstatus/health-hono";
import { tursoProbe } from "@openstatus/health-turso";
import { unkeyProbe } from "@openstatus/health-unkey";

const app = new Hono();

app.route("/", healthRoute({
  probes: [tursoProbe({ client }), unkeyProbe()],
  extend: (_report, c) => ({ requestId: c.get("requestId") }),
}));
```

### Elysia

```ts
import { Elysia } from "elysia";
import { health } from "@openstatus/health-elysia";
import { tinybirdProbe } from "@openstatus/health-tinybird";

new Elysia().use(health({ probes: [tinybirdProbe()] })).listen(3000);
```

### Express

```ts
import express from "express";
import { healthRouter } from "@openstatus/health-express";
import { drizzleProbe } from "@openstatus/health-drizzle";

const app = express();
app.use(healthRouter({ probes: [drizzleProbe({ db })] }));
```

### Next.js (App Router)

```ts
// app/health/route.ts
import { healthRoute } from "@openstatus/health-next";
import { supabaseProbe } from "@openstatus/health-supabase";

export const dynamic = "force-dynamic";

export const { GET, HEAD } = healthRoute({ probes: [supabaseProbe({ client })] });
```

### Anything with a Fetch API (`Deno.serve`, `Bun.serve`, Workers)

```ts
import { createHealthHandler } from "@openstatus/health";

Deno.serve(createHealthHandler({ probes: [/* ... */] }));
```

## Options

Every adapter takes the same options:

| Option | Default | Description |
| ------ | ------- | ----------- |
| `probes` | — | The probes to run, concurrently, on every uncached request. |
| `path` | `"/health"` | Route the adapter mounts (ignored by Next.js, where the file is the route). |
| `cacheMs` | `5000` | Reuse the last report for this long; concurrent callers share one round. `0` disables. |
| `timeoutMs` | `5000` | Default per-probe timeout; a hung probe reports `timeout`. |
| `exposeChecks` | `true` | Include `latencyMs` and `checks` in the body. `false` returns only `{ status, checkedAt }` — for public endpoints. |
| `unhealthyStatusCode` | `503` | HTTP status for `unhealthy`. Set `200` to always answer 200 and let callers read `status`. |
| `degradedStatusCode` | `200` | HTTP status for `degraded`. |
| `extend` | — | `(report, ctx) => object` merged into the body: request id, vitals, or a `server` object from a hosting package. `ctx` is the framework request context. |
| `formatError` | generic | Errors are reported as `"failed"` / `"timed out after Nms"` unless you supply `(error) => string`. |

Aggregation: a failing or timed-out **critical** probe makes the report
`unhealthy`; a failing non-critical probe makes it `degraded`; `skipped`
probes never affect it.

## Probes

| Probe | Default name | Critical | Checks |
| ----- | ------------ | -------- | ------ |
| `tinybirdProbe({ baseUrl? })` | `tinybird` | no | `GET {baseUrl}/v0/health` |
| `unkeyProbe({ baseUrl? })` | `unkey` | no | `GET {baseUrl}/v2/liveness` |
| `tursoProbe({ client })` | `database` | yes | `client.execute("select 1")` on a Turso libSQL client |
| `tursoServerlessProbe({ connection })` | `database` | yes | `connection.get("select 1")` on a Turso serverless `Connection` |
| `drizzleProbe({ db })` | `database` | yes | `db.execute(sql\`select 1\`)` or `db.run(...)` |
| `supabaseProbe({ client, maxConnectionPercent? })` | `supabase` | no | `rpc("health_connection_pressure")` ≤ threshold |

Every probe factory accepts `name`, `critical`, `timeoutMs` and `skip`
overrides. Probes take a client instance or a base URL — they never read
`process.env` themselves.

## Writing your own probe

A probe is a plain object. Resolve for healthy, reject or throw for failed,
and honour the `AbortSignal` so a timeout actually cancels the work:

```ts
import { httpProbe, type Probe } from "@openstatus/health";

const redis: Probe = {
  name: "redis",
  critical: true,
  timeoutMs: 1000,
  skip: () => !env.UPSTASH_REDIS_REST_URL,
  run: async (signal) => {
    const res = await fetch(`${env.UPSTASH_REDIS_REST_URL}/ping`, {
      headers: { authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}` },
      signal,
    });
    if (!res.ok) throw new Error(`redis answered ${res.status}`);
  },
};

const docs = httpProbe({ name: "docs", url: "https://docs.example.com", method: "HEAD" });
```

`skip` is evaluated synchronously on every request and reports the check as
`skipped` without running it — use it for optional dependencies that are not
configured in every environment.

## Server metadata

The hosting packages answer a different question from the probes: not "is the
database up" but "which replica is telling me that". Each reads its platform's
own environment — or, on Workers, the request — and renders it under `server`
through the same `extend` hook:

```ts
import { healthRoute } from "@openstatus/health-hono";
import { flyExtend } from "@openstatus/health-fly";

app.route("/", healthRoute({ probes, extend: flyExtend() }));
```

```json
{
  "status": "ok",
  "checkedAt": "2026-09-11T12:00:00.000Z",
  "latencyMs": 41,
  "checks": [{ "name": "database", "status": "ok", "critical": true, "latencyMs": 3 }],
  "server": {
    "platform": "fly",
    "region": "ams",
    "instanceId": "148e21ebd47089",
    "service": "openstatus-api",
    "version": "registry.fly.io/openstatus-api:deployment-01H9RK9EYO9PGNBYAKGXSHV0PH",
    "primaryRegion": "cdg"
  }
}
```

`platform`, `region`, `instanceId`, `service`, `version` and `environment` mean
the same thing on every platform; anything else is named as that platform names
it. A field is absent rather than guessed when the platform has no equivalent —
Vercel exposes no instance identity, so there is no `instanceId` there. Values
are passed through exactly as the platform sets them, so `region` is `ams` on
Fly and `DFW` on Cloudflare.

Each package also exports the data on its own — `flyServer()`, `vercelServer()`
— so you can compose it with your own fields, or chain platforms if one build
deploys to several:

```ts
extend: (_report, c) => ({
  server: flyServer() ?? vercelServer(),
  requestId: c.get("requestId"),
}),
```

Off-platform they return `undefined` and nothing is rendered, so the same build
runs unchanged on your laptop. Note that `extend` output is included even when
`exposeChecks` is `false`: if `/health` is public, serve the detailed body on a
second, internal route instead.

## Development

```sh
deno task check            # type-check, lint, fmt, version consistency
deno task test             # node:test suites under Deno
deno task build            # tsdown -> dist/ for every package
deno task test:node        # the same suites under Node against dist/
deno task check:treeshake  # no package bundles another framework/client
deno task test-all         # all of the above
```

See [`AGENTS.md`](AGENTS.md) for conventions and [`RELEASING.md`](RELEASING.md)
for the release checklist.

## License

[MIT](LICENSE)
