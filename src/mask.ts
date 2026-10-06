import type { Level, Style } from "./types";
import { SEGMENTS, levelIndex, render } from "./segments";
import { parsePartial, segmentsOf } from "./postcode";

export interface MaskOptions {
  style?: Style;
  /** Exactly one character; defaults to the middle dot U+00B7. */
  fill?: string;
}

export function mask(input: string, level: Level, options?: MaskOptions): string | null {
  const fill = options?.fill ?? "·";
  if (typeof fill !== "string" || [...fill].length !== 1) {
    throw new RangeError("fill must be exactly one character");
  }
  const parsed = parsePartial(input);
  const want = levelIndex(level);
  if (parsed === null || want < 0) return null;
  const keep = Math.min(want, levelIndex(parsed.level));
  const shown = segmentsOf(parsed, keep);
  const hidden = SEGMENTS.slice(keep + 1).map((segment) => fill.repeat(segment.length));
  return render([...shown, ...hidden], options?.style ?? "display");
}
