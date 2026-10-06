import type { Level, Style } from "./types";

export interface MaskOptions {
  style?: Style;
  /** Exactly one character; defaults to the middle dot U+00B7. */
  fill?: string;
}

export function mask(_input: string, _level: Level, _options?: MaskOptions): string | null {
  throw new Error("not implemented");
}
