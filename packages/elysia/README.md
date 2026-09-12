# @openstatus/health-elysia

Elysia adapter for [`@openstatus/health`](https://jsr.io/@openstatus/health).

```sh
bun add @openstatus/health @openstatus/health-elysia
```

```ts
import { Elysia } from "elysia";
import { healthRoute } from "@openstatus/health-elysia";
import { tinybirdProbe } from "@openstatus/health-tinybird";

new Elysia()
  .use(healthRoute({ probes: [tinybirdProbe()] }))
  .listen(3000);
```

`healthRoute(options)` returns an Elysia plugin answering `GET` and `HEAD` on
`options.path` (default `/health`). `healthHandler(options)` is the handler
underneath, for mounting on a route of your own:

```ts
import { healthHandler } from "@openstatus/health-elysia";

const handler = healthHandler({ probes });
new Elysia().get("/health", handler).head("/health", handler);
```

`extend` and a function-form `exposeChecks` receive the Elysia `Context` —
`request`, `path`, `headers`, `store`, `set`. `healthHandler` takes your app's
singleton type so decorated and derived values are typed too:

```ts
type Singleton = {
  decorator: { db: Database };
  store: {};
  derive: {};
  resolve: {};
};

new Elysia().decorate("db", db).get(
  "/health",
  healthHandler<Singleton>({
    probes,
    extend: (_report, ctx) => ({ pool: ctx.db.poolSize }),
  }),
);
```

`healthRoute` is a plugin on a fresh `Elysia`, so its context is the base one.
Pass `check` instead of `probes` to share one `createHealthCheck()` between
routes. Methods other than `GET` and `HEAD` fall through to Elysia's `404`.
All other options are documented in `@openstatus/health`.
