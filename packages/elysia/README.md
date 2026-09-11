# @openstatus/health-elysia

Elysia adapter for [`@openstatus/health`](https://jsr.io/@openstatus/health).

```sh
bun add @openstatus/health @openstatus/health-elysia
```

```ts
import { Elysia } from "elysia";
import { health } from "@openstatus/health-elysia";
import { tinybirdProbe } from "@openstatus/health-tinybird";

new Elysia()
  .use(health({ probes: [tinybirdProbe()] }))
  .listen(3000);
```

`health(options)` returns an Elysia plugin answering `GET` and `HEAD` on
`options.path` (default `/health`). `extend` receives `{ request, path }`.
