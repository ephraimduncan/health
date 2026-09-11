import type {
  HealthEndpointOptions,
  HealthHttpResponse,
  HealthReport,
  HealthResponseBody,
  JsonObject,
} from "./types.ts";

export const defaultUnhealthyStatusCode = 503;
export const defaultDegradedStatusCode = 200;

export const healthHeaders: Readonly<Record<string, string>> = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export function statusCodeFor<Ctx>(
  report: HealthReport,
  options: HealthEndpointOptions<Ctx>,
): number {
  switch (report.status) {
    case "unhealthy":
      return options.unhealthyStatusCode ?? defaultUnhealthyStatusCode;
    case "degraded":
      return options.degradedStatusCode ?? defaultDegradedStatusCode;
    default:
      return 200;
  }
}

export function renderHealthResponse<Ctx>(
  report: HealthReport,
  options: HealthEndpointOptions<Ctx>,
  extra: JsonObject = {},
): HealthHttpResponse {
  const exposeChecks = options.exposeChecks ?? true;
  const body: HealthResponseBody = exposeChecks
    ? {
      ...extra,
      status: report.status,
      checkedAt: report.checkedAt,
      latencyMs: report.latencyMs,
      checks: report.checks,
    }
    : { ...extra, status: report.status, checkedAt: report.checkedAt };
  return {
    status: statusCodeFor(report, options),
    headers: healthHeaders,
    body,
  };
}
