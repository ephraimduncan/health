import { runProbes } from "./run.ts";
import type {
  HealthCheck,
  HealthEndpointOptions,
  HealthReport,
} from "./types.ts";
import { assertUniqueProbeNames } from "./validate.ts";

export const defaultCacheMs = 5000;

export function createHealthCheck<Ctx>(
  options: HealthEndpointOptions<Ctx>,
): HealthCheck {
  assertUniqueProbeNames(options.probes);
  const cacheMs = options.cacheMs ?? defaultCacheMs;
  let cached:
    | { readonly at: number; readonly report: HealthReport }
    | undefined;
  let pending: Promise<HealthReport> | undefined;

  return {
    report(): Promise<HealthReport> {
      if (cached != null && Date.now() - cached.at < cacheMs) {
        return Promise.resolve(cached.report);
      }
      if (pending != null) return pending;
      pending = runProbes(options.probes, {
        timeoutMs: options.timeoutMs,
        formatError: options.formatError,
      })
        .then((report) => {
          cached = { at: Date.now(), report };
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
