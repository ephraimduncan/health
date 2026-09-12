import { ProbeConfigError } from "./errors.ts";
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

export interface ProbeUrlOptions {
  readonly probe: string;
  readonly field: string;
  readonly value: string | URL | undefined;
  readonly path?: string;
}

export function probeUrl(options: ProbeUrlOptions): URL {
  const { probe, field, value, path } = options;
  if (value == null || value === "") {
    throw new ProbeConfigError(
      probe,
      field,
      `must be an absolute URL, got ${value === "" ? '""' : String(value)}`,
    );
  }
  let base: URL;
  try {
    base = new URL(value);
  } catch {
    throw new ProbeConfigError(
      probe,
      field,
      `must be an absolute URL, got ${JSON.stringify(String(value))}`,
    );
  }
  return path == null ? base : new URL(path, base);
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
  const url = probeUrl({
    probe: `httpProbe(${JSON.stringify(options.name)})`,
    field: "url",
    value: options.url,
  });
  return {
    name: options.name,
    critical: options.critical,
    timeoutMs: options.timeoutMs,
    skip: options.skip,
    run: (signal) =>
      expectOk(
        doFetch(url, {
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
