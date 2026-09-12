import {
  httpProbe,
  type Probe,
  type ProbeOverrides,
  probeUrl,
} from "@openstatus/health";

export const unkeyDefaultBaseUrl = "https://api.unkey.com";
export const unkeyDefaultName = "unkey";

export interface UnkeyProbeOptions extends ProbeOverrides {
  readonly baseUrl?: string | URL;
  readonly fetch?: typeof fetch;
}

export function unkeyProbe(options: UnkeyProbeOptions = {}): Probe {
  return httpProbe({
    name: options.name ?? unkeyDefaultName,
    url: probeUrl({
      probe: "unkeyProbe",
      field: "baseUrl",
      value: options.baseUrl ?? unkeyDefaultBaseUrl,
      path: "/v2/liveness",
    }),
    critical: options.critical ?? false,
    timeoutMs: options.timeoutMs,
    skip: options.skip,
    fetch: options.fetch,
  });
}
