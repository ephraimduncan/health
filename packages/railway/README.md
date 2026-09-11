# @openstatus/health-railway

Railway server metadata for
[`@openstatus/health`](https://jsr.io/@openstatus/health). Renders the region,
replica, environment and deployment that produced the response under a `server`
key.

```sh
deno add jsr:@openstatus/health jsr:@openstatus/health-railway
npm install @openstatus/health @openstatus/health-railway
```

```ts
import express from "express";
import { healthRouter } from "@openstatus/health-express";
import { railwayExtend } from "@openstatus/health-railway";

const app = express();
app.use(healthRouter({ probes: [/* ... */], extend: railwayExtend() }));
```

Railway is the only platform in this family that populates all six canonical
fields:

```json
{
  "status": "ok",
  "checkedAt": "2026-09-11T12:00:00.000Z",
  "server": {
    "platform": "railway",
    "region": "us-west2",
    "instanceId": "9f2c1d0e-5a3b",
    "service": "api",
    "version": "d6ab8f11-77e2",
    "environment": "production",
    "project": "openstatus",
    "commitSha": "d0beb8f5c55b36df7d674d55965a23b8d54ad69b"
  }
}
```

## Fields

| Field | Environment variable |
| ----- | -------------------- |
| `region` | `RAILWAY_REPLICA_REGION` |
| `instanceId` | `RAILWAY_REPLICA_ID` |
| `service` | `RAILWAY_SERVICE_NAME` |
| `version` | `RAILWAY_DEPLOYMENT_ID` |
| `environment` | `RAILWAY_ENVIRONMENT_NAME` |
| `project` | `RAILWAY_PROJECT_NAME` |
| `commitSha` | `RAILWAY_GIT_COMMIT_SHA` |

`version` is the deployment, not the commit. Both are rendered because they
answer different questions: `version` tells you whether this replica has picked
up the latest deploy, `commitSha` tells you which code that deploy contains.
`RAILWAY_PUBLIC_DOMAIN` is left out — it is topology, not health.

## Off Railway

`railwayServer()` returns `undefined` when both `RAILWAY_REPLICA_ID` and
`RAILWAY_SERVICE_NAME` are missing, and `railwayExtend()` then renders no
`server` key.

Because `environment` comes straight from Railway, a staging replica answering
a production health check is visible in the body rather than inferred from the
hostname.

## Composing

```ts
extend: (_report, req) => ({
  server: railwayServer(),
  requestId: req.get("x-request-id"),
}),
```

Both functions accept `{ env }` to read from a record you supply instead of the
process environment.

## Public endpoints

`extend` output renders even when `exposeChecks` is `false`. Serve two
endpoints rather than exposing the replica id to anonymous callers:

```ts
app.use(healthRouter({ probes, exposeChecks: false }));
app.use(healthRouter({
  probes,
  path: "/internal/health",
  extend: railwayExtend(),
}));
```
