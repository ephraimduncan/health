import { runProbes } from "./run.ts";
import type {
  HealthCheck,
  HealthCheckOptions,
  HealthReport,
  OnReport,
} from "./types.ts";
import { assertUniqueProbeNames } from "./validate.ts";

export const defaultCacheMs = 5000;

export function createHealthCheck(options: HealthCheckOptions): HealthCheck {
  assertUniqueProbeNames(options.probes);
  const cacheMs = options.cacheMs ?? defaultCacheMs;
  const cacheFailuresMs = options.cacheFailuresMs ?? cacheMs;
  let cached:
    | { readonly at: number; readonly report: HealthReport }
    | undefined;
  let pending: Promise<HealthReport> | undefined;

  return {
    report(): Promise<HealthReport> {
      if (cached != null) {
        const ttl = cached.report.status === "ok" ? cacheMs : cacheFailuresMs;
        if (Date.now() - cached.at < ttl) {
          return Promise.resolve(cached.report);
        }
      }
      if (pending != null) return pending;
      pending = runProbes(options.probes, {
        timeoutMs: options.timeoutMs,
        formatError: options.formatError,
      })
        .then((report) => {
          cached = { at: Date.now(), report };
          notify(options.onReport, report);
          return report;
        })
        .finally(() => {
          pending = undefined;
        });
      return pending;
    },
    invalidate(): void {
      cached = undefined;
    },
  };
}

function notify(onReport: OnReport | undefined, report: HealthReport): void {
  if (onReport == null) return;
  try {
    const result = onReport(report);
    if (result instanceof Promise) result.catch(() => {});
  } catch {
    return;
  }
}
