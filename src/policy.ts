import { LEVELS, type Level, type Style } from "./types";
import { levelIndex } from "./segments";
import { at, parsePartial } from "./postcode";

export const PURPOSES = Object.freeze({
  analytics: "district",
  ai: "district",
  outbreak_signal: "area",
  chw_planning: "area",
  home_visit: "building",
  research_export: "lga",
  patient_message: null,
} as const);
export type Purpose = keyof typeof PURPOSES;
export type PurposeTable = Readonly<Record<Purpose, Level | null>>;
export interface ForPurposeOptions {
  purposes?: Partial<PurposeTable>;
  style?: Style;
}

export function forPurpose(input: string, purpose: Purpose, options?: ForPurposeOptions): string | null {
  if (typeof purpose !== "string" || !Object.prototype.hasOwnProperty.call(PURPOSES, purpose)) return null;
  const table: Record<string, unknown> = { ...PURPOSES, ...options?.purposes };
  const ceiling = levelIndex(table[purpose]);
  if (ceiling < 0) return null;
  const parsed = parsePartial(input);
  if (parsed === null) return null;
  const target = LEVELS[Math.min(ceiling, levelIndex(parsed.level))];
  return at(input, target, { style: options?.style });
}

export interface SuppressResult<T> {
  kept: T[];
  suppressed: { rows: number; total: number };
}

export function suppressSmallCounts<T extends Record<string, unknown>>(
  rows: readonly T[],
  options: { count: keyof T & string; min?: number },
): SuppressResult<T> {
  const min = options.min ?? 5;
  if (typeof min !== "number" || !Number.isFinite(min) || min < 0) {
    throw new RangeError("min must be a finite non-negative number");
  }
  const kept: T[] = [];
  const suppressed = { rows: 0, total: 0 };
  rows.forEach((row, i) => {
    const value = typeof row === "object" && row !== null ? row[options.count] : undefined;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new TypeError(`row ${i}: count must be a finite non-negative number`);
    }
    if (value >= min) {
      kept.push(row);
    } else {
      suppressed.rows += 1;
      suppressed.total += value;
    }
  });
  return { kept, suppressed };
}
