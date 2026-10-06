export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function run(_argv: readonly string[]): RunResult {
  throw new Error("not implemented");
}
