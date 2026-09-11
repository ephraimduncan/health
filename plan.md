# `@openstatus/health` — implementation plan

A small, tree-shakable health-endpoint toolkit: a dependency-free core that runs
*probes* and renders a report, thin *server adapters* (Hono, Elysia, Express, Next.js)
that mount it as a route, and thin *probe packages* (Tinybird, Drizzle, Turso,
Supabase, Unkey) that know how to ping one dependency given its client or
credentials.

The repository layout, tooling and conventions are modelled on
[dahlia/logtape](https://github.com/dahlia/logtape) (one package per adapter,
dual Deno/npm workspace, `node:test` for cross-runtime tests, single shared
version), but driven end-to-end by Deno 2.9+ per
[deno.com/agents.md](https://deno.com/agents.md).

> Status: all design decisions below were reviewed and confirmed on
> 2026-09-11. §11 lists what is still open (nothing blocking).

---

## 1. Goals and non-goals

**Goals**

- One `GET /health` (and `HEAD /health`) route that aggregates dependency
  probes into `ok | degraded | unhealthy`.
- Probes are plain objects (`name`, `critical`, `timeoutMs`, `skip`, `run`);
  the user can hand-write them or use a probe package.
- Each adapter and each probe is its own package with its own peer
  dependencies, so importing `@openstatus/health-hono` never pulls Express, and
  importing `@openstatus/health-unkey` never pulls Drizzle.
- Runs on Deno, Node ≥ 22, and edge runtimes (Workers, Vercel Edge). Bun works
  (standard ESM) but is not in the CI matrix. Core uses only Web APIs
  (`fetch`, `AbortController`, `performance.now`).
- Published to **JSR** (`deno publish`) and **npm** (tsdown ESM+CJS build).
- License: **MIT** (same as `sdk-node`; the AGPL applies to the app monorepo
  only). Repo: **`openstatusHQ/health`**.

**Non-goals (v1)**

- Machine vitals / in-flight request pressure (the `machineVitals` bit of the
  inspiration snippet). Exposed via the `extend` hook instead; see §4.3.
- Liveness vs readiness split (`/live`, `/ready`). Trivial to add later on top
  of the same runner; noted in §10.
- Redis/Upstash, Postgres, Prisma, etc. probes. Same shape, add on demand.
- A docs site. JSR renders each README and generates API docs from JSDoc.

---

## 2. Repository layout

The repo lives at `openstatus-org/health/` locally (its own git repo, like its
siblings) and mirrors logtape's `packages/*` layout:

```
health/
├── deno.json                 # workspace root: members, import map, tasks
├── deno.lock                 # committed
├── package.json              # private; "workspaces" so npm/tsdown tooling sees members
├── AGENTS.md                 # conventions for AI assistants (CLAUDE.md -> symlink)
├── README.md                 # package table + quick start
├── LICENSE                   # MIT
├── .github/workflows/main.yaml
├── scripts/
│   ├── check_versions.ts     # all deno.json/package.json versions must match
│   ├── update_versions.ts    # bump every member at once
│   └── check_treeshake.ts    # bundle single-import consumers, assert no stray deps
├── examples/                 # type-checked in CI (`deno check examples/`), never published
│   ├── hono/main.ts          # Deno.serve + healthRoute with all five probes
│   ├── elysia/main.ts
│   ├── express/main.ts
│   └── next/app/health/route.ts
└── packages/
    ├── health/               # @openstatus/health          core (zero deps)
    ├── hono/                 # @openstatus/health-hono     adapter
    ├── elysia/               # @openstatus/health-elysia   adapter
    ├── express/              # @openstatus/health-express  adapter
    ├── next/                 # @openstatus/health-next     adapter (App Router)
    ├── tinybird/             # @openstatus/health-tinybird probe
    ├── drizzle/              # @openstatus/health-drizzle  probe
    ├── turso/                # @openstatus/health-turso    probe
    ├── supabase/             # @openstatus/health-supabase probe
    └── unkey/                # @openstatus/health-unkey    probe
```

Every package has the same skeleton (copied from `@logtape/hono`):

```
packages/<name>/
├── deno.json           # name, version, exports: ./src/mod.ts, tasks
├── package.json        # npm metadata, exports -> dist/, sideEffects: false, peerDeps
├── tsdown.config.ts    # ESM + CJS + d.ts, unbundle: true
├── README.md
└── src/
    ├── mod.ts          # public API only
    ├── *.ts            # implementation
    └── *.test.ts       # node:test, one per implementation file
```

### Naming

| Package              | Directory           | JSR / npm name                |
| -------------------- | ------------------- | ----------------------------- |
| core                 | `packages/health`   | `@openstatus/health`          |
| Hono adapter         | `packages/hono`     | `@openstatus/health-hono`     |
| Elysia adapter       | `packages/elysia`   | `@openstatus/health-elysia`   |
| Express adapter      | `packages/express`  | `@openstatus/health-express`  |
| Next.js adapter      | `packages/next`     | `@openstatus/health-next`     |
| Tinybird probe       | `packages/tinybird` | `@openstatus/health-tinybird` |
| Drizzle probe        | `packages/drizzle`  | `@openstatus/health-drizzle`  |
| Turso / libSQL probe | `packages/turso`    | `@openstatus/health-turso`    |
| Supabase probe       | `packages/supabase` | `@openstatus/health-supabase` |
| Unkey probe          | `packages/unkey`    | `@openstatus/health-unkey`    |

`@openstatus` already exists as a JSR scope; `@openstatus/health` is unclaimed
on both JSR and npm (checked 2026-09-11). Hyphenated sibling packages rather
than `@openstatus/health/hono` subpaths: one package per concern, and separate
packages are the strongest tree-shaking guarantee — a consumer's lockfile never
even contains the other frameworks.

Versioning: **one shared version, starting at `0.1.0`**, enforced by
`scripts/check_versions.ts`.

---

## 3. Tooling (all Deno)

Unlike logtape, no mise/pnpm/nushell. Deno is the package manager, task runner,
formatter (`deno fmt`), linter (`deno lint`), type checker and test runner;
Node is only used to run the built npm output in CI.

### Root `deno.json`

```jsonc
{
  "workspace": [
    "./packages/health",
    "./packages/hono",
    "./packages/elysia",
    "./packages/express",
    "./packages/next",
    "./packages/tinybird",
    "./packages/drizzle",
    "./packages/turso",
    "./packages/supabase",
    "./packages/unkey"
  ],
  "imports": {
    // dev / test only
    "@std/assert": "jsr:@std/assert@^1.0.13",
    "@std/async": "jsr:@std/async@^1.0.13",
    "@std/path": "jsr:@std/path@^1.1.0",
    "esbuild": "npm:esbuild@^0.25.0",
    "tsdown": "npm:tsdown@^0.12.7",
    "typescript": "npm:typescript@^5.8.3",
    // peer deps of adapters / probes (types + test runtime)
    "hono": "npm:hono@^4.0.0",
    "elysia": "npm:elysia@^1.4.0",
    "express": "npm:express@^5.2.1",
    "@types/express": "npm:@types/express@^5.0.6",
    "next": "npm:next@^15.0.0",
    "drizzle-orm": "npm:drizzle-orm@^0.44.0",
    "@libsql/client": "npm:@libsql/client@^0.15.0",
    "@supabase/supabase-js": "npm:@supabase/supabase-js@^2.0.0"
  },
  "exclude": ["**/dist/", "**/node_modules/", "coverage/", ".cov/"],
  "fmt": { "exclude": ["**/*.md"] },
  "lint": { "rules": { "tags": ["recommended"] } },
  "tasks": {
    "check": "deno check && deno check examples/ && deno lint && deno fmt --check && deno task check:versions",
    "fmt": "deno fmt",
    "test": "deno test --allow-net --allow-env --allow-read --allow-sys",
    "coverage": "rm -rf coverage && deno task test --coverage && deno coverage --html coverage",
    "build": "deno install && deno task --filter '@openstatus/*' build",
    "test:node": { "dependencies": ["build"], "command": "deno task --filter '@openstatus/*' test:node" },
    "check:treeshake": { "dependencies": ["build"], "command": "deno run --allow-read --allow-write --allow-env --allow-run scripts/check_treeshake.ts" },
    "test-all": { "dependencies": ["check", "test", "test:node", "check:treeshake"] },
    "check:versions": "deno run --allow-read scripts/check_versions.ts",
    "update-versions": "deno run --allow-read --allow-write scripts/update_versions.ts",
    "publish": { "command": "deno publish", "dependencies": ["check", "test"] }
  }
}
```

Notes:

- `hono` from **npm** (not `jsr:@hono/hono`) so the same specifier resolves
  identically in Deno tests and in the npm build; openstatus already uses npm
  hono 4.x.
- `deno install` reads every member's `package.json` and writes an isolated
  `node_modules`, so `tsdown`, `node --test` and `esbuild` find their
  binaries. `deno ci` in CI.
- Permissions on the `test` task are the minimum probes/adapters need
  (ephemeral `node:http` server for Express, `fetch` stubs otherwise). No `-A`.
- Root `package.json` is `{ "private": true, "workspaces": ["packages/*"] }`
  plus `devDependencies` for `tsdown`/`typescript`/`esbuild`, so `npm publish`
  and editors see a normal monorepo. No `catalog:` — that is a pnpm-only
  protocol; versions are written out explicitly in each `package.json`.

### Per-package `deno.json` (template)

```json
{
  "name": "@openstatus/health-hono",
  "version": "0.1.0",
  "license": "MIT",
  "exports": "./src/mod.ts",
  "exclude": ["dist/"],
  "tasks": {
    "build": "tsdown",
    "test": "deno test --allow-net --allow-env",
    "test:node": "node --experimental-transform-types --test"
  }
}
```

### Per-package `package.json` (template)

```jsonc
{
  "name": "@openstatus/health-hono",
  "version": "0.1.0",
  "description": "Hono adapter for @openstatus/health",
  "license": "MIT",
  "repository": { "type": "git", "url": "git+https://github.com/openstatusHQ/health.git", "directory": "packages/hono/" },
  "type": "module",
  "module": "./dist/mod.js",
  "main": "./dist/mod.cjs",
  "types": "./dist/mod.d.ts",
  "exports": {
    ".": {
      "types": { "import": "./dist/mod.d.ts", "require": "./dist/mod.d.cts" },
      "import": "./dist/mod.js",
      "require": "./dist/mod.cjs"
    },
    "./package.json": "./package.json"
  },
  "sideEffects": false,
  "files": ["dist/"],
  "peerDependencies": { "@openstatus/health": "workspace:^", "hono": "^4.0.0" },
  "devDependencies": { "hono": "^4.0.0", "tsdown": "^0.12.7", "typescript": "^5.8.3" },
  "scripts": { "build": "tsdown", "prepack": "tsdown" }
}
```

### `tsdown.config.ts` (identical in every package)

```ts
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/mod.ts",
  dts: { sourcemap: true },
  format: ["esm", "cjs"],
  platform: "neutral", // "node" only for packages/express
  unbundle: true,      // one output file per source file -> bundlers can drop unused modules
});
```

---

## 4. Core: `@openstatus/health`

Zero runtime dependencies. Everything else builds on these types.

### 4.1 Types

```ts
export type HealthStatus = "ok" | "degraded" | "unhealthy";
export type CheckStatus = "ok" | "failed" | "timeout" | "skipped";

export interface Probe {
  /** Unique within one endpoint; used as the key in the report. */
  readonly name: string;
  /** A failing critical probe makes the whole report `unhealthy`; a failing
   *  non-critical probe only makes it `degraded`. @default false */
  readonly critical?: boolean;
  /** Overrides the endpoint-level default. @default 5000 */
  readonly timeoutMs?: number;
  /** Evaluated synchronously on every run; `true` reports the check as
   *  `skipped`. Skip is a configuration decision, not a network call. */
  readonly skip?: () => boolean;
  /** Resolve = healthy. Reject/throw = failed. Must honour `signal`. */
  readonly run: (signal: AbortSignal) => unknown | Promise<unknown>;
}

/** Shared by every probe factory so `name`/`critical`/`timeoutMs`/`skip` can
 *  be overridden uniformly. */
export type ProbeOverrides = Partial<Pick<Probe, "name" | "critical" | "timeoutMs" | "skip">>;

export interface CheckResult {
  readonly name: string;
  readonly status: CheckStatus;
  readonly critical: boolean;
  readonly latencyMs: number;
  /** Present only when status is `failed` or `timeout`. */
  readonly error?: string;
}

export interface HealthReport {
  readonly status: HealthStatus;
  readonly checkedAt: string;        // ISO-8601
  readonly latencyMs: number;        // wall time of the whole round
  readonly checks: readonly CheckResult[];
}
```

### 4.2 Runner: `runProbes()`

```ts
export interface RunProbesOptions {
  readonly timeoutMs?: number;                       // default per-probe timeout, 5000
  readonly formatError?: (error: unknown) => string; // see below
}
export function runProbes(probes: readonly Probe[], options?: RunProbesOptions): Promise<HealthReport>;
```

Behaviour:

- All probes run concurrently (`Promise.allSettled`), each with its own
  `AbortController`; a timer aborts it after `timeoutMs` → `status: "timeout"`.
- `skip()` is evaluated first; a throwing `skip` counts as `failed` (never
  swallow errors).
- Aggregation: any critical `failed|timeout` → `unhealthy`; any non-critical
  `failed|timeout` → `degraded`; otherwise `ok`. `skipped` never affects
  status. Timeouts are failures — a hung critical dependency takes the service
  out of rotation.
- **Error text is generic by default**: `"failed"` for rejections and
  `"timed out after {n}ms"` for timeouts. Real messages (which can carry
  connection strings) only appear when the user supplies `formatError`, e.g.
  `formatError: (e) => e instanceof Error ? e.message : String(e)`.
- Duplicate probe names throw at construction time
  (`createHealthCheck`/adapter factory), never at request time.

### 4.3 Endpoint options (shared by every adapter)

```ts
export interface HealthEndpointOptions<Ctx = Request> {
  readonly probes: readonly Probe[];
  /** Route path the adapter mounts. @default "/health" */
  readonly path?: string;
  /** Reuse the last report for this long, whatever its outcome; concurrent
   *  callers share one in-flight round (the `pending` promise pattern from the
   *  inspiration). `0` disables. @default 5000 */
  readonly cacheMs?: number;
  /** Default per-probe timeout. @default 5000 */
  readonly timeoutMs?: number;
  /** Include the `checks` array (probe names, latencies, errors) in the body.
   *  `false` returns `{ status, checkedAt }` only — for public endpoints.
   *  @default true */
  readonly exposeChecks?: boolean;
  /** HTTP status to send when the report is `unhealthy`. Set `200` to always
   *  answer 200 and let callers read `status` instead. @default 503 */
  readonly unhealthyStatusCode?: number;
  /** HTTP status to send when the report is `degraded`. @default 200 */
  readonly degradedStatusCode?: number;
  /** Extra top-level fields merged into the body (region, requestId, vitals…).
   *  Runs on every request, after the (possibly cached) report is resolved.
   *  `ctx` is the framework's request context: `Request` in core, Hono
   *  `Context`, Elysia context, Express `req`. */
  readonly extend?: (report: HealthReport, ctx: Ctx) => Record<string, unknown> | Promise<Record<string, unknown>>;
  readonly formatError?: (error: unknown) => string;
}
```

`exposeChecks` and `unhealthyStatusCode` are the two switches explicitly asked
for ("publish the probes or not", "503 or just `status: unhealthy`").

### 4.4 Cached checker: `createHealthCheck()`

```ts
export interface HealthCheck {
  report(): Promise<HealthReport>;   // cached + de-duplicated
  invalidate(): void;                // drop the cache (tests, admin hooks)
}
export function createHealthCheck(options: HealthEndpointOptions): HealthCheck;
```

Holds `cached` and `pending` exactly like the inspiration snippet. Healthy and
failed reports share the same TTL. Adapters never re-implement caching.

### 4.5 Response rendering: `renderHealthResponse()` and `createHealthHandler()`

```ts
export interface HealthHttpResponse {
  readonly status: number;                  // 200 / degradedStatusCode / unhealthyStatusCode
  readonly headers: Record<string, string>; // Content-Type: application/json, Cache-Control: no-store
  readonly body: HealthResponseBody;
}
export function renderHealthResponse(report: HealthReport, options: HealthEndpointOptions, extra?: Record<string, unknown>): HealthHttpResponse;

/** Fetch-API handler: works directly with Deno.serve, Bun.serve, Workers, and
 *  Next.js route handlers; underpins the Hono, Elysia and Next.js adapters. Answers GET
 *  and HEAD (HEAD: same status and headers, empty body). */
export function createHealthHandler(options: HealthEndpointOptions<Request>): (request: Request) => Promise<Response>;
```

Body shape (`exposeChecks: true`):

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

Body shape (`exposeChecks: false`): `{ "status": "degraded", "checkedAt": "…" }`
— no `latencyMs` at all, so nothing hints at dependency timing. `extend()`
fields are spread at the top level in both modes.

### 4.6 Built-in probe helpers

Dependency-free helpers that the probe packages and end users build on:

```ts
/** Rejects unless `response.ok` (or `expectStatus` matches). Drains the body. */
export function expectOk(response: Response | Promise<Response>, expectStatus?: number): Promise<Response>;

/** Reachability probe for any HTTP endpoint. */
export function httpProbe(options: ProbeOverrides & {
  name: string; url: string | URL; method?: "GET" | "HEAD"; headers?: HeadersInit;
  expectStatus?: number;
  fetch?: typeof fetch;   // injectable for tests and custom agents
}): Probe;

/** Identity helper for readability at call sites. */
export function probe(options: Probe): Probe;
```

`mod.ts` re-exports types and these functions only; no framework code, no
top-level side effects, so `"sideEffects": false` is truthful.

---

## 5. Server adapters

Each adapter is ~50 lines: validate options → `createHealthCheck` → register
GET/HEAD on `options.path` → `renderHealthResponse` → framework response. Each
returns a **mountable sub-app/router that owns the path** (default
`/health`). Framework-specific extras go through `extend(report, ctx)`.

### 5.1 `@openstatus/health-hono`

```ts
import { healthRoute } from "@openstatus/health-hono";

const app = new Hono();
app.route("/", healthRoute({
  probes: [...],
  exposeChecks: true,
  unhealthyStatusCode: 503,
  extend: (report, c) => ({ region: Deno.env.get("FLY_REGION"), requestId: c.get("requestId") }),
}));
```

- `healthRoute(options: HealthEndpointOptions<Context>): Hono` — sub-app
  created with `strict: false` so `/health` and `/health/` both match.
- Runtime import: `hono` (peer `^4.0.0`). Uses `c.json(body, status, headers)`;
  HEAD registered explicitly.
- Tests: `app.request("/health")` — no server needed.

### 5.2 `@openstatus/health-elysia`

```ts
import { health } from "@openstatus/health-elysia";
new Elysia().use(health({ probes: [...] })).listen(3000);
```

- `health(options): Elysia` — plugin instance with `name: "@openstatus/health"`
  for dedupe; registers `.get(path)` and `.head(path)`; sets `set.status` and
  `set.headers`.
- Only a structural context subset is typed (like `@logtape/elysia`'s
  `ElysiaContext`). Peer: `elysia ^1.4.0`; Elysia 2 support is added once it
  is stable.
- Tests: `app.handle(new Request("http://localhost/health"))`.

### 5.3 `@openstatus/health-express`

```ts
import { healthRouter } from "@openstatus/health-express";
app.use(healthRouter({ probes: [...] }));
```

- `healthRouter(options): Router` — `express.Router()` with `get`/`head`.
- Express is imported at runtime only for `Router()`; request/response are
  typed structurally (`ExpressRequest`, `ExpressResponse` minimal interfaces,
  as `@logtape/express` does) so peer `express ^4 || ^5` both type-check.
- `tsdown` `platform: "node"` for this package only.
- Tests: `node:http` server on port 0 + global `fetch`.

### 5.4 `@openstatus/health-next`

```ts
// app/health/route.ts
import { healthRoute } from "@openstatus/health-next";

export const dynamic = "force-dynamic"; // never statically cache a health check

export const { GET, HEAD } = healthRoute({
  probes: [...],
  extend: (report, req) => ({ requestId: req.headers.get("x-request-id") }),
});
```

- `healthRoute(options: HealthEndpointOptions<NextRequest>): { GET, HEAD }` —
  App Router route-handler pair built on core's `createHealthHandler`; `path`
  is ignored (the file location is the route) and documented as such.
- `next` is a peer (`^14 || ^15`) used for **types only**
  (`import type { NextRequest } from "next/server"`), so the package has zero
  runtime imports and is safe on the Edge runtime.
- The README covers `export const dynamic = "force-dynamic"` (or
  `revalidate = 0`) and why `cacheMs` is the only cache that should apply.
- Pages Router (`pages/api/health.ts`, Node `req`/`res`) is deferred to
  "later"; users on Pages can mount the Express router via a small shim or
  wait for `healthApiRoute()`.
- Tests: call `GET(new NextRequest("http://localhost/health"))` directly —
  no Next server needed; the example under `examples/next/` is type-checked
  in CI.

---

## 6. Probe packages

Every probe package exports one factory that returns a `Probe`. It receives
the **client instance where one exists, otherwise a base URL** — never reads
`process.env` itself (edge-safe; openstatus passes `env.TINYBIRD_URL` in).
All accept `ProbeOverrides` (`name`, `critical`, `timeoutMs`, `skip`).
Database probes default to `critical: true`, SaaS probes to `false`.

Client types are imported with `import type` wherever possible, so the probe
package has **no runtime import** of the client library and adds nothing to the
consumer's bundle beyond the ~20 lines of probe code.

| Package    | Factory                                                    | Default name | Critical | What it does |
| ---------- | ---------------------------------------------------------- | ------------ | -------- | ------------ |
| `tinybird` | `tinybirdProbe({ baseUrl?, fetch? })`                      | `tinybird`   | `false`  | `GET {baseUrl}/v0/health`, default `https://api.tinybird.co`. Unauthenticated reachability only — workspace tokens 403 on `/v0/pipes`, so an authed probe would flag a healthy Tinybird as down. |
| `unkey`    | `unkeyProbe({ baseUrl?, fetch? })`                         | `unkey`      | `false`  | `GET {baseUrl}/v2/liveness`, default `https://api.unkey.com`. |
| `turso`    | `tursoProbe({ client })`                                   | `database`   | `true`   | `client.execute("select 1")` on a `@libsql/client` `Client`, typed structurally as `{ execute(sql: string): Promise<unknown> }`. No pool to exhaust over HTTP; never touches a table. |
| `drizzle`  | `drizzleProbe({ db })`                                     | `database`   | `true`   | Detects the driver: `db.execute(sql\`select 1\`)` when present (pg/mysql), else `db.run(sql\`select 1\`)` (sqlite/libsql — what openstatus uses via `drizzle-orm/libsql/http`). Only runtime import is `sql` from `drizzle-orm` (peer `>=0.30`). |
| `supabase` | `supabaseProbe({ client, rpc?, maxConnectionPercent? })`   | `supabase`   | `false`  | Implements the "Check Postgres connection pressure" health check from Supabase's [Detecting issues](https://supabase.com/docs/guides/observability/detecting#health) guide. supabase-js cannot run raw SQL, so the package README ships a SQL function (below); the probe calls `client.rpc(rpc ?? "health_connection_pressure")`, fails on `error`, and fails when `connection_percent > maxConnectionPercent` (default `90`). The row is attached to the error text via `formatError` if the user wants it. |

Supabase SQL function shipped in the README (a migration the user applies
once):

```sql
create or replace function public.health_connection_pressure()
returns table (
  current_connections int,
  active_connections int,
  waiting_connections int,
  max_connections int,
  connection_percent numeric
)
language sql security definer set search_path = public as $$
  select
    count(*)::int,
    count(*) filter (where state = 'active')::int,
    count(*) filter (where wait_event_type is not null)::int,
    current_setting('max_connections')::int,
    round(100.0 * count(*) / nullif(current_setting('max_connections')::int, 0), 2)
  from pg_stat_activity;
$$;
revoke all on function public.health_connection_pressure() from public;
grant execute on function public.health_connection_pressure() to service_role;
```

The README notes that `pg_stat_activity` needs `security definer` and that the
function should only be granted to the role whose key the probe uses.

Tinybird and Unkey are one-liners over core's `httpProbe`; the packages exist
to carry the right URLs, defaults and docs.

Each probe test injects a fake `fetch` / fake client and asserts: success,
rejection on non-2xx / thrown error / `error` field, abort on timeout (`signal`
is passed through), threshold behaviour (supabase), and that
`skip`/`critical`/`name` overrides are honoured.

---

## 7. Tree-shaking guarantees (checklist)

- [x] One concern per package; no umbrella barrel that re-exports adapters or
      probes from the core.
- [x] `"sideEffects": false` in every `package.json`; no top-level statements
      other than declarations in any `src/*.ts`.
- [x] ESM-first (`"type": "module"`, `exports.import`), CJS only as fallback.
- [x] `tsdown` `unbundle: true` so each source file is its own output module.
- [x] Client libraries are `import type` only (turso, supabase, express
      req/res, next); runtime imports limited to what is actually called
      (`hono`, `elysia`, `express.Router`, `drizzle-orm`'s `sql`).
- [x] `scripts/check_treeshake.ts` (CI job): for each package, esbuild-bundle
      a one-line consumer (`import { unkeyProbe } from "@openstatus/health-unkey"`)
      from `dist/` with `--bundle --metafile`, and fail if the metafile
      contains any module from another framework/client package (`hono`,
      `elysia`, `express`, `next`, `drizzle-orm`, `@libsql/client`,
      `@supabase/supabase-js`) that the entry does not legitimately depend on.

---

## 8. Testing strategy

- Framework: `node:test` + `node:assert/strict` (+ `node:timers/promises` for
  delays), exactly as logtape, so the same files run under `deno test` (source)
  and `node --experimental-transform-types --test` (built output).
- Core: runner aggregation table (ok/degraded/unhealthy/skipped), timeout →
  abort → `timeout` status, generic vs custom `formatError`, duplicate-name
  rejection, cache TTL (also for failures), in-flight de-duplication (two
  concurrent `report()` calls invoke probes once), `exposeChecks: false` body,
  status-code mapping, HEAD has no body.
- Adapters: end-to-end request against an in-memory app (Hono/Elysia) or an
  ephemeral `node:http` server (Express); assert status code, headers
  (`Cache-Control: no-store`), body, and that `extend` receives the framework
  context.
- Probes: fake `fetch`/clients as described in §6.
- Examples: `deno check examples/` as part of `check`.
- Coverage: `deno task coverage` (HTML) locally; lcov uploaded in CI.

---

## 9. CI and publishing

`.github/workflows/main.yaml` (adapted from logtape; mise replaced by explicit
runtime setup, Bun dropped):

- **check** — `denoland/setup-deno@v2` → `deno ci` → `deno task check`.
- **test-deno** — matrix ubuntu/macos/windows → `deno task test --coverage`.
- **test-node** — setup Deno + Node 24 → `deno task build` → `deno task test:node`.
- **treeshake** — `deno task check:treeshake`.
- **No publish job.** Releases are done manually by the maintainer:
  `deno task check:versions` → `deno publish` (JSR) → `deno task build` →
  `npm publish --access public` in each `packages/*`. CI only verifies
  `deno publish --dry-run` still passes.

Versioning: all packages share one version (`scripts/check_versions.ts` fails
`check` otherwise). `deno task update-versions 0.2.0` rewrites every
`deno.json` **and** `package.json`.

---

## 10. Implementation todo list

`0.1.0` = core + all four adapters + all five probes, tagged when `check`,
`test-deno`, `test-node` and `treeshake` are green. Phases are sequential;
tasks inside a phase are ordered by dependency. Phases 0–3 are complete and
Phase 4 is complete up to the manual tag step (4.10).

### Phase 0 — repository scaffold ✅

- [x] 0.1 `git init` in `health/`; default branch `main`.
- [x] 0.2 `LICENSE` (MIT, "Copyright (c) 2026 Openstatus", same text as `sdk-node`).
- [x] 0.3 `.gitignore`: `node_modules/`, `**/dist/`, `coverage/`, `.cov/`, `.test-report.xml`, `.DS_Store`.
- [x] 0.4 Root `deno.json` per §3: `workspace` (10 members), `imports`, `exclude`, `fmt`, `lint`, `tasks`.
- [x] 0.5 Root `package.json`: `private: true`, `workspaces: ["packages/*"]`, devDependencies `tsdown`, `typescript`, `esbuild`.
- [x] 0.6 `.editorconfig` (2 spaces, LF, final newline) and `.vscode/settings.json` enabling the Deno extension (`deno.enable: true`).
- [x] 0.7 `scripts/check_versions.ts` — port from logtape; read every workspace member's `deno.json` + `package.json`; exit 1 on mismatch.
- [x] 0.8 `scripts/update_versions.ts` — take `<version>` arg, rewrite `version` in every member's `deno.json` + `package.json`.
- [x] 0.9 `AGENTS.md` (+ `CLAUDE.md` symlink): package skeleton, dual-workspace rule ("add to `deno.json` workspace **and** CI treeshake list"), `node:test` conventions, naming rules, how to run `deno task check/test/build/test:node/check:treeshake`.
- [x] 0.10 Root `README.md` skeleton: one-paragraph pitch, package table (10 rows, badges left for Phase 4), quick start placeholder.
- [x] 0.11 `.github/workflows/main.yaml` with `check` and `test-deno` jobs only (others added in later phases); `concurrency` group + `cancel-in-progress`.
- [x] 0.12 Create `packages/health` skeleton (empty `src/mod.ts` exporting nothing) so `deno install` produces `deno.lock`; commit `deno.lock`.
- [x] 0.13 Verify `deno task check` and `deno task test` pass on the empty workspace; first commit.

### Phase 1 — core `@openstatus/health` ✅

Package files
- [x] 1.1 `packages/health/deno.json` (`name`, `version 0.1.0`, `exports ./src/mod.ts`, tasks `build`, `test`, `test:node`).
- [x] 1.2 `packages/health/package.json` per §3 template, no peer deps, `sideEffects: false`.
- [x] 1.3 `packages/health/tsdown.config.ts` (`platform: "neutral"`, `unbundle: true`).

Source (`src/`)
- [x] 1.4 `types.ts`: `HealthStatus`, `CheckStatus`, `Probe`, `ProbeOverrides`, `CheckResult`, `HealthReport`, `HealthEndpointOptions<Ctx>`, `HealthResponseBody`, `HealthHttpResponse`; JSDoc on every export.
- [x] 1.5 `errors.ts`: `defaultFormatError` (generic strings), `timeoutMessage(ms)`; `DuplicateProbeError` (or plain `Error` with clear message).
- [x] 1.6 `run.ts`: `runProbes(probes, options)`; per-probe `AbortController` + timer; `Promise.allSettled`; `performance.now()` latency; `skip()` evaluated sync, throwing skip → `failed`; aggregation rule; clears timers in `finally`.
- [x] 1.7 `validate.ts`: `assertUniqueProbeNames(probes)` used by `createHealthCheck`.
- [x] 1.8 `check.ts`: `createHealthCheck(options)` → `{ report(), invalidate() }`; `cached`/`pending` dedupe; `cacheMs: 0` disables; same TTL for all outcomes.
- [x] 1.9 `response.ts`: `renderHealthResponse(report, options, extra)` → status code mapping (`ok`→200, `degraded`→`degradedStatusCode`, `unhealthy`→`unhealthyStatusCode`), `exposeChecks` body shapes, headers `content-type: application/json; charset=utf-8`, `cache-control: no-store`.
- [x] 1.10 `handler.ts`: `createHealthHandler(options)` → `(request: Request) => Promise<Response>`; GET → JSON body; HEAD → same status/headers, `null` body; other methods → 405 with `allow: GET, HEAD`; calls `extend(report, request)`.
- [x] 1.11 `probes.ts`: `expectOk(responseOrPromise, expectStatus?)` (drains body, rejects with status in message), `httpProbe(options)` (injectable `fetch`, passes `signal`, default `GET`), `probe(options)` identity helper.
- [x] 1.12 `mod.ts`: re-export types + `runProbes`, `createHealthCheck`, `renderHealthResponse`, `createHealthHandler`, `expectOk`, `httpProbe`, `probe`. No top-level side effects.

Tests (`node:test`, one file per source file)
- [x] 1.13 `run.test.ts`: aggregation table (all ok; skipped only; non-critical fail → degraded; critical fail → unhealthy; critical timeout → unhealthy; mixed); latency populated; timeout aborts `signal` and reports `timed out after Nms`; throwing `skip` → failed; generic vs custom `formatError`; probe-level `timeoutMs` overrides endpoint default.
- [x] 1.14 `check.test.ts`: duplicate names throw at construction; cache hit within TTL; cache miss after TTL (fake timers or small TTL + `delay`); concurrent `report()` calls run probes once; `invalidate()` forces re-run; failed report cached for same TTL; `cacheMs: 0` runs every time but still dedupes in-flight.
- [x] 1.15 `response.test.ts`: status code mapping incl. overrides (`unhealthyStatusCode: 200`); `exposeChecks: false` body is exactly `{ status, checkedAt }` + `extend` fields; `exposeChecks: true` includes `latencyMs` + `checks`; headers.
- [x] 1.16 `handler.test.ts`: GET/HEAD/405; body JSON round-trip; `extend` receives the `Request`; async `extend`.
- [x] 1.17 `probes.test.ts`: `expectOk` on ok / non-ok / `expectStatus`; `httpProbe` passes `signal`, headers, method; rejects on non-2xx; overrides honoured.

Docs
- [x] 1.18 `packages/health/README.md`: install (`deno add jsr:@openstatus/health` / `npm i @openstatus/health`), Probe contract, `Deno.serve(createHealthHandler({...}))` example, options table (§4.3), response shapes, `exposeChecks`/`unhealthyStatusCode` guidance, hand-written probe example with `skip`.
- [x] 1.19 `deno task check && deno task test` green; `deno publish --dry-run` for the core passes (JSR "slow types" — add explicit return types everywhere).

### Phase 2 — server adapters ✅

Shared
- [x] 2.0 Add `packages/hono`, `packages/next`, `packages/elysia`, `packages/express` to root `deno.json` `workspace`; extend CI `test-node` job (added here since the first built packages appear now).
  - Note: the `@openstatus/health` peer dependency is declared as `^0.1.0`, not `workspace:^` — npm does not rewrite the `workspace:` protocol on publish, so consumers' `npm install` would fail. `update_versions.ts` keeps the range in sync and `check_versions.ts` enforces it.

`@openstatus/health-hono`
- [x] 2.1 `deno.json`, `package.json` (peer `@openstatus/health workspace:^`, `hono ^4.0.0`; dev `hono`), `tsdown.config.ts` (`neutral`).
- [x] 2.2 `src/mod.ts`: `healthRoute(options: HealthEndpointOptions<Context>): Hono` — `new Hono({ strict: false })`, `get`+`head` on `options.path ?? "/health"`, `createHealthCheck` once, `c.json(body, status, headers)`; HEAD returns `c.body(null, status, headers)`.
- [x] 2.3 `src/mod.test.ts`: `app.route("/", healthRoute(...))` + `app.request("/health")`, `/health/`, HEAD, custom `path`, 503 on unhealthy, `unhealthyStatusCode: 200`, `extend` receives Hono `Context` (`c.get`), duplicate-name throw.
- [x] 2.4 `README.md`: mount example, `extend` with `requestId`, note on `strict: false`.
- [x] 2.5 `examples/hono/main.ts`: `Deno.serve` + all five probes (turso, drizzle, tinybird, unkey, supabase) with env-driven `skip`.

`@openstatus/health-next`
- [x] 2.6 `deno.json`, `package.json` (peer `next ^14 || ^15`, types only; dev `next`), `tsdown.config.ts` (`neutral`).
- [x] 2.7 `src/mod.ts`: `healthRoute(options: HealthEndpointOptions<NextRequest>): { GET, HEAD }` wrapping `createHealthHandler`; `import type { NextRequest } from "next/server"`; document that `path` is ignored.
- [x] 2.8 `src/mod.test.ts`: call `GET(new Request(...))`/`HEAD(...)` directly; status/body/headers; `extend` receives the request.
- [x] 2.9 `README.md`: `app/health/route.ts` example with `export const dynamic = "force-dynamic"`, Edge runtime note.
- [x] 2.10 `examples/next/app/health/route.ts` (type-checked only).

`@openstatus/health-elysia`
- [x] 2.11 `deno.json` (test task may need `--no-check` like logtape if Elysia types are heavy), `package.json` (peer `elysia ^1.4.0`), `tsdown.config.ts` (`neutral`).
- [x] 2.12 `src/mod.ts`: `health(options): Elysia` — `new Elysia({ name: "@openstatus/health" })`, `.get(path)`/`.head(path)`, `set.status`/`set.headers`; structural `ElysiaHealthContext` type.
- [x] 2.13 `src/mod.test.ts`: `app.handle(new Request("http://localhost/health"))`, HEAD, custom path, status overrides, `extend` receives context, plugin dedupe when `.use`d twice.
- [x] 2.14 `README.md` + `examples/elysia/main.ts`.

`@openstatus/health-express`
- [x] 2.15 `deno.json`, `package.json` (peer `express ^4 || ^5`; dev `express ^5`, `@types/express`), `tsdown.config.ts` (`platform: "node"`).
- [x] 2.16 `src/mod.ts`: `healthRouter(options): Router` — `Router()`, `get`/`head`, `res.status(...).set(headers).json(body)` / `.end()`; minimal `ExpressRequest`/`ExpressResponse` interfaces; async errors forwarded to `next(err)`.
- [x] 2.17 `src/mod.test.ts`: `node:http` server on port 0, `fetch` GET/HEAD, custom path, status overrides, `extend` receives `req`.
- [x] 2.18 `README.md` + `examples/express/main.ts`.

Phase gate
- [x] 2.19 `deno task check`, `deno task test`, `deno task build`, `deno task test:node` green; `deno publish --dry-run` for all four adapters.

### Phase 3 — probe packages ✅

Shared
- [x] 3.0 Add the five probe packages to root `deno.json` `workspace`. Each probe package keeps its own tiny `src/fake-fetch.ts` / fake-client test helper (not exported) — the core stays free of test utilities.

`@openstatus/health-unkey`
- [x] 3.1 Package files (no peer deps besides core), `tsdown` neutral.
- [x] 3.2 `src/mod.ts`: `unkeyProbe({ baseUrl = "https://api.unkey.com", fetch, ...overrides })` → `httpProbe` on `/v2/liveness`; default `name: "unkey"`, `critical: false`.
- [x] 3.3 Tests: hits the right URL; ok on 200; failed on 500; timeout aborts; overrides.
- [x] 3.4 `README.md`.

`@openstatus/health-tinybird`
- [x] 3.5 Package files, `tsdown` neutral.
- [x] 3.6 `src/mod.ts`: `tinybirdProbe({ baseUrl = "https://api.tinybird.co", fetch, ...overrides })` → `httpProbe` on `/v0/health`; default `name: "tinybird"`, `critical: false`; JSDoc explains why unauthenticated.
- [x] 3.7 Tests as 3.3, plus custom `baseUrl` (self-hosted / `TINYBIRD_URL`).
- [x] 3.8 `README.md` with `skip: () => env.TINYBIRD_NOOP` idiom.

`@openstatus/health-turso`
- [x] 3.9 Package files (peer `@libsql/client` optional, types only), `tsdown` neutral.
- [x] 3.10 `src/mod.ts`: `LibsqlLikeClient = { execute(sql: string): Promise<unknown> }`; `tursoProbe({ client, ...overrides })` → `client.execute("select 1")`; default `name: "database"`, `critical: true`.
- [x] 3.11 Tests with a fake client: resolves; rejects; `signal` ignored gracefully (libsql has no abort) but timeout still reported.
- [x] 3.12 `README.md`.

`@openstatus/health-drizzle`
- [x] 3.13 Package files (peer `drizzle-orm >=0.30`), `tsdown` neutral.
- [x] 3.14 `src/mod.ts`: `DrizzleLikeDb = { execute?(q): Promise<unknown>; run?(q): Promise<unknown> }`; `drizzleProbe({ db, ...overrides })` → prefer `execute`, else `run`, else throw at construction ("unsupported drizzle instance"); imports `sql` from `drizzle-orm`; default `name: "database"`, `critical: true`.
- [x] 3.15 Tests: fake pg-style db (`execute`), fake sqlite-style db (`run`), neither → construction error; rejection → failed.
- [x] 3.16 `README.md` with the openstatus `drizzle-orm/libsql/http` example.

`@openstatus/health-supabase`
- [x] 3.17 Package files (peer `@supabase/supabase-js ^2`, types only), `tsdown` neutral.
- [x] 3.18 `src/mod.ts`: `SupabaseLikeClient = { rpc(fn: string, args?, opts?): PromiseLike<{ data: unknown; error: unknown }> }`; `supabaseProbe({ client, rpc = "health_connection_pressure", maxConnectionPercent = 90, ...overrides })`; fail on `error`, fail when `connection_percent > max`; default `name: "supabase"`, `critical: false`; pass `signal` via `.abortSignal(signal)` when the builder exposes it.
- [x] 3.19 Tests: fake client returning rows below/above threshold, `error` set, unexpected shape → failed.
- [x] 3.20 `README.md`: the SQL function from §6, grant guidance (`service_role` only), threshold docs, link to the Supabase Detecting-issues guide.

Phase gate
- [x] 3.21 Update `examples/*` to wire all five probes; `deno task check` (incl. `deno check examples/`), `test`, `build`, `test:node` green; `deno publish --dry-run` for all probes.

### Phase 4 — release hardening (4.10 pending maintainer)

- [x] 4.1 `scripts/check_treeshake.ts`: for each package build a temp consumer importing one symbol from `dist/mod.js`, run esbuild `--bundle --metafile --platform=neutral --external:@openstatus/*` (externals only for cross-package deps), parse metafile, fail if any module path contains a framework/client name not in that package's allowlist.
  - Note: externals are the *other* workspace members only (externalising `@openstatus/*` wholesale skipped the package under test), and the script also fails if `dist/` was not bundled at all.
- [x] 4.2 `check:treeshake` task + `treeshake` CI job (needs `deno task build` first).
- [x] 4.3 CI `publish-dry-run` job: `deno publish --dry-run` after build, so a release-breaking change is caught before the manual publish.
- [x] 4.4 `RELEASING.md`: the manual release checklist (bump with `update-versions`, `check:versions`, `deno publish`, `deno task build`, `npm publish --access public` per package, tag).
- [x] 4.5 Root `README.md`: finish package table with JSR/npm badges, quick start for each adapter, probe list, "writing your own probe" section.
- [x] 4.6 `deno publish --dry-run` and `npm pack --dry-run` for every package; inspect `dist/` contents (`.js`, `.cjs`, `.d.ts`, `.d.cts`, sourcemaps only).
- [x] 4.7 Smoke-test the npm tarballs from a scratch Node project (`npm i ./packages/*/openstatus-*.tgz`) with both `import` and `require`. Verified 2026-09-11 with Node 24: all four adapters and five probes load and serve from ESM and CJS.
- [x] 4.8 `CHANGES.md` with a `0.1.0` entry.
- [x] 4.9 Create GitHub repo `openstatusHQ/health`, push, confirm CI green on `main`. (Run 34635453392: check, test-deno ×3, test-node, treeshake, publish-dry-run all green.)
- [ ] 4.10 Tag `0.1.0` locally; publishing to JSR/npm is done manually by the maintainer per `RELEASING.md`.

### Later / nice to have

- `/health/live` (no probes) vs `/health/ready` (probes) split via a
  `livenessPath` option.
- Next.js Pages Router `healthApiRoute()`.
- Additional probes: `redis` (Upstash REST), `postgres`, `prisma`, `s3`.
- Elysia 2 once stable; Fastify / Koa adapters (core's `createHealthHandler`
  already covers any Fetch-API server).
- Bun in the CI matrix.
- Optional OpenTelemetry span per probe round.

---

## 11. Decision log (confirmed 2026-09-11)

| Area | Decision |
| ---- | -------- |
| Repo / license | `openstatusHQ/health`, MIT |
| Naming | `@openstatus/health` core, `@openstatus/health-<x>` siblings |
| Versioning | single shared version, start `0.1.0` |
| Runtimes in CI | Deno + Node (Bun later) |
| Aggregation | critical fail → `unhealthy`, non-critical fail → `degraded`, timeouts are failures, skipped ignored |
| `exposeChecks` | default `true` |
| Error text | generic `"failed"` / `"timed out after Nms"`; real messages only via `formatError` |
| Defaults | `cacheMs 5000`, `timeoutMs 5000`; same TTL for failed reports |
| Status codes | `unhealthyStatusCode` (503) + `degradedStatusCode` (200) numbers |
| Body | `checks` array; no `latencyMs` when `exposeChecks: false` |
| Core extras | Fetch-API `createHealthHandler`; `expectOk` + `httpProbe` helpers |
| `extend` | `(report, ctx)` with framework context |
| `skip` | sync only |
| Validation | duplicate probe names throw at construction |
| Adapters | mountable sub-app/router owning `path`; GET + HEAD; Hono `strict:false`; Express `^4 \|\| ^5`; Elysia `^1.4`; hono from npm |
| Next.js | `@openstatus/health-next`: App Router `healthRoute()` → `{ GET, HEAD }`, `next` types-only peer `^14 \|\| ^15`; Pages Router later |
| Probe inputs | client instance where one exists, base URL otherwise; never `process.env` |
| Drizzle | detect `execute` vs `run` |
| Turso | `@libsql/client` `Client`, structural type |
| Tinybird | `baseUrl` option, default `https://api.tinybird.co` |
| Supabase | supabase-js client → `rpc('health_connection_pressure')` (SQL shipped in README), fail above `maxConnectionPercent` 90 |
| Critical defaults | database probes `true`, SaaS probes `false` |
| Registries | JSR + npm; published **manually** by the maintainer (no CI publish job) |
| Tooling | `deno fmt`/`deno lint`; `node:test`; root `package.json` with workspaces; tree-shake CI job |
| Docs | READMEs + `AGENTS.md`; one runnable example per adapter |

Nothing blocking remains open. One small thing to confirm during Phase 4:
whether the `health_connection_pressure` function should be granted to
`service_role` only (assumed).
