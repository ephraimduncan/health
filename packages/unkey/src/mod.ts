import { httpProbe, type Probe, type ProbeOverrides } from "@openstatus/health";

export const unkeyDefaultBaseUrl = "https://api.unkey.com";
export const unkeyDefaultName = "unkey";

export interface UnkeyProbeOptions extends ProbeOverrides {
  readonly baseUrl?: string | URL;
  readonly fetch?: typeof fetch;
}

export function unkeyProbe(options: UnkeyProbeOptions = {}): Probe {
  const baseUrl = new URL(options.baseUrl ?? unkeyDefaultBaseUrl);
  return httpProbe({
    name: options.name ?? unkeyDefaultName,
    url: new URL("/v2/liveness", baseUrl),
    critical: options.critical ?? false,
    timeoutMs: options.timeoutMs,
    skip: options.skip,
    fetch: options.fetch,
  });
}
