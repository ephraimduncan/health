import { createHealthCheck } from "./check.ts";
import { renderHealthResponse } from "./response.ts";
import type { HealthEndpointOptions } from "./types.ts";

export type HealthHandler = (request: Request) => Promise<Response>;

export function createHealthHandler(
  options: HealthEndpointOptions<Request>,
): HealthHandler {
  const check = createHealthCheck(options);
  return async (request: Request): Promise<Response> => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, {
        status: 405,
        headers: { allow: "GET, HEAD" },
      });
    }
    const report = await check.report();
    const extra = options.extend == null
      ? {}
      : await options.extend(report, request);
    const rendered = renderHealthResponse(report, options, extra);
    return new Response(
      request.method === "HEAD" ? null : JSON.stringify(rendered.body),
      { status: rendered.status, headers: rendered.headers },
    );
  };
}
