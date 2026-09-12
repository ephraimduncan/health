import assert from "node:assert/strict";
import test from "node:test";
import { createHealthHandler, createLazyHealthHandler } from "./handler.ts";
import type { Probe } from "./types.ts";

const ok: Probe = { name: "a", run: () => {} };
const bad: Probe = {
  name: "b",
  critical: true,
  run: () => {
    throw new Error("x");
  },
};

test("createHealthHandler() answers GET with a JSON report", async () => {
  const handler = createHealthHandler({ probes: [ok] });
  const res = await handler(new Request("http://localhost/health"));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.equal(body.checks[0].name, "a");
});

test("createHealthHandler() answers HEAD without a body", async () => {
  const handler = createHealthHandler({ probes: [bad] });
  const res = await handler(
    new Request("http://localhost/health", { method: "HEAD" }),
  );
  assert.equal(res.status, 503);
  assert.equal(await res.text(), "");
});

test("createHealthHandler() rejects other methods with 405", async () => {
  const handler = createHealthHandler({ probes: [ok] });
  const res = await handler(
    new Request("http://localhost/health", { method: "POST" }),
  );
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("allow"), "GET, HEAD");
});

test("createHealthHandler() passes the request to extend", async () => {
  const handler = createHealthHandler({
    probes: [ok],
    extend: (report, request) => ({
      requestId: request.headers.get("x-request-id"),
      count: report.checks.length,
    }),
  });
  const res = await handler(
    new Request("http://localhost/health", {
      headers: { "x-request-id": "r1" },
    }),
  );
  const body = await res.json();
  assert.equal(body.requestId, "r1");
  assert.equal(body.count, 1);
});

test("createHealthHandler() awaits an async extend", async () => {
  const handler = createHealthHandler({
    probes: [ok],
    extend: () => Promise.resolve({ region: "fra" }),
  });
  const body = await (await handler(new Request("http://localhost/health")))
    .json();
  assert.equal(body.region, "fra");
});

test("createHealthHandler() answers every path unless path is set", async () => {
  const anywhere = createHealthHandler({ probes: [ok] });
  assert.equal((await anywhere(new Request("http://localhost/x"))).status, 200);
  const scoped = createHealthHandler({ probes: [ok], path: "/health" });
  assert.equal((await scoped(new Request("http://localhost/x"))).status, 404);
  assert.equal(
    (await scoped(new Request("http://localhost/health"))).status,
    200,
  );
  assert.equal(
    (await scoped(new Request("http://localhost/health/"))).status,
    200,
  );
});

test("createLazyHealthHandler() builds once from the first request's env", async () => {
  let builds = 0;
  const handler = createLazyHealthHandler<Request, { name: string }>(
    (env) => {
      builds++;
      return { probes: [{ name: env.name, run: () => {} }] };
    },
  );
  const first = await handler(new Request("http://localhost/"), { name: "a" });
  const second = await handler(new Request("http://localhost/"), {
    name: "b",
  });
  assert.equal(builds, 1);
  assert.equal((await first.json()).checks[0].name, "a");
  assert.equal((await second.json()).checks[0].name, "a");
});
