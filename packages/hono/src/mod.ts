import type { Context, Env, Handler } from "hono";
import { Hono } from "hono";
import {
  createHealthResponder,
  type HealthHandlerOptions,
  type HealthRouteOptions,
} from "@openstatus/health";

export type LooseEnv = {
  readonly Bindings: Record<string, unknown>;
  readonly Variables: Record<string, unknown>;
};

export type HonoHealthOptions<E extends Env = LooseEnv> = HealthRouteOptions<
  Context<E>
>;

export type HonoHealthHandlerOptions<E extends Env = LooseEnv> =
  HealthHandlerOptions<Context<E>>;

export const defaultPath = "/health";

export function healthHandler<E extends Env = LooseEnv>(
  options: HonoHealthHandlerOptions<E>,
): Handler<E> {
  const responder = createHealthResponder<Context<E>>(options);
  return (c: Context<E>): Promise<Response> =>
    responder.toResponse(c, c.req.method);
}

export function healthRoute<E extends Env = LooseEnv>(
  options: HonoHealthOptions<E>,
): Hono<E> {
  const handler = healthHandler<E>(options);
  const path = options.path ?? defaultPath;
  const app = new Hono<E>({ strict: false });
  for (const p of routePaths(path)) {
    app.on(["GET", "HEAD"], p, handler);
  }
  return app;
}

function routePaths(path: string): string[] {
  if (path === "/" || path.endsWith("/")) return [path];
  return [path, `${path}/`];
}
