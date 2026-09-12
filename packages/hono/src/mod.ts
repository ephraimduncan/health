import type { Context, Handler } from "hono";
import { Hono } from "hono";
import {
  createHealthCheck,
  type HealthHandlerOptions,
  type HealthRouteOptions,
  renderHealthResponse,
} from "@openstatus/health";

export type HonoHealthOptions = HealthRouteOptions<Context>;

export type HonoHealthHandlerOptions = HealthHandlerOptions<Context>;

export const defaultPath = "/health";

export function healthHandler(options: HonoHealthHandlerOptions): Handler {
  const check = createHealthCheck(options);
  return async (c: Context): Promise<Response> => {
    const report = await check.report();
    const extended = options.extend == null
      ? {}
      : await options.extend(report, c);
    const rendered = renderHealthResponse(report, options, extended);
    return new Response(
      c.req.method === "HEAD" ? null : JSON.stringify(rendered.body),
      { status: rendered.status, headers: rendered.headers },
    );
  };
}

export function healthRoute(options: HonoHealthOptions): Hono {
  const handler = healthHandler(options);
  const path = options.path ?? defaultPath;
  const app = new Hono({ strict: false });
  for (const p of routePaths(path)) {
    app.on(["GET", "HEAD"], p, handler);
  }
  return app;
}

function routePaths(path: string): string[] {
  if (path === "/" || path.endsWith("/")) return [path];
  return [path, `${path}/`];
}
