import type { Probe, ProbeOverrides, ProbeResult } from "@openstatus/health";

export const tursoServerlessDefaultName = "database";

export interface TursoServerlessConnection {
  get(sql: string): Promise<ProbeResult>;
}

export interface TursoServerlessProbeOptions extends ProbeOverrides {
  readonly connection: TursoServerlessConnection;
}

export function tursoServerlessProbe(
  options: TursoServerlessProbeOptions,
): Probe {
  return {
    name: options.name ?? tursoServerlessDefaultName,
    critical: options.critical ?? true,
    timeoutMs: options.timeoutMs,
    skip: options.skip,
    run: () => options.connection.get("select 1"),
  };
}
