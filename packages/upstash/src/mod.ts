import { expectOk, type Probe, type ProbeOverrides } from "@openstatus/health";

export const upstashDefaultName = "redis";

export interface UpstashProbeOptions extends ProbeOverrides {
  readonly url: string | URL;
  readonly token: string;
  readonly fetch?: typeof fetch;
}

export function upstashProbe(options: UpstashProbeOptions): Probe {
  const doFetch = options.fetch ?? globalThis.fetch;
  const url = new URL("/ping", options.url);
  const headers = { authorization: `Bearer ${options.token}` };
  return {
    name: options.name ?? upstashDefaultName,
    critical: options.critical ?? false,
    timeoutMs: options.timeoutMs,
    skip: options.skip,
    run: (signal) => expectOk(doFetch(url, { method: "GET", headers, signal })),
  };
}
