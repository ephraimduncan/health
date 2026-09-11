import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { createHealthCheck } from "./check.ts";
import { DuplicateProbeError } from "./errors.ts";
import type { Probe } from "./types.ts";

function counting(
  name: string,
  fail = false,
): { probe: Probe; calls: () => number } {
  let calls = 0;
  return {
    probe: {
      name,
      run: async () => {
        calls++;
        await delay(5);
        if (fail) throw new Error("boom");
      },
    },
    calls: () => calls,
  };
}

test("createHealthCheck() rejects duplicate probe names", () => {
  assert.throws(
    () =>
      createHealthCheck({
        probes: [{ name: "a", run: () => {} }, { name: "a", run: () => {} }],
      }),
    DuplicateProbeError,
  );
});

test("createHealthCheck() caches reports within cacheMs", async () => {
  const { probe, calls } = counting("a");
  const check = createHealthCheck({ probes: [probe], cacheMs: 1000 });
  const first = await check.report();
  const second = await check.report();
  assert.equal(calls(), 1);
  assert.equal(first, second);
});

test("createHealthCheck() re-runs after cacheMs elapsed", async () => {
  const { probe, calls } = counting("a");
  const check = createHealthCheck({ probes: [probe], cacheMs: 20 });
  await check.report();
  await delay(30);
  await check.report();
  assert.equal(calls(), 2);
});

test("createHealthCheck() shares one in-flight round", async () => {
  const { probe, calls } = counting("a");
  const check = createHealthCheck({ probes: [probe], cacheMs: 0 });
  const [a, b, c] = await Promise.all([
    check.report(),
    check.report(),
    check.report(),
  ]);
  assert.equal(calls(), 1);
  assert.equal(a, b);
  assert.equal(b, c);
});

test("createHealthCheck() with cacheMs 0 runs on every request", async () => {
  const { probe, calls } = counting("a");
  const check = createHealthCheck({ probes: [probe], cacheMs: 0 });
  await check.report();
  await check.report();
  assert.equal(calls(), 2);
});

test("createHealthCheck() caches failed reports for the same TTL", async () => {
  const { probe, calls } = counting("a", true);
  const check = createHealthCheck({ probes: [probe], cacheMs: 1000 });
  const report = await check.report();
  assert.equal(report.status, "degraded");
  await check.report();
  assert.equal(calls(), 1);
});

test("createHealthCheck().invalidate() drops the cache", async () => {
  const { probe, calls } = counting("a");
  const check = createHealthCheck({ probes: [probe], cacheMs: 1000 });
  await check.report();
  check.invalidate();
  await check.report();
  assert.equal(calls(), 2);
});

test("createHealthCheck() forwards timeoutMs and formatError", async () => {
  const check = createHealthCheck({
    probes: [{
      name: "a",
      run: (signal) =>
        new Promise<void>((_, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason));
        }),
    }],
    timeoutMs: 10,
    formatError: (e) => e.name,
  });
  const report = await check.report();
  assert.equal(report.checks[0].status, "timeout");
  assert.equal(report.checks[0].error, "ProbeTimeoutError");
});
