import type { Level, Style } from "./types";

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

export function forPurpose(_input: string, _purpose: Purpose, _options?: ForPurposeOptions): string | null {
  throw new Error("not implemented");
}

export interface SuppressResult<T> {
  kept: T[];
  suppressed: { rows: number; total: number };
}

export function suppressSmallCounts<T extends Record<string, unknown>>(
  _rows: readonly T[],
  _options: { count: keyof T & string; min?: number },
): SuppressResult<T> {
  throw new Error("not implemented");
}
