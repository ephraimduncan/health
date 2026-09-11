import { defaultFormatError, ProbeTimeoutError, toError } from "./errors.ts";
import type {
  CheckResult,
  FormatError,
  HealthReport,
  HealthStatus,
  Probe,
} from "./types.ts";

export const defaultTimeoutMs = 5000;

export interface RunProbesOptions {
  readonly timeoutMs?: number;
  readonly formatError?: FormatError;
}

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
  const name = probe.name;
  const critical = probe.critical ?? false;
  const timeoutMs = probe.timeoutMs ?? options.timeoutMs ?? defaultTimeoutMs;
  const formatError = options.formatError ?? defaultFormatError;
  const started = performance.now();

  let skipped: boolean;
  try {
    skipped = probe.skip?.() ?? false;
  } catch (e) {
    return {
      name,
      status: "failed",
      critical,
      latencyMs: elapsed(started),
      error: formatError(toError(e)),
    };
  }
  if (skipped) return { name, status: "skipped", critical, latencyMs: 0 };

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort(new ProbeTimeoutError(timeoutMs));
      reject(new ProbeTimeoutError(timeoutMs));
    }, timeoutMs);
  });

  try {
    await Promise.race([
      Promise.resolve().then(() => probe.run(controller.signal)),
      timeout,
    ]);
    return { name, status: "ok", critical, latencyMs: elapsed(started) };
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
