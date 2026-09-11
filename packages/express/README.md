# @openstatus/health-express

Express adapter for [`@openstatus/health`](https://jsr.io/@openstatus/health).
Works with Express 4 and 5.

```sh
npm install @openstatus/health @openstatus/health-express
```

```ts
import express from "express";
import { healthRouter } from "@openstatus/health-express";
import { unkeyProbe } from "@openstatus/health-unkey";

const app = express();
app.use(healthRouter({ probes: [unkeyProbe()] }));
```

`healthRouter(options)` returns an `express.Router` answering `GET` and `HEAD`
on `options.path` (default `/health`). `extend` receives the Express request.
Probe failures never reject the request; unexpected errors are forwarded to
`next(err)`.
