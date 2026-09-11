import type { Probe, ProbeOverrides } from "./types.ts";

export async function expectOk(
  response: Response | Promise<Response>,
  expectStatus?: number,
): Promise<Response> {
  const res = await response;
  const ok = expectStatus == null ? res.ok : res.status === expectStatus;
  await res.body?.cancel();
  if (!ok) throw new Error(`unexpected status ${res.status}`);
  return res;
}

export interface HttpProbeOptions extends ProbeOverrides {
  readonly name: string;
  readonly url: string | URL;
  readonly method?: "GET" | "HEAD";
  readonly headers?: HeadersInit;
  readonly expectStatus?: number;
  readonly fetch?: typeof fetch;
}

export function httpProbe(options: HttpProbeOptions): Probe {
  const doFetch = options.fetch ?? globalThis.fetch;
  return {
    name: options.name,
    critical: options.critical,
    timeoutMs: options.timeoutMs,
    skip: options.skip,
    run: (signal) =>
      expectOk(
        doFetch(options.url, {
          method: options.method ?? "GET",
          headers: options.headers,
          signal,
        }),
        options.expectStatus,
      ),
  };
}

export function probe(options: Probe): Probe {
  return options;
}
