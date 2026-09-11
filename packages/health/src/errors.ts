import type { FormatError } from "./types.ts";

export class ProbeTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`timed out after ${timeoutMs}ms`);
    this.name = "ProbeTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export class DuplicateProbeError extends Error {
  readonly probeName: string;

  constructor(probeName: string) {
    super(`duplicate probe name: ${JSON.stringify(probeName)}`);
    this.name = "DuplicateProbeError";
    this.probeName = probeName;
  }
}

export const defaultFormatError: FormatError = (error) =>
  error instanceof ProbeTimeoutError ? error.message : "failed";

export function toError<T>(value: T): Error {
  return value instanceof Error ? value : new Error(String(value));
}
