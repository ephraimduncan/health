import { type SQL, sql } from "drizzle-orm";
import type { Probe, ProbeOverrides, ProbeResult } from "@openstatus/health";

export const drizzleDefaultName = "database";

export interface DrizzleLikeDb {
  execute?(query: SQL): PromiseLike<ProbeResult>;
  run?(query: SQL): PromiseLike<ProbeResult>;
}

export interface DrizzleProbeOptions extends ProbeOverrides {
  readonly db: DrizzleLikeDb;
}

export function drizzleProbe(options: DrizzleProbeOptions): Probe {
  const db = options.db;
  const query = sql`select 1`;
  let run: () => PromiseLike<ProbeResult>;
  if (typeof db.execute === "function") {
    const execute = db.execute;
    run = () => execute(query);
  } else if (typeof db.run === "function") {
    const runFn = db.run;
    run = () => runFn(query);
  } else {
    throw new Error("unsupported drizzle instance");
  }
  return {
    name: options.name ?? drizzleDefaultName,
    critical: options.critical ?? true,
    timeoutMs: options.timeoutMs,
    skip: options.skip,
    run: async () => {
      await run();
    },
  };
}
