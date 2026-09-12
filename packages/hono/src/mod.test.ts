import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { DuplicateProbeError, type Probe } from "@openstatus/health";
import { healthHandler, healthRoute } from "./mod.ts";

const ok: Probe = { name: "a", run: () => {} };
const bad: Probe = {
  name: "b",
  critical: true,
  run: () => {
    throw new Error("x");
  },
};

function app(route: Hono): Hono {
  return new Hono().route("/", route);
}

test("healthRoute() serves GET /health", async () => {
  const res = await app(healthRoute({ probes: [ok] })).request("/health");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.equal(body.checks[0].name, "a");
});

test("healthRoute() matches a trailing slash", async () => {
  const res = await app(healthRoute({ probes: [ok] })).request("/health/");
  assert.equal(res.status, 200);
});

test("healthRoute() serves HEAD without a body", async () => {
  const res = await app(healthRoute({ probes: [bad] })).request("/health", {
    method: "HEAD",
  });
  assert.equal(res.status, 503);
  assert.equal(await res.text(), "");
});

test("healthRoute() honours a custom path", async () => {
  const a = app(healthRoute({ probes: [ok], path: "/_status" }));
  assert.equal((await a.request("/_status")).status, 200);
  assert.equal((await a.request("/health")).status, 404);
});

test("healthRoute() maps unhealthy to 503 by default and honours overrides", async () => {
  assert.equal(
    (await app(healthRoute({ probes: [bad] })).request("/health")).status,
    503,
  );
  const res = await app(
    healthRoute({ probes: [bad], unhealthyStatusCode: 200 }),
  ).request(
    "/health",
  );
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, "unhealthy");
});

test("healthRoute() passes the Hono context to extend", async () => {
  const route = healthRoute({
    probes: [ok],
    extend: (_report, c) => ({ requestId: c.req.header("x-request-id") }),
  });
  const res = await app(route).request("/health", {
    headers: { "x-request-id": "r1" },
  });
  assert.equal((await res.json()).requestId, "r1");
});

test("healthRoute() rejects duplicate probe names at construction", () => {
  assert.throws(() => healthRoute({ probes: [ok, ok] }), DuplicateProbeError);
});

test("healthHandler() mounts on a plain route and answers GET and HEAD", async () => {
  const a = new Hono().on(
    ["GET", "HEAD"],
    "/health",
    healthHandler({
      probes: [ok],
      extend: (_report, c) => ({ requestId: c.req.header("x-request-id") }),
    }),
  );
  const res = await a.request("/health", { headers: { "x-request-id": "r1" } });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).requestId, "r1");
  const head = await a.request("/health", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});
