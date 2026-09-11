import type { Probe, ProbeOverrides, ProbeResult } from "@openstatus/health";

export const tursoDefaultName = "database";

export interface LibsqlLikeClient {
  execute(sql: string): Promise<ProbeResult>;
}

export interface TursoProbeOptions extends ProbeOverrides {
  readonly client: LibsqlLikeClient;
}

export function tursoProbe(options: TursoProbeOptions): Probe {
  return {
    name: options.name ?? tursoDefaultName,
    critical: options.critical ?? true,
    timeoutMs: options.timeoutMs,
    skip: options.skip,
    run: () => options.client.execute("select 1"),
  };
}
