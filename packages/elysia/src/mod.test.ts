import assert from "node:assert/strict";
import test from "node:test";
import { Elysia } from "elysia";
import { DuplicateProbeError, type Probe } from "@openstatus/health";
import { health } from "./mod.ts";

const ok: Probe = { name: "a", run: () => {} };
const bad: Probe = {
  name: "b",
  critical: true,
  run: () => {
    throw new Error("x");
  },
};

function request(app: Elysia, path: string, method = "GET"): Promise<Response> {
  return app.handle(new Request(`http://localhost${path}`, { method }));
}

test("health() serves GET /health", async () => {
  const app = new Elysia().use(health({ probes: [ok] }));
  const res = await request(app, "/health");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.equal(body.checks[0].name, "a");
});

test("health() serves HEAD without a body", async () => {
  const app = new Elysia().use(health({ probes: [bad] }));
  const res = await request(app, "/health", "HEAD");
  assert.equal(res.status, 503);
  assert.equal(await res.text(), "");
});

test("health() honours a custom path", async () => {
  const app = new Elysia().use(health({ probes: [ok], path: "/_status" }));
  assert.equal((await request(app, "/_status")).status, 200);
  assert.equal((await request(app, "/health")).status, 404);
});

test("health() honours status code overrides", async () => {
  const app = new Elysia().use(
    health({ probes: [bad], unhealthyStatusCode: 200 }),
  );
  const res = await request(app, "/health");
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, "unhealthy");
});

test("health() passes the context to extend", async () => {
  const app = new Elysia().use(
    health({
      probes: [ok],
      extend: (_report, ctx) => ({
        path: ctx.path,
        requestId: ctx.request.headers.get("x-request-id"),
      }),
    }),
  );
  const res = await app.handle(
    new Request("http://localhost/health", {
      headers: { "x-request-id": "r1" },
    }),
  );
  const body = await res.json();
  assert.equal(body.path, "/health");
  assert.equal(body.requestId, "r1");
});

test("health() rejects duplicate probe names at construction", () => {
  assert.throws(() => health({ probes: [ok, ok] }), DuplicateProbeError);
});
