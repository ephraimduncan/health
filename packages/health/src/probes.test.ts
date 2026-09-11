import assert from "node:assert/strict";
import test from "node:test";
import { expectOk, httpProbe, probe } from "./probes.ts";
import { runProbes } from "./run.ts";

interface Call {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

function fakeFetch(status: number): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const impl: typeof fetch = (input, init) => {
    calls.push({ url: String(input), init });
    return Promise.resolve(new Response("body", { status }));
  };
  return { fetch: impl, calls };
}

test("expectOk() resolves on 2xx", async () => {
  const res = await expectOk(new Response(null, { status: 204 }));
  assert.equal(res.status, 204);
});

test("expectOk() rejects on non-2xx", async () => {
  await assert.rejects(
    expectOk(Promise.resolve(new Response(null, { status: 500 }))),
    /unexpected status 500/,
  );
});

test("expectOk() honours expectStatus", async () => {
  await expectOk(new Response(null, { status: 404 }), 404);
  await assert.rejects(expectOk(new Response(null, { status: 200 }), 404));
});

test("httpProbe() fetches the url with method, headers and signal", async () => {
  const { fetch, calls } = fakeFetch(200);
  const report = await runProbes([
    httpProbe({
      name: "svc",
      url: "https://example.com/health",
      method: "HEAD",
      headers: { authorization: "Bearer x" },
      fetch,
    }),
  ]);
  assert.equal(report.checks[0].status, "ok");
  assert.equal(calls[0].url, "https://example.com/health");
  assert.equal(calls[0].init?.method, "HEAD");
  assert.ok(calls[0].init?.signal instanceof AbortSignal);
  assert.deepEqual(calls[0].init?.headers, { authorization: "Bearer x" });
});

test("httpProbe() fails on non-2xx", async () => {
  const { fetch } = fakeFetch(503);
  const report = await runProbes([
    httpProbe({ name: "svc", url: "https://x", fetch }),
  ]);
  assert.equal(report.checks[0].status, "failed");
});

test("httpProbe() honours overrides", async () => {
  const { fetch, calls } = fakeFetch(200);
  const p = httpProbe({
    name: "svc",
    url: "https://x",
    critical: true,
    timeoutMs: 123,
    skip: () => true,
    fetch,
  });
  assert.equal(p.critical, true);
  assert.equal(p.timeoutMs, 123);
  const report = await runProbes([p]);
  assert.equal(report.checks[0].status, "skipped");
  assert.equal(calls.length, 0);
});

test("probe() returns its argument", () => {
  const p = { name: "a", run: () => {} };
  assert.equal(probe(p), p);
});
