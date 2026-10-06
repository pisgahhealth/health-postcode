import { LEVELS, type Level, type PartialPostcode, type Postcode, type Style } from "./types";
import { LOOSE_REGEX_BY_LEVEL, isStyle, levelIndex, render } from "./segments";

/** The segment values of a parsed code up to and including the given level index. */
export function segmentsOf(parsed: PartialPostcode, upTo: number): string[] {
  return LEVELS.slice(0, upTo + 1).map((level) => parsed[level] as string);
}

export function parsePartial(input: string): PartialPostcode | null {
  if (typeof input !== "string") return null;
  const s = input.trim().toUpperCase();
  for (let i = LEVELS.length - 1; i >= 0; i -= 1) {
    const level = LEVELS[i];
    const groups = LOOSE_REGEX_BY_LEVEL[level].exec(s)?.groups;
    if (!groups) continue;
    const segments = LEVELS.slice(0, i + 1).map((l) => groups[l]);
    return {
      level,
      state: groups.state,
      ...(i >= 1 && { lga: groups.lga }),
      ...(i >= 2 && { district: groups.district }),
      ...(i >= 3 && { area: groups.area }),
      ...(i >= 4 && { building: groups.building }),
      compact: render(segments, "compact"),
      display: render(segments, "display"),
      hyphen: render(segments, "hyphen"),
    };
  }
  return null;
}

export function parse(input: string): Postcode | null {
  const parsed = parsePartial(input);
  return parsed !== null && parsed.level === "building" ? (parsed as Postcode) : null;
}

export function isValidFormat(input: string): boolean {
  return parse(input) !== null;
}

export function format(input: string, style: Style): string | null {
  if (!isStyle(style)) throw new RangeError("style must be display, hyphen or compact");
  return parsePartial(input)?.[style] ?? null;
}

export function levelOf(input: string): Level | null {
  return parsePartial(input)?.level ?? null;
}

export function at(input: string, level: Level, options?: { style?: Style }): string | null {
  const parsed = parsePartial(input);
  if (parsed === null) return null;
  const want = levelIndex(level);
  if (want < 0 || want > levelIndex(parsed.level)) return null;
  return render(segmentsOf(parsed, want), options?.style ?? "display");
}
