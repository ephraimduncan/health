# @openstatus/health-express

Express adapter for [`@openstatus/health`](https://jsr.io/@openstatus/health).
Works with Express 4 and 5.

```sh
npm install @openstatus/health @openstatus/health-express
```

```ts
import express from "express";
import { healthRoute } from "@openstatus/health-express";
import { unkeyProbe } from "@openstatus/health-unkey";

const app = express();
app.use(healthRoute({ probes: [unkeyProbe()] }));
```

`healthRoute(options)` returns an `express.Router` answering `GET` and `HEAD`
on `options.path` (default `/health`). `healthHandler(options)` is the
`RequestHandler` underneath, for a route of your own:

```ts
import { healthHandler } from "@openstatus/health-express";

app.get("/health", requireInternalNetwork, healthHandler({ probes }));
```

`extend` receives the full Express `Request` — `req.ip`, `req.query`,
`req.get()` and anything middleware attached. Probe failures never reject the
request; unexpected errors are forwarded to `next(err)`. Methods other than
`GET` and `HEAD` fall through to Express's default `404`.
