import assert from "node:assert/strict";
import test from "node:test";
import { renderHealthResponse, statusCodeFor } from "./response.ts";
import type { HealthReport } from "./types.ts";

const report = (status: HealthReport["status"]): HealthReport => ({
  status,
  checkedAt: "2026-09-11T00:00:00.000Z",
  latencyMs: 12,
  checks: [{ name: "db", status: "ok", critical: true, latencyMs: 3 }],
});

test("statusCodeFor() maps statuses to defaults", () => {
  assert.equal(statusCodeFor(report("ok"), { probes: [] }), 200);
  assert.equal(statusCodeFor(report("degraded"), { probes: [] }), 200);
  assert.equal(statusCodeFor(report("unhealthy"), { probes: [] }), 503);
});

test("statusCodeFor() honours overrides", () => {
  const options = {
    probes: [],
    unhealthyStatusCode: 200,
    degradedStatusCode: 299,
  };
  assert.equal(statusCodeFor(report("unhealthy"), options), 200);
  assert.equal(statusCodeFor(report("degraded"), options), 299);
});

test("renderHealthResponse() exposes checks by default", () => {
  const res = renderHealthResponse(report("ok"), { probes: [] });
  assert.equal(res.status, 200);
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(res.headers["content-type"], "application/json; charset=utf-8");
  assert.deepEqual(res.body, {
    status: "ok",
    checkedAt: "2026-09-11T00:00:00.000Z",
    latencyMs: 12,
    checks: [{ name: "db", status: "ok", critical: true, latencyMs: 3 }],
  });
});

test("renderHealthResponse() hides checks and latency when exposeChecks is false", () => {
  const res = renderHealthResponse(report("degraded"), {
    probes: [],
    exposeChecks: false,
  });
  assert.deepEqual(res.body, {
    status: "degraded",
    checkedAt: "2026-09-11T00:00:00.000Z",
  });
});

test("renderHealthResponse() merges extra fields without overriding the report", () => {
  const res = renderHealthResponse(report("ok"), {
    probes: [],
    exposeChecks: false,
  }, {
    region: "fra",
    status: "hacked",
  });
  assert.deepEqual(res.body, {
    region: "fra",
    status: "ok",
    checkedAt: "2026-09-11T00:00:00.000Z",
  });
});
