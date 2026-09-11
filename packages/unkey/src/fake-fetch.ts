import type { JsonValue } from "@openstatus/health";

export interface FetchCall {
  readonly url: string;
  readonly method: string;
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
