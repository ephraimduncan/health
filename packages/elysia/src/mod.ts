import type { Context } from "elysia";
import { Elysia } from "elysia";
import {
  createHealthCheck,
  type HealthHandlerOptions,
  type HealthRouteOptions,
  renderHealthResponse,
} from "@openstatus/health";

export type ElysiaHealthOptions = HealthRouteOptions<Context>;

export type ElysiaHealthHandlerOptions = HealthHandlerOptions<Context>;

export type ElysiaHealthHandler = (ctx: Context) => Promise<Response>;

export const defaultPath = "/health";

export function healthHandler(
  options: ElysiaHealthHandlerOptions,
): ElysiaHealthHandler {
  const check = createHealthCheck(options);
  return async (ctx: Context): Promise<Response> => {
    const report = await check.report();
    const extended = options.extend == null
      ? {}
      : await options.extend(report, ctx);
    const rendered = renderHealthResponse(report, options, extended);
    return new Response(
      ctx.request.method === "HEAD" ? null : JSON.stringify(rendered.body),
      { status: rendered.status, headers: rendered.headers },
    );
  };
}

export function healthRoute(options: ElysiaHealthOptions): Elysia {
  const handler = healthHandler(options);
  const path = options.path ?? defaultPath;
  return new Elysia({ name: "@openstatus/health", seed: path })
    .get(path, handler)
    .head(path, handler);
}
