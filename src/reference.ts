import {
  CONFIDENCES,
  SOURCES,
  type Confidence,
  type Level,
  type PostcodeReference,
  type ReferenceOptions,
  type Source,
} from "./types";
import { at, parsePartial } from "./postcode";

const FHIR_DATE_TIME =
  /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?(Z|[+-]((0[0-9]|1[0-3]):[0-5][0-9]|14:00))$/;

interface Extras {
  confidence?: Confidence;
  assigned?: boolean;
  checkedAt?: string;
  source?: Source;
}

function isConfidence(value: unknown): value is Confidence {
  return typeof value === "string" && (CONFIDENCES as readonly string[]).includes(value);
}

function isSource(value: unknown): value is Source {
  return typeof value === "string" && (SOURCES as readonly string[]).includes(value);
}

/** Adds keys only when defined, in the order code, level, confidence, assigned, checked_at, source. */
function assemble(code: string, level: Level, extras: Extras): PostcodeReference {
  const ref: PostcodeReference = { code, level };
  if (extras.confidence !== undefined) ref.confidence = extras.confidence;
  if (extras.assigned !== undefined) ref.assigned = extras.assigned;
  if (extras.checkedAt !== undefined) ref.checked_at = extras.checkedAt;
  if (extras.source !== undefined) ref.source = extras.source;
  return ref;
}

/** FHIR's dateTime grammar with seconds and an offset required, plus a real calendar day. */
export function isFhirDateTime(value: unknown): boolean {
  if (typeof value !== "string" || !FHIR_DATE_TIME.test(value)) return false;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCDate() === day;
}

export function toReference(input: string, options?: ReferenceOptions): PostcodeReference | null {
  const { level, confidence, assigned, checkedAt, source } = options ?? {};
  if (confidence !== undefined && !isConfidence(confidence)) {
    throw new RangeError("confidence must be high, medium or low");
  }
  if (assigned !== undefined && typeof assigned !== "boolean") {
    throw new RangeError("assigned must be true or false");
  }
  if (checkedAt !== undefined && !isFhirDateTime(checkedAt)) {
    throw new RangeError("checkedAt must be a date-time with seconds and an offset, e.g. 2026-10-06T09:00:00Z");
  }
  if (source !== undefined && !isSource(source)) {
    throw new RangeError("source must be lookup, self-reported or derived");
  }
  const parsed = parsePartial(input);
  if (parsed === null) return null;
  const target = level ?? parsed.level;
  const code = at(input, target, { style: "hyphen" });
  if (code === null) return null;
  return assemble(code, target, { confidence, assigned, checkedAt, source });
}

export function fromReference(value: unknown): PostcodeReference | null {
  if (typeof value !== "object" || value === null) return null;
  const own = (key: string): unknown => (Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined);
  const [code, level, confidence, assigned, checked_at, source] =
    ["code", "level", "confidence", "assigned", "checked_at", "source"].map(own);
  if (typeof code !== "string" || typeof level !== "string") return null;
  const parsed = parsePartial(code);
  if (parsed === null || parsed.level !== level) return null;
  if (confidence !== undefined && !isConfidence(confidence)) return null;
  if (assigned !== undefined && typeof assigned !== "boolean") return null;
  if (checked_at !== undefined && !isFhirDateTime(checked_at)) return null;
  if (source !== undefined && !isSource(source)) return null;
  return assemble(parsed.hyphen, parsed.level, {
    confidence,
    assigned,
    checkedAt: checked_at as string | undefined,
    source,
  });
}
