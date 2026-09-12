import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import express from "express";
import { DuplicateProbeError, type Probe } from "@openstatus/health";
import {
  type ExpressHealthOptions,
  healthHandler,
  healthRoute,
} from "./mod.ts";

const ok: Probe = { name: "a", run: () => {} };
const bad: Probe = {
  name: "b",
  critical: true,
  run: () => {
    throw new Error("x");
  },
};

async function withServer(
  options: ExpressHealthOptions,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const app = express();
  app.use(healthRoute(options));
  const server: Server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address == null || typeof address === "string") {
    throw new Error("server has no TCP address");
  }
  const port = address.port;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve()))
    );
  }
}

test("healthRoute() serves GET /health", async () => {
  await withServer({ probes: [ok] }, async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "no-store");
    const body = await res.json();
    assert.equal(body.status, "ok");
    assert.equal(body.checks[0].name, "a");
  });
});

test("healthRoute() serves HEAD without a body", async () => {
  await withServer({ probes: [bad] }, async (base) => {
    const res = await fetch(`${base}/health`, { method: "HEAD" });
    assert.equal(res.status, 503);
    assert.equal(await res.text(), "");
  });
});

test("healthRoute() honours a custom path", async () => {
  await withServer({ probes: [ok], path: "/_status" }, async (base) => {
    assert.equal((await fetch(`${base}/_status`)).status, 200);
    const missing = await fetch(`${base}/health`);
    assert.equal(missing.status, 404);
    await missing.body?.cancel();
  });
});

test("healthRoute() honours status code overrides", async () => {
  await withServer(
    { probes: [bad], unhealthyStatusCode: 200 },
    async (base) => {
      const res = await fetch(`${base}/health`);
      assert.equal(res.status, 200);
      assert.equal((await res.json()).status, "unhealthy");
    },
  );
});

test("healthRoute() passes the request to extend", async () => {
  const options: ExpressHealthOptions = {
    probes: [ok],
    extend: (_report, req) => ({ requestId: String(req.get("x-request-id")) }),
  };
  await withServer(options, async (base) => {
    const res = await fetch(`${base}/health`, {
      headers: { "x-request-id": "r1" },
    });
    assert.equal((await res.json()).requestId, "r1");
  });
});

test("healthRoute() rejects duplicate probe names at construction", () => {
  assert.throws(() => healthRoute({ probes: [ok, ok] }), DuplicateProbeError);
});

test("healthHandler() mounts on a plain route and sees the full request", async () => {
  const app = express();
  app.get(
    "/health",
    healthHandler({
      probes: [ok],
      extend: (_report, req) => ({ ip: req.ip, host: req.hostname }),
    }),
  );
  const server: Server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address == null || typeof address === "string") {
    throw new Error("server has no TCP address");
  }
  try {
    const res = await fetch(`http://127.0.0.1:${address.port}/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.ip, "127.0.0.1");
    assert.equal(body.host, "127.0.0.1");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve()))
    );
  }
});
