# @openstatus/health-turso-serverless

Database probe for the
[Turso serverless driver](https://www.npmjs.com/package/@tursodatabase/serverless)
for [`@openstatus/health`](https://jsr.io/@openstatus/health). Runs `select 1`
against the `Connection` returned by `connect()`. Critical by default.

```sh
deno add jsr:@openstatus/health jsr:@openstatus/health-turso-serverless
npm install @openstatus/health @openstatus/health-turso-serverless
```

```ts
import { connect } from "@tursodatabase/serverless";
import { createHealthHandler } from "@openstatus/health";
import { tursoServerlessProbe } from "@openstatus/health-turso-serverless";

const connection = connect({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

Deno.serve(
  createHealthHandler({ probes: [tursoServerlessProbe({ connection })] }),
);
```

The driver talks to Turso Cloud over `fetch()` only, so this probe works on
Workers, Vercel Edge and any other edge runtime.

A `select 1` never exhausts a pool or touches a table — just proves the
connection is alive. The connection is typed structurally as
`{ get(sql: string): Promise<ProbeResult> }`, so `@tursodatabase/serverless` is
only a peer dependency for its types; the probe adds no runtime import of it.

```ts
tursoServerlessProbe({
  connection,
  name: "turso-primary",
  timeoutMs: 3000,
  skip: () => env.TURSO_NOOP === "true",
});
```

`timeoutMs` fails the check but cannot cancel the driver's in-flight request.
Pass `defaultQueryTimeout` to `connect()` if you also want the query itself
interrupted.

Critical by default — a dead database takes the service out of rotation.
Override `critical: false` for read replicas.

Using the driver's libSQL compatibility layer
(`@tursodatabase/serverless/compat`) instead? Its client exposes `execute()`,
so use [`@openstatus/health-turso`](../turso) with `tursoProbe({ client })`.
