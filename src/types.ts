export const LEVELS = Object.freeze(["state", "lga", "district", "area", "building"] as const);
export type Level = (typeof LEVELS)[number];

export const CONFIDENCES = Object.freeze(["high", "medium", "low"] as const);
export type Confidence = (typeof CONFIDENCES)[number];

export const SOURCES = Object.freeze(["lookup", "self-reported", "derived"] as const);
export type Source = (typeof SOURCES)[number];

export type Style = "display" | "hyphen" | "compact";

export interface PartialPostcode {
  /** The narrowest segment present. */
  level: Level;
  state: string;
  /** Zero-padded two-digit string, e.g. "01". */
  lga?: string;
  district?: string;
  area?: string;
  /** Zero-padded two-digit string; ng-postcode calls this segment "unit". */
  building?: string;
  compact: string;
  display: string;
  hyphen: string;
}

export interface Postcode extends PartialPostcode {
  level: "building";
  lga: string;
  district: string;
  area: string;
  building: string;
}

/** Kayode Adeniyi's postcode-reference shape plus our optional `source`. */
export interface PostcodeReference {
  /** Hyphenated upper-case code truncated to `level`. */
  code: string;
  level: Level;
  confidence?: Confidence;
  /** NIPOST reported the building code as assigned; absent when not checked. Only valid when level is building. */
  assigned?: boolean;
  /** RFC 3339 date-time with an offset. Only valid when level is building. */
  checked_at?: string;
  source?: Source;
}

export interface ReferenceOptions {
  /** Defaults to the level of the input. */
  level?: Level;
  confidence?: Confidence;
  assigned?: boolean;
  /** camelCase here, checked_at in the reference, checkedAt in FHIR. */
  checkedAt?: string;
  source?: Source;
}

/** Minimal structural subset of FHIR R4 Extension. */
export interface FhirExtension {
  url: string;
  extension?: FhirExtension[];
  valueString?: string;
  valueCode?: string;
  valueBoolean?: boolean;
  valueDateTime?: string;
}

/** Minimal structural subset of FHIR R4 Address. */
export interface FhirAddress {
  use?: string;
  type?: string;
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: unknown;
  extension?: FhirExtension[];
}

/** What suppressSmallCounts would drop; kept apart from the export payload on purpose. */
export interface SuppressionReport {
  keptRows: number;
  suppressedRows: number;
  suppressedTotal: number;
}
