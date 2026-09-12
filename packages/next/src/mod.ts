import type { NextRequest } from "next/server";
import {
  createHealthHandler,
  type HealthHandler,
  type HealthHandlerOptions,
} from "@openstatus/health";

export type NextHealthOptions = HealthHandlerOptions<NextRequest>;

export interface NextHealthRoute {
  readonly GET: HealthHandler<NextRequest>;
  readonly HEAD: HealthHandler<NextRequest>;
}

export function healthRoute(options: NextHealthOptions): NextHealthRoute {
  const handler = createHealthHandler<NextRequest>(options);
  return { GET: handler, HEAD: handler };
}
