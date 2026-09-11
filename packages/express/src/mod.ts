import express from "express";
import type { Router } from "express";
import {
  createHealthCheck,
  type HealthEndpointOptions,
  renderHealthResponse,
} from "@openstatus/health";

export interface ExpressHealthRequest {
  readonly method: string;
  readonly url: string;
  readonly originalUrl?: string;
  readonly path?: string;
  readonly headers: Record<string, string | string[] | undefined>;
  get(name: string): string | string[] | undefined;
}

export interface ExpressHealthResponse {
  status(code: number): this;
  set(headers: Record<string, string>): this;
  send(body: string): this;
  end(): this;
}

export type ExpressHealthOptions = HealthEndpointOptions<ExpressHealthRequest>;

export const defaultPath = "/health";

export function healthRouter(options: ExpressHealthOptions): Router {
  const check = createHealthCheck(options);
  const path = options.path ?? defaultPath;
  const router = express.Router();

  const respond = async (
    req: ExpressHealthRequest,
    res: ExpressHealthResponse,
    head: boolean,
  ): Promise<void> => {
    const report = await check.report();
    const extra = options.extend == null
      ? {}
      : await options.extend(report, req);
    const rendered = renderHealthResponse(report, options, extra);
    res.status(rendered.status).set({ ...rendered.headers });
    if (head) res.end();
    else res.send(JSON.stringify(rendered.body));
  };

  router.get(path, (req, res, next) => {
    respond(req, res, false).catch(next);
  });
  router.head(path, (req, res, next) => {
    respond(req, res, true).catch(next);
  });
  return router;
}
