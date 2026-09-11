type EnvSource = Readonly<Record<string, string | undefined>>;

type ProcessLike = { env?: EnvSource };

export function readEnv(name: string, source?: EnvSource): string | undefined {
  if (source != null) return source[name];
  const runtime = globalThis as { process?: ProcessLike };
  try {
    return runtime.process?.env?.[name];
  } catch {
    return undefined;
  }
}
