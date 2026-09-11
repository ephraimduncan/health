# @openstatus/health-turso

Database probe for [Turso](https://turso.tech/) / libSQL for
[`@openstatus/health`](https://jsr.io/@openstatus/health). Runs `select 1`
against your `@libsql/client` `Client`. Critical by default.

```sh
deno add jsr:@openstatus/health jsr:@openstatus/health-turso
npm install @openstatus/health @openstatus/health-turso
```

```ts
import { createClient } from "@libsql/client";
import { createHealthHandler } from "@openstatus/health";
import { tursoProbe } from "@openstatus/health-turso";

const client = createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN });

Deno.serve(
  createHealthHandler({ probes: [tursoProbe({ client })] }),
);
```

A `select 1` never exhausts a pool or touches a table — just proves the
connection is alive. The client is typed structurally as
`{ execute(sql: string): Promise<unknown> }`, so `@libsql/client` is only a
peer dependency for its types; the probe adds no runtime import of it.

```ts
tursoProbe({
  client,
  name: "turso-primary",
  timeoutMs: 3000,
  skip: () => env.TURSO_NOOP === "true",
});
```

Critical by default — a dead database takes the service out of rotation.
Override `critical: false` for read replicas.