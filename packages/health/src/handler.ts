import { createHealthCheck } from "./check.ts";
import { renderHealthResponse } from "./response.ts";
import type { HealthRouteOptions } from "./types.ts";

export type HealthHandler<Req extends Request = Request> = (
  request: Req,
) => Promise<Response>;

export type LazyHealthHandler<Req extends Request = Request, Env = never> = (
  request: Req,
  env: Env,
) => Promise<Response>;

export function createHealthHandler<Req extends Request = Request>(
  options: HealthRouteOptions<Req>,
): HealthHandler<Req> {
  const check = createHealthCheck(options);
  const path = options.path;
  return async (request: Req): Promise<Response> => {
    if (path != null && !matchesPath(request.url, path)) {
      return new Response(null, { status: 404 });
    }
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

export function createLazyHealthHandler<
  Req extends Request = Request,
  Env = never,
>(
  build: (env: Env, request: Req) => HealthRouteOptions<Req>,
): LazyHealthHandler<Req, Env> {
  let handler: HealthHandler<Req> | undefined;
  return (request: Req, env: Env): Promise<Response> => {
    handler ??= createHealthHandler(build(env, request));
    return handler(request);
  };
}

function matchesPath(url: string, path: string): boolean {
  const pathname = new URL(url).pathname;
  return trimSlash(pathname) === trimSlash(path);
}

function trimSlash(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}
