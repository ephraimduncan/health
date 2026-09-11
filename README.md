# @openstatus/health

Tree-shakable health endpoints for JavaScript servers. A dependency-free core
runs *probes* against your dependencies and renders `ok | degraded |
unhealthy`; thin adapters mount it on your framework; thin probe packages know
how to ping one dependency each.

## Packages

| Package | Description |
| ------- | ----------- |
| `@openstatus/health` | Core: probe runner, caching, response rendering, Fetch-API handler |
| `@openstatus/health-hono` | Hono adapter |
| `@openstatus/health-elysia` | Elysia adapter |
| `@openstatus/health-express` | Express adapter |
| `@openstatus/health-next` | Next.js App Router adapter |
| `@openstatus/health-tinybird` | Tinybird reachability probe |
| `@openstatus/health-drizzle` | Drizzle ORM `select 1` probe |
| `@openstatus/health-turso` | Turso / libSQL `select 1` probe |
| `@openstatus/health-supabase` | Supabase connection-pressure probe |
| `@openstatus/health-unkey` | Unkey liveness probe |

## Quick start

See each package README.
