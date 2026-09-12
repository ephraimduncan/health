import { ProbeTimeoutError, resolveFormatError, toError } from "./errors.ts";
import type {
  CheckResult,
  HealthReport,
  HealthStatus,
  Probe,
  ProbeContext,
  RunProbesOptions,
} from "./types.ts";

export const defaultTimeoutMs = 5000;

export async function runProbes(
  probes: readonly Probe[],
  options: RunProbesOptions = {},
): Promise<HealthReport> {
  const started = performance.now();
  const checks = await Promise.all(
    probes.map((probe) => runProbe(probe, options)),
  );
  return {
    status: aggregate(checks),
    checkedAt: new Date().toISOString(),
    latencyMs: elapsed(started),
    checks,
  };
}

export function aggregate(checks: readonly CheckResult[]): HealthStatus {
  let status: HealthStatus = "ok";
  for (const check of checks) {
    if (check.status !== "failed" && check.status !== "timeout") continue;
    if (check.critical) return "unhealthy";
    status = "degraded";
  }
  return status;
}

async function runProbe(
  probe: Probe,
  options: RunProbesOptions,
): Promise<CheckResult> {
  const ctx: ProbeContext = {
    name: probe.name,
    critical: probe.critical ?? false,
    timeoutMs: Math.min(
      probe.timeoutMs ?? options.timeoutMs ?? defaultTimeoutMs,
      options.deadlineMs ?? Infinity,
    ),
  };
  const { name, critical, timeoutMs } = ctx;
  const formatError = resolveFormatError(options.formatError);
  const started = performance.now();

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort(new ProbeTimeoutError(timeoutMs));
      reject(new ProbeTimeoutError(timeoutMs));
    }, timeoutMs);
  });

  const work = Promise.resolve().then(async () => {
    if (await probe.skip?.()) return "skipped";
    await probe.run(controller.signal, ctx);
    return "ok";
  });
  work.catch(() => {});

  try {
    const status = await Promise.race([work, timeout]);
    if (status === "skipped") return { name, status, critical, latencyMs: 0 };
    return { name, status, critical, latencyMs: elapsed(started) };
  } catch (e) {
    const error = toError(e);
    return {
      name,
      status: error instanceof ProbeTimeoutError ? "timeout" : "failed",
      critical,
      latencyMs: elapsed(started),
      error: formatError(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function elapsed(started: number): number {
  return Math.round(performance.now() - started);
}
