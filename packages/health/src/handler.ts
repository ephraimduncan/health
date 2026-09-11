import { createHealthCheck } from "./check.ts";
import { renderHealthResponse } from "./response.ts";
import type { HealthEndpointOptions } from "./types.ts";

export type HealthHandler<Req extends Request = Request> = (
  request: Req,
) => Promise<Response>;

export function createHealthHandler<Req extends Request = Request>(
  options: HealthEndpointOptions<Req>,
): HealthHandler<Req> {
  const check = createHealthCheck(options);
  return async (request: Req): Promise<Response> => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, {
        status: 405,
        headers: { allow: "GET, HEAD" },
      });
    }
    const report = await check.report();
    const extended = options.extend == null
      ? {}
      : await options.extend(report, request);
    const rendered = renderHealthResponse(report, options, extended);
    return new Response(
      request.method === "HEAD" ? null : JSON.stringify(rendered.body),
      { status: rendered.status, headers: rendered.headers },
    );
  };
}
