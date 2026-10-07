import type { PostcodeReference } from "./types";
import { parse } from "./postcode";
import { isFhirDateTime } from "./reference";

export interface LookupResult {
  assigned: boolean;
  checkedAt?: string;
}
export type Lookup = (compactCode: string) => Promise<LookupResult>;

export async function verify(input: string, lookup: Lookup): Promise<PostcodeReference | null> {
  const parsed = parse(input);
  if (parsed === null) return null;
  const result = await lookup(parsed.compact);
  if (typeof result !== "object" || result === null || typeof result.assigned !== "boolean") {
    throw new TypeError(
      "lookup must resolve to { assigned: true | false }; a missing or non-boolean assigned is a failed check, not a negative one",
    );
  }
  const checkedAt = result.checkedAt === undefined ? new Date() : toDate(result.checkedAt);
  return {
    code: parsed.hyphen,
    level: "building",
    assigned: result.assigned,
    checked_at: checkedAt.toISOString(),
    source: "lookup",
  };
}

function toDate(value: unknown): Date {
  if (!isFhirDateTime(value)) {
    throw new RangeError("checkedAt from the lookup must be a date-time with seconds and an offset, e.g. 2026-10-06T09:00:00Z");
  }
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime()) || !isFhirDateTime(date.toISOString())) {
    throw new RangeError("checkedAt from the lookup is outside the range FHIR accepts");
  }
  return date;
}
