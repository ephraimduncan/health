import type { Context } from "hono";
import { Hono } from "hono";
import {
  createHealthCheck,
  type HealthEndpointOptions,
  renderHealthResponse,
} from "@openstatus/health";

export type HonoHealthOptions = HealthEndpointOptions<Context>;

export const defaultPath = "/health";

export function healthRoute(options: HonoHealthOptions): Hono {
  const check = createHealthCheck(options);
  const path = options.path ?? defaultPath;
  const app = new Hono({ strict: false });

  const respond = async (c: Context, head: boolean): Promise<Response> => {
    const report = await check.report();
    const extra = options.extend == null ? {} : await options.extend(report, c);
    const rendered = renderHealthResponse(report, options, extra);
    return new Response(head ? null : JSON.stringify(rendered.body), {
      status: rendered.status,
      headers: rendered.headers,
    });
  };

  for (const p of routePaths(path)) {
    app.get(p, (c) => respond(c, false));
    app.on("HEAD", p, (c) => respond(c, true));
  }
  return app;
}

function routePaths(path: string): string[] {
  if (path === "/" || path.endsWith("/")) return [path];
  return [path, `${path}/`];
}
