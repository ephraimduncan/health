import { healthRoute } from "@openstatus/health-next";
import { exampleProbes } from "../../../probes.ts";

export const dynamic = "force-dynamic";

export const { GET, HEAD } = healthRoute({
  probes: exampleProbes(),
  extend: (_report, req) => ({ requestId: req.headers.get("x-request-id") }),
});
