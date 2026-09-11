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
on `options.path` (default `/health`, with and without a trailing slash).
Mount it with `app.route("/", ...)`.

`extend` receives the Hono `Context` as its second argument. All other options
are documented in `@openstatus/health`.
