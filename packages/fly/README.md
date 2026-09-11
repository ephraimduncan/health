# @openstatus/health-fly

Fly.io server metadata for
[`@openstatus/health`](https://jsr.io/@openstatus/health). Renders the region,
machine and deployment that produced the response under a `server` key.

```sh
deno add jsr:@openstatus/health jsr:@openstatus/health-fly
npm install @openstatus/health @openstatus/health-fly
```

```ts
import { Hono } from "hono";
import { healthRoute } from "@openstatus/health-hono";
import { flyExtend } from "@openstatus/health-fly";
import { tursoProbe } from "@openstatus/health-turso";

const app = new Hono();

app.route("/", healthRoute({
  probes: [tursoProbe({ client })],
  extend: flyExtend(),
}));
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
    "primaryRegion": "cdg",
    "processGroup": "app",
    "machineVersion": "01H9RKA2WPYNA",
    "memoryMb": 256
  }
}
```

With more than one machine behind one hostname, a health body without an
instance identity answers "is *something* up", not "is *this replica* up".
`region` against `primaryRegion` is the pair worth watching: a replica serving
from `ams` while `PRIMARY_REGION` is `cdg` is a fact you want in the response,
not in a dashboard.

## Fields

| Field | Environment variable |
| ----- | -------------------- |
| `region` | `FLY_REGION` |
| `instanceId` | `FLY_MACHINE_ID`, falling back to `FLY_ALLOC_ID` |
| `service` | `FLY_APP_NAME` |
| `version` | `FLY_IMAGE_REF` — the deployment, not the git sha |
| `primaryRegion` | `PRIMARY_REGION` |
| `processGroup` | `FLY_PROCESS_GROUP` |
| `machineVersion` | `FLY_MACHINE_VERSION` |
| `memoryMb` | `FLY_VM_MEMORY_MB`, as a number |

Values are passed through exactly as Fly sets them. Fields Fly does not set are
absent rather than empty, and `FLY_PUBLIC_IP` / `FLY_PRIVATE_IP` are left out
on purpose — they are topology, not health.

## Off Fly

`flyServer()` returns `undefined` when `FLY_MACHINE_ID` and `FLY_APP_NAME` are
both missing, and `flyExtend()` then renders no `server` key at all. The same
code runs unchanged on your laptop, in CI and on Fly, with no branching — and
nothing pretends to be a machine that does not exist.

Deploying the same build to more than one platform? Chain them; only the
packages you import are bundled:

```ts
import { flyServer } from "@openstatus/health-fly";
import { vercelServer } from "@openstatus/health-vercel";

extend: () => ({ server: flyServer() ?? vercelServer() }),
```

## Composing

`flyExtend()` is sugar for the common case. `flyServer()` returns the object, so
your own fields sit beside it:

```ts
extend: (_report, c) => ({
  server: flyServer(),
  requestId: c.get("requestId"),
}),
```

Both accept `{ env }` to read from a record you supply instead of the process
environment, which is how the tests avoid touching the real one.

## Public endpoints

`extend` output is rendered even when `exposeChecks` is `false`. Region and
machine id are not secrets, but they are not for anonymous callers either —
serve two endpoints rather than one:

```ts
app.route("/", healthRoute({ probes, exposeChecks: false }));
app.route("/", healthRoute({
  probes,
  path: "/internal/health",
  extend: flyExtend(),
}));
```
