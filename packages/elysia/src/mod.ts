import type { Context, RouteSchema, SingletonBase } from "elysia";
import { Elysia } from "elysia";
import {
  createHealthResponder,
  type HealthHandlerOptions,
  type HealthRouteOptions,
} from "@openstatus/health";

export type ElysiaBlankSingleton = {
  decorator: Record<never, never>;
  store: Record<never, never>;
  derive: Record<never, never>;
  resolve: Record<never, never>;
};

export type ElysiaHealthContext<
  S extends SingletonBase = ElysiaBlankSingleton,
> = Context<RouteSchema, S>;

export type ElysiaHealthOptions = HealthRouteOptions<ElysiaHealthContext>;

export type ElysiaHealthHandlerOptions<
  S extends SingletonBase = ElysiaBlankSingleton,
> = HealthHandlerOptions<ElysiaHealthContext<S>>;

export type ElysiaHealthHandler<
  S extends SingletonBase = ElysiaBlankSingleton,
> = (ctx: ElysiaHealthContext<S>) => Promise<Response>;

export const defaultPath = "/health";

export function healthHandler<S extends SingletonBase = ElysiaBlankSingleton>(
  options: ElysiaHealthHandlerOptions<S>,
): ElysiaHealthHandler<S> {
  const responder = createHealthResponder<ElysiaHealthContext<S>>(options);
  return (ctx: ElysiaHealthContext<S>): Promise<Response> =>
    responder.toResponse(ctx, ctx.request.method);
}

export function healthRoute(options: ElysiaHealthOptions): Elysia {
  const handler = healthHandler(options);
  const path = options.path ?? defaultPath;
  return new Elysia({ name: "@openstatus/health", seed: path })
    .get(path, handler)
    .head(path, handler);
}
