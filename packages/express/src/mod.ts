import express from "express";
import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";
import {
  createHealthResponder,
  type HealthHandlerOptions,
  type HealthRouteOptions,
} from "@openstatus/health";

type Params = Request["params"];
type Query = Request["query"];

export type ExpressLocals = Record<string, unknown>;

export type ExpressHealthRequest<L extends ExpressLocals = ExpressLocals> =
  Request<Params, unknown, unknown, Query, L>;

export type ExpressHealthResponse<L extends ExpressLocals = ExpressLocals> =
  Response<unknown, L>;

export type ExpressHealthHandler<L extends ExpressLocals = ExpressLocals> =
  RequestHandler<Params, unknown, unknown, Query, L>;

export type ExpressHealthOptions<L extends ExpressLocals = ExpressLocals> =
  HealthRouteOptions<ExpressHealthRequest<L>>;

export type ExpressHealthHandlerOptions<
  L extends ExpressLocals = ExpressLocals,
> = HealthHandlerOptions<ExpressHealthRequest<L>>;

export const defaultPath = "/health";

export function healthHandler<L extends ExpressLocals = ExpressLocals>(
  options: ExpressHealthHandlerOptions<L>,
): ExpressHealthHandler<L> {
  const responder = createHealthResponder<ExpressHealthRequest<L>>(options);
  const respond = async (
    req: ExpressHealthRequest<L>,
    res: ExpressHealthResponse<L>,
  ): Promise<void> => {
    const rendered = await responder.respond(req);
    res.status(rendered.status).set({ ...rendered.headers });
    if (req.method === "HEAD") res.end();
    else res.send(JSON.stringify(rendered.body));
  };
  return (
    req: ExpressHealthRequest<L>,
    res: ExpressHealthResponse<L>,
    next: NextFunction,
  ): void => {
    respond(req, res).catch(next);
  };
}

export function healthRoute<L extends ExpressLocals = ExpressLocals>(
  options: ExpressHealthOptions<L>,
): Router {
  const handler = healthHandler<L>(options);
  const path = options.path ?? defaultPath;
  const router = express.Router();
  router.get(path, handler);
  router.head(path, handler);
  return router;
}
