import { LEVELS, type Level, type Style, type SuppressionReport } from "./types";
import { assertStyle, levelIndex } from "./segments";
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
  const style = options?.style ?? "display";
  assertStyle(style);
  if (typeof purpose !== "string" || !Object.prototype.hasOwnProperty.call(PURPOSES, purpose)) return null;
  const table: Record<string, unknown> = { ...PURPOSES, ...options?.purposes };
  const ceiling = levelIndex(table[purpose]);
  if (ceiling < 0) return null;
  const parsed = parsePartial(input);
  if (parsed === null) return null;
  const target = LEVELS[Math.min(ceiling, levelIndex(parsed.level))];
  return at(input, target, { style });
}

interface CountOptions<T> {
  count: keyof T & string;
  min?: number;
}

function* countedRows<T extends Record<string, unknown>>(
  rows: readonly T[],
  options: CountOptions<T>,
): Generator<[T, number, number]> {
  if (!Array.isArray(rows)) throw new TypeError("rows must be an array");
  if (typeof options?.count !== "string") throw new TypeError("count must name the column to read");
  const min = options.min ?? 5;
  if (typeof min !== "number" || !Number.isFinite(min) || min < 0) {
    throw new RangeError("min must be a finite non-negative number");
  }
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const value =
      typeof row === "object" && row !== null && Object.hasOwn(row, options.count) ? row[options.count] : undefined;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new TypeError(`row ${i}: count must be a finite non-negative number`);
    }
    yield [row, value, min];
  }
}

/** The rows safe to export: those whose count is at or above min (default 5), same objects, same order. */
export function suppressSmallCounts<T extends Record<string, unknown>>(rows: readonly T[], options: CountOptions<T>): T[] {
  const kept: T[] = [];
  for (const [row, value, min] of countedRows(rows, options)) {
    if (value >= min) kept.push(row);
  }
  return kept;
}

/** What suppressSmallCounts drops for the same input; for logs and review, never for the export itself. */
export function suppressionReport<T extends Record<string, unknown>>(
  rows: readonly T[],
  options: CountOptions<T>,
): SuppressionReport {
  const report: SuppressionReport = { keptRows: 0, suppressedRows: 0, suppressedTotal: 0 };
  for (const [, value, min] of countedRows(rows, options)) {
    if (value >= min) {
      report.keptRows += 1;
    } else {
      report.suppressedRows += 1;
      report.suppressedTotal += value;
    }
  }
  return report;
}
