import type { JsonValue, Probe } from "./types.ts";

export interface FetchCall {
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  readonly signal?: AbortSignal;
}

export interface FakeFetchOptions {
  readonly status?: number;
  readonly body?: JsonValue;
  readonly onFetch?: (call: FetchCall) => void;
}

export function fakeFetch(options: FakeFetchOptions = {}): typeof fetch {
  return (input, init) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const call: FetchCall = {
      url,
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      signal: init?.signal ?? undefined,
    };
    options.onFetch?.(call);
    return Promise.resolve(
      new Response(
        options.body == null ? null : JSON.stringify(options.body),
        { status: options.status ?? 200 },
      ),
    );
  };
}

export function hangFetch(track?: { aborted: boolean }): typeof fetch {
  return (_input, init) => {
    if (track != null && init?.signal != null) {
      init.signal.addEventListener("abort", () => {
        track.aborted = true;
      }, { once: true });
    }
    return new Promise<Response>(() => {});
  };
}

export function okProbe(name: string, critical = false): Probe {
  return { name, critical, run: () => {} };
}

export function failingProbe(
  name: string,
  critical = false,
  error: Error = new Error(`${name} failed`),
): Probe {
  return {
    name,
    critical,
    run: () => {
      throw error;
    },
  };
}

export function hangingProbe(
  name: string,
  critical = false,
  timeoutMs?: number,
): Probe {
  return {
    name,
    critical,
    timeoutMs,
    run: (signal) =>
      new Promise<void>((_, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      }),
  };
}
