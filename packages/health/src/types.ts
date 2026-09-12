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

export type OnError<Ctx> = (error: Error, ctx: Ctx) => void;

export type ExposeChecks<Ctx> =
  | boolean
  | ((ctx: Ctx) => boolean | Promise<boolean>);

export interface RunProbesOptions {
  readonly timeoutMs?: number;
  readonly deadlineMs?: number;
  readonly formatError?: FormatErrorOption;
}

export interface HealthCheckOptions extends RunProbesOptions {
  readonly probes: readonly Probe[];
  readonly cacheMs?: number;
  readonly cacheFailuresMs?: number;
  readonly staleMs?: number;
  readonly onReport?: OnReport;
}

export interface HealthResponseOptions {
  readonly exposeChecks?: boolean;
  readonly unhealthyStatusCode?: number;
  readonly degradedStatusCode?: number;
}

export interface HealthProbesSource extends HealthCheckOptions {
  readonly check?: undefined;
}

export interface HealthCheckSource {
  readonly check: HealthCheck;
  readonly probes?: undefined;
}

export type HealthSource = HealthProbesSource | HealthCheckSource;

export interface HealthResponderOptions<Ctx = Request> {
  readonly exposeChecks?: ExposeChecks<Ctx>;
  readonly unhealthyStatusCode?: number;
  readonly degradedStatusCode?: number;
  readonly extend?: Extend<Ctx>;
  readonly onError?: OnError<Ctx>;
}

export type HealthHandlerOptions<Ctx = Request> =
  & HealthSource
  & HealthResponderOptions<Ctx>;

export type HealthRouteOptions<Ctx = Request> = HealthHandlerOptions<Ctx> & {
  readonly path?: string;
};

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

export interface HealthResponder<Ctx = Request> {
  readonly check: HealthCheck;
  respond(ctx: Ctx): Promise<HealthHttpResponse>;
  toResponse(ctx: Ctx, method?: string): Promise<Response>;
}
