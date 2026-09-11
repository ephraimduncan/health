import { Elysia } from "elysia";
import {
  createHealthCheck,
  type HealthEndpointOptions,
  renderHealthResponse,
} from "@openstatus/health";

export interface ElysiaHealthContext {
  readonly request: Request;
  readonly path: string;
}

export type ElysiaHealthOptions = HealthEndpointOptions<ElysiaHealthContext>;

export const defaultPath = "/health";

export function health(options: ElysiaHealthOptions): Elysia {
  const check = createHealthCheck(options);
  const path = options.path ?? defaultPath;
  const app = new Elysia({ name: "@openstatus/health", seed: path });

  const respond = async (
    ctx: ElysiaHealthContext,
    head: boolean,
  ): Promise<Response> => {
    const report = await check.report();
    const extended = options.extend == null
      ? {}
      : await options.extend(report, ctx);
    const rendered = renderHealthResponse(report, options, extended);
    return new Response(head ? null : JSON.stringify(rendered.body), {
      status: rendered.status,
      headers: rendered.headers,
    });
  };

  app.get(path, (ctx) => respond(ctx, false));
  app.head(path, (ctx) => respond(ctx, true));
  return app;
}
