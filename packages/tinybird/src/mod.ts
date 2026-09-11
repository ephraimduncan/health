import { httpProbe, type Probe, type ProbeOverrides } from "@openstatus/health";

export const tinybirdDefaultBaseUrl = "https://api.tinybird.co";
export const tinybirdDefaultName = "tinybird";

export interface TinybirdProbeOptions extends ProbeOverrides {
  readonly baseUrl?: string | URL;
  readonly fetch?: typeof fetch;
}

export function tinybirdProbe(options: TinybirdProbeOptions = {}): Probe {
  const baseUrl = new URL(options.baseUrl ?? tinybirdDefaultBaseUrl);
  return httpProbe({
    name: options.name ?? tinybirdDefaultName,
    url: new URL("/v0/health", baseUrl),
    critical: options.critical ?? false,
    timeoutMs: options.timeoutMs,
    skip: options.skip,
    fetch: options.fetch,
  });
}
