import { LEVELS, type Level, type Style } from "./types";

export interface Segment {
  level: Level;
  length: number;
  pattern: string;
}

/** The single source of truth for the postcode grammar; every regex below is built from it. */
export const SEGMENTS: readonly Segment[] = [
  { level: "state", length: 2, pattern: "[A-Z]{2}" },
  { level: "lga", length: 2, pattern: "(0[1-9]|[1-9][0-9])" },
  { level: "district", length: 3, pattern: "[A-Z0-9]{3}" },
  { level: "area", length: 2, pattern: "[A-Z]{2}" },
  { level: "building", length: 2, pattern: "(0[1-9]|[1-9][0-9])" },
];

export function levelIndex(level: unknown): number {
  return typeof level === "string" ? LEVELS.indexOf(level as Level) : -1;
}

const SEPARATORS: Readonly<Record<Style, string>> = { display: " ", hyphen: "-", compact: "" };

export function isStyle(value: unknown): value is Style {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SEPARATORS, value);
}

export function assertStyle(style: unknown): asserts style is Style {
  if (!isStyle(style)) throw new RangeError("style must be display, hyphen or compact");
}

export function render(segments: readonly string[], style: Style): string {
  assertStyle(style);
  return segments.join(SEPARATORS[style]);
}

const patterns = SEGMENTS.map((s) => s.pattern);

/** ^[A-Z]{2}(0[1-9]|[1-9][0-9])[A-Z0-9]{3}[A-Z]{2}(0[1-9]|[1-9][0-9])$ */
export const COMPACT_REGEX = new RegExp("^" + patterns.join("") + "$");

function byLevel(build: (prefix: readonly string[]) => string): Readonly<Record<Level, RegExp>> {
  const out = {} as Record<Level, RegExp>;
  SEGMENTS.forEach((segment, i) => {
    out[segment.level] = new RegExp("^" + build(patterns.slice(0, i + 1)) + "$");
  });
  return Object.freeze(out);
}

/** Per level, the hyphenated pattern from the postcode-reference schema, e.g. lga: ^[A-Z]{2}-(0[1-9]|[1-9][0-9])$ */
export const HYPHEN_REGEX_BY_LEVEL = byLevel((prefix) => prefix.join("-"));

function nestOptional(from: number): string {
  return from >= patterns.length ? "" : "(-" + patterns[from] + nestOptional(from + 1) + ")?";
}

/** Any hyphenated prefix of a code; used verbatim in the FHIR invariant ngpc-1. */
export const HYPHEN_PARTIAL_REGEX = new RegExp("^" + patterns[0] + nestOptional(1) + "$");

/** Internal: per level, named groups joined by an optional single space or hyphen; used by parsePartial. */
export const LOOSE_REGEX_BY_LEVEL = byLevel((prefix) =>
  prefix.map((pattern, i) => "(?<" + SEGMENTS[i].level + ">" + pattern + ")").join("[ -]?"),
);
