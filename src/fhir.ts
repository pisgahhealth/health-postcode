import type { FhirAddress, FhirExtension, Level, PostcodeReference, ReferenceOptions } from "./types";
import { coarsen, fromReference, toReference } from "./reference";
import { levelIndex } from "./segments";

export const EXTENSION_URL = "https://pisgahhealth.com/fhir/StructureDefinition/ng-digital-postcode";
export const CODESYSTEM_URLS = Object.freeze({
  level: "https://pisgahhealth.com/fhir/CodeSystem/ng-digital-postcode-level",
  confidence: "https://pisgahhealth.com/fhir/CodeSystem/ng-digital-postcode-confidence",
  source: "https://pisgahhealth.com/fhir/CodeSystem/ng-digital-postcode-source",
} as const);
export const VALUESET_URLS = Object.freeze({
  level: "https://pisgahhealth.com/fhir/ValueSet/ng-digital-postcode-level",
  confidence: "https://pisgahhealth.com/fhir/ValueSet/ng-digital-postcode-confidence",
  source: "https://pisgahhealth.com/fhir/ValueSet/ng-digital-postcode-source",
} as const);
/** Sub-extension url to FHIR value type; the order here is the emitted order. */
export const SUB_EXTENSIONS = Object.freeze({
  code: "string",
  level: "code",
  confidence: "code",
  assigned: "boolean",
  checkedAt: "dateTime",
  source: "code",
} as const);
export type SubExtensionName = keyof typeof SUB_EXTENSIONS;

type ValueKey = "valueString" | "valueCode" | "valueBoolean" | "valueDateTime";

const VALUE_KEYS: Readonly<Record<(typeof SUB_EXTENSIONS)[SubExtensionName], ValueKey>> = {
  string: "valueString",
  code: "valueCode",
  boolean: "valueBoolean",
  dateTime: "valueDateTime",
};

const REFERENCE_KEYS: Readonly<Record<SubExtensionName, keyof PostcodeReference>> = {
  code: "code",
  level: "level",
  confidence: "confidence",
  assigned: "assigned",
  checkedAt: "checked_at",
  source: "source",
};

const NAMES = Object.keys(SUB_EXTENSIONS) as SubExtensionName[];

function isSubExtensionName(value: string): value is SubExtensionName {
  return Object.prototype.hasOwnProperty.call(SUB_EXTENSIONS, value);
}

function definedOnly(options: ReferenceOptions | undefined): ReferenceOptions {
  return Object.fromEntries(Object.entries(options ?? {}).filter(([, v]) => v !== undefined));
}

export function toFhirExtension(
  input: string | PostcodeReference,
  options?: ReferenceOptions,
): FhirExtension | null {
  let ref: PostcodeReference | null;
  if (typeof input === "string") {
    ref = toReference(input, options);
  } else {
    let base = fromReference(input);
    if (base === null) return null;
    const overrides = definedOnly(options);
    if (overrides.level !== undefined && levelIndex(overrides.level) < levelIndex(base.level)) {
      base = coarsen(base, overrides.level);
      if (base === null) return null;
      delete overrides.level;
    }
    ref = toReference(base.code, {
      level: base.level,
      confidence: base.confidence,
      assigned: base.assigned,
      checkedAt: base.checked_at,
      source: base.source,
      ...overrides,
    });
  }
  if (ref === null) return null;
  const extension: FhirExtension[] = [];
  for (const name of NAMES) {
    const value = ref[REFERENCE_KEYS[name]];
    if (value === undefined) continue;
    extension.push({ url: name, [VALUE_KEYS[SUB_EXTENSIONS[name]]]: value });
  }
  return { url: EXTENSION_URL, extension };
}

export function fromFhirExtension(value: unknown): PostcodeReference | null {
  if (typeof value !== "object" || value === null) return null;
  const { url, extension } = value as Record<string, unknown>;
  if (url !== EXTENSION_URL || !Array.isArray(extension)) return null;
  // The StructureDefinition gives Extension.value[x] a max of 0, so a value beside the sub-extensions is rejected.
  if (Object.keys(value).some((key) => key.startsWith("value"))) return null;
  const ref: Record<string, unknown> = {};
  const seen = new Set<SubExtensionName>();
  for (const item of extension as unknown[]) {
    if (typeof item !== "object" || item === null) return null;
    const entry = item as Record<string, unknown>;
    if (typeof entry.url !== "string") return null;
    if (!isSubExtensionName(entry.url)) continue;
    const name = entry.url;
    if (seen.has(name)) return null;
    seen.add(name);
    const key = VALUE_KEYS[SUB_EXTENSIONS[name]];
    const valueKeys = Object.keys(entry).filter((k) => k.startsWith("value"));
    if (valueKeys.length !== 1 || valueKeys[0] !== key) return null;
    ref[REFERENCE_KEYS[name]] = entry[key];
  }
  return fromReference(ref);
}

const ADDRESS_KEYS_KEPT = ["use", "type", "state", "country"] as const;

/**
 * Builds the share copy of one Address at a coarser level: the cut extension plus use, type, state and country.
 * Lines, city, district, text, postalCode, period and every other extension are dropped. It handles one Address,
 * not the resource around it.
 */
export function coarsenFhirAddress(address: unknown, level: Level): FhirAddress | null {
  if (typeof address !== "object" || address === null) return null;
  const source = address as Record<string, unknown>;
  const extensions = Array.isArray(source.extension) ? (source.extension as unknown[]) : [];
  const ours = extensions.filter(
    (e) => typeof e === "object" && e !== null && (e as Record<string, unknown>).url === EXTENSION_URL,
  );
  if (ours.length !== 1) return null;
  const ref = fromFhirExtension(ours[0]);
  if (ref === null) return null;
  const cut = coarsen(ref, level);
  if (cut === null) return null;
  const ext = toFhirExtension(cut);
  if (ext === null) return null;
  const out: FhirAddress = {};
  for (const key of ADDRESS_KEYS_KEPT) {
    const value = Object.hasOwn(source, key) ? source[key] : undefined;
    if (typeof value === "string") out[key] = value;
  }
  out.extension = [ext];
  return out;
}
