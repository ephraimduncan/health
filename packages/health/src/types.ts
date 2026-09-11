export type HealthStatus = "ok" | "degraded" | "unhealthy";

export type CheckStatus = "ok" | "failed" | "timeout" | "skipped";

export type ProbeResult =
  | void
  | null
  | boolean
  | number
  | bigint
  | string
  | object;

export interface Probe {
  readonly name: string;
  readonly critical?: boolean;
  readonly timeoutMs?: number;
  readonly skip?: () => boolean;
  readonly run: (signal: AbortSignal) => ProbeResult | Promise<ProbeResult>;
}

export type ProbeOverrides = Partial<
  Pick<Probe, "name" | "critical" | "timeoutMs" | "skip">
>;

export type CheckResult = {
  readonly name: string;
  readonly status: CheckStatus;
  readonly critical: boolean;
  readonly latencyMs: number;
  readonly error?: string;
};

export type HealthReport = {
  readonly status: HealthStatus;
  readonly checkedAt: string;
  readonly latencyMs: number;
  readonly checks: readonly CheckResult[];
};

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | readonly JsonValue[] | JsonObject;

export type JsonObject = { readonly [key: string]: JsonValue | undefined };

export type FormatError = (error: Error) => string;

export type Extend<Ctx> = (
  report: HealthReport,
  ctx: Ctx,
) => JsonObject | Promise<JsonObject>;

export interface HealthEndpointOptions<Ctx = Request> {
  readonly probes: readonly Probe[];
  readonly path?: string;
  readonly cacheMs?: number;
  readonly timeoutMs?: number;
  readonly exposeChecks?: boolean;
  readonly unhealthyStatusCode?: number;
  readonly degradedStatusCode?: number;
  readonly extend?: Extend<Ctx>;
  readonly formatError?: FormatError;
}

export type HealthResponseBody = {
  readonly status: HealthStatus;
  readonly checkedAt: string;
  readonly latencyMs?: number;
  readonly checks?: readonly CheckResult[];
  readonly [key: string]: JsonValue | undefined;
};

export type HealthHttpResponse = {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: HealthResponseBody;
};

export interface HealthCheck {
  report(): Promise<HealthReport>;
  invalidate(): void;
}
