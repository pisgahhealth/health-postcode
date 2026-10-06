import type { FhirExtension, PostcodeReference, ReferenceOptions } from "./types";

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

export function toFhirExtension(
  _input: string | PostcodeReference,
  _options?: ReferenceOptions,
): FhirExtension | null {
  throw new Error("not implemented");
}

export function fromFhirExtension(_value: unknown): PostcodeReference | null {
  throw new Error("not implemented");
}
