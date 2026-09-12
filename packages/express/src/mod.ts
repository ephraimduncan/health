import express from "express";
import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";
import {
  createHealthCheck,
  type HealthHandlerOptions,
  type HealthRouteOptions,
  renderHealthResponse,
} from "@openstatus/health";

export type ExpressHealthOptions = HealthRouteOptions<Request>;

export type ExpressHealthHandlerOptions = HealthHandlerOptions<Request>;

export const defaultPath = "/health";

export function healthHandler(
  options: ExpressHealthHandlerOptions,
): RequestHandler {
  const check = createHealthCheck(options);
  const respond = async (req: Request, res: Response): Promise<void> => {
    const report = await check.report();
    const extended = options.extend == null
      ? {}
      : await options.extend(report, req);
    const rendered = renderHealthResponse(report, options, extended);
    res.status(rendered.status).set({ ...rendered.headers });
    if (req.method === "HEAD") res.end();
    else res.send(JSON.stringify(rendered.body));
  };
  return (req: Request, res: Response, next: NextFunction): void => {
    respond(req, res).catch(next);
  };
}

export function healthRoute(options: ExpressHealthOptions): Router {
  const handler = healthHandler(options);
  const path = options.path ?? defaultPath;
  const router = express.Router();
  router.get(path, handler);
  router.head(path, handler);
  return router;
}
