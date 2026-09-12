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

export interface ProbeContext {
  readonly name: string;
  readonly critical: boolean;
  readonly timeoutMs: number;
}

export interface Probe {
  readonly name: string;
  readonly critical?: boolean;
  readonly timeoutMs?: number;
  readonly skip?: () => boolean | Promise<boolean>;
  readonly run: (
    signal: AbortSignal,
    ctx: ProbeContext,
  ) => ProbeResult | Promise<ProbeResult>;
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

export type FormatErrorOption = FormatError | "generic" | "message";

export type Extend<Ctx> = (
  report: HealthReport,
  ctx: Ctx,
) => object | Promise<object>;

export type OnReport = (report: HealthReport) => void | Promise<void>;

export interface RunProbesOptions {
  readonly timeoutMs?: number;
  readonly formatError?: FormatErrorOption;
}

export interface HealthCheckOptions extends RunProbesOptions {
  readonly probes: readonly Probe[];
  readonly cacheMs?: number;
  readonly cacheFailuresMs?: number;
  readonly onReport?: OnReport;
}

export interface HealthResponseOptions {
  readonly exposeChecks?: boolean;
  readonly unhealthyStatusCode?: number;
  readonly degradedStatusCode?: number;
}

export interface HealthHandlerOptions<Ctx = Request>
  extends HealthCheckOptions, HealthResponseOptions {
  readonly extend?: Extend<Ctx>;
}

export interface HealthRouteOptions<Ctx = Request>
  extends HealthHandlerOptions<Ctx> {
  readonly path?: string;
}

export type HealthResponseBody = {
  readonly status: HealthStatus;
  readonly checkedAt: string;
  readonly latencyMs?: number;
  readonly checks?: readonly CheckResult[];
  readonly [key: string]: JsonValue | object | undefined;
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
