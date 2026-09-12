import {
  httpProbe,
  type Probe,
  type ProbeOverrides,
  probeUrl,
} from "@openstatus/health";

export const tinybirdDefaultBaseUrl = "https://api.tinybird.co";
export const tinybirdDefaultName = "tinybird";

export interface TinybirdProbeOptions extends ProbeOverrides {
  readonly baseUrl?: string | URL;
  readonly fetch?: typeof fetch;
}

export function tinybirdProbe(options: TinybirdProbeOptions = {}): Probe {
  return httpProbe({
    name: options.name ?? tinybirdDefaultName,
    url: probeUrl({
      probe: "tinybirdProbe",
      field: "baseUrl",
      value: options.baseUrl ?? tinybirdDefaultBaseUrl,
      path: "/v0/health",
    }),
    critical: options.critical ?? false,
    timeoutMs: options.timeoutMs,
    skip: options.skip,
    fetch: options.fetch,
  });
}
