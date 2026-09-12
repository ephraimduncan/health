# @openstatus/health-hono

Hono adapter for [`@openstatus/health`](https://jsr.io/@openstatus/health).

```sh
deno add jsr:@openstatus/health jsr:@openstatus/health-hono
npm install @openstatus/health @openstatus/health-hono
```

```ts
import { Hono } from "hono";
import { healthRoute } from "@openstatus/health-hono";
import { tursoProbe } from "@openstatus/health-turso";
import { unkeyProbe } from "@openstatus/health-unkey";

const app = new Hono();

app.route(
  "/",
  healthRoute({
    probes: [tursoProbe({ client }), unkeyProbe()],
    extend: (_report, c) => ({ requestId: c.get("requestId") }),
  }),
);
```

`healthRoute(options)` returns a `Hono` sub-app that answers `GET` and `HEAD`
on `options.path` (default `/health`). Both `/health` and `/health/` are
registered, so the trailing slash matches regardless of the parent app's
`strict` setting. Mount it with `app.route("/", ...)` — the path is already
inside the sub-app, so `app.route("/health", ...)` would serve
`/health/health`.

When you would rather own the route, `healthHandler(options)` returns a plain
Hono `Handler` that answers both methods and takes every option except `path`:

```ts
import { healthHandler } from "@openstatus/health-hono";

app.on(["GET", "HEAD"], "/health", auth, healthHandler({ probes }));
```

`extend` receives the Hono `Context` as its second argument. Methods other
than `GET` and `HEAD` are not registered and fall through to your app's
`notFound`. All other options are documented in `@openstatus/health`.
