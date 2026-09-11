import type { NextRequest } from "next/server";
import {
  createHealthHandler,
  type HealthEndpointOptions,
  type HealthHandler,
} from "@openstatus/health";

export type NextHealthOptions = HealthEndpointOptions<NextRequest>;

export interface NextHealthRoute {
  readonly GET: HealthHandler<NextRequest>;
  readonly HEAD: HealthHandler<NextRequest>;
}

export function healthRoute(options: NextHealthOptions): NextHealthRoute {
  const handler = createHealthHandler<NextRequest>(options);
  return { GET: handler, HEAD: handler };
}
