# @openstatus/health-cloudflare

Cloudflare Workers server metadata for
[`@openstatus/health`](https://jsr.io/@openstatus/health). Renders the colo that
served the request, and the Worker version when you supply the binding, under a
`server` key.

```sh
deno add jsr:@openstatus/health jsr:@openstatus/health-cloudflare
npm install @openstatus/health @openstatus/health-cloudflare
```

```ts
import { createHealthHandler, type HealthHandler } from "@openstatus/health";
import { cloudflareExtend } from "@openstatus/health-cloudflare";

let handler: HealthHandler | undefined;

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    handler ??= createHealthHandler({
      probes: [/* ... */],
      extend: cloudflareExtend({ version: env.CF_VERSION_METADATA }),
    });
    return handler(request);
  },
};
```

```json
{
  "status": "ok",
  "checkedAt": "2026-09-11T12:00:00.000Z",
  "server": {
    "platform": "cloudflare",
    "region": "DFW",
    "version": "45f6ad3c-8f1e-4c2b-9d11-2a7c5f0e3b88",
    "versionTag": "v3"
  }
}
```

## Build the handler once

Bindings only exist inside `fetch(request, env)`, but the handler must be built
once — construct it per request and every request gets a fresh cache, so
`cacheMs` never de-duplicates anything and your probes run on every poll. The
`handler ??=` above is the whole trick: built on the first request, when `env`
is finally in scope, and reused after that.

## Fields

| Field | Source |
| ----- | ------ |
| `region` | `request.cf.colo` — the IATA code of the data centre that served the request |
| `version` | `CF_VERSION_METADATA.id`, when the binding is passed |
| `versionTag` | `CF_VERSION_METADATA.tag`, when the binding is passed |

Add the binding in `wrangler.jsonc`:

```jsonc
{ "version_metadata": { "binding": "CF_VERSION_METADATA" } }
```

There is no `instanceId`: isolates are not addressable, so the field is absent
rather than invented.

**Client geolocation is never rendered.** `request.cf` also carries `country`,
`city`, `latitude`, `longitude` and a `region` — those describe whoever called
you, not where you ran, and `cf.region` ("Texas") means something different from
the `region` in this body (the colo). None of them appear under `server`, and a
test enforces it. If you want caller geography, put it in your own `extend`
under your own key.

## Reaching the request

Unlike the other hosting packages, this one reads the request rather than the
environment, so it needs to know how to get it from whatever your adapter hands
`extend`. By default the context *is* the request:

```ts
extend: cloudflareExtend(),                                // Workers fetch, Next.js
extend: cloudflareExtend({ request: (c) => c.req.raw }),   // Hono
extend: cloudflareExtend({ request: (c) => c.request }),   // Elysia
```

Or call `cloudflareServer(request)` yourself and compose:

```ts
extend: (_report, c) => ({
  server: cloudflareServer(c.req.raw, { version: c.env.CF_VERSION_METADATA }),
  rayId: c.req.header("cf-ray"),
}),
```

Nothing is memoised here, deliberately: the colo is a property of the request,
not of the isolate, and two requests to the same Worker can be served by
different data centres.

## Off Workers

`cloudflareServer()` returns `undefined` when the request carries no `cf`
object, and the extend then renders no `server` key — so `wrangler dev`, local
Node runs and tests all behave the same way without branching.

## Public endpoints

`extend` output renders even when `exposeChecks` is `false`. The colo is
harmless to publish; the version id tells anyone polling exactly which build you
are running. Serve two endpoints if that matters to you.
