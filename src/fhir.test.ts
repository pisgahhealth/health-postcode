import { describe, expect, it } from "vitest";
import { EXTENSION_URL, SUB_EXTENSIONS, fromFhirExtension, toFhirExtension } from "./fhir";
import { toReference } from "./reference";
import type { FhirExtension, ReferenceOptions } from "./types";

const FULL = "EK 01 A03 FK 01";

const ALL_OPTIONS: ReferenceOptions = {
  confidence: "high",
  assigned: true,
  checkedAt: "2026-10-06T09:00:00Z",
  source: "lookup",
};

const INSTANCE: FhirExtension = {
  url: "https://pisgahhealth.com/fhir/StructureDefinition/ng-digital-postcode",
  extension: [
    { url: "code", valueString: "EK-01-A03-FK-01" },
    { url: "level", valueCode: "building" },
    { url: "confidence", valueCode: "high" },
    { url: "assigned", valueBoolean: true },
    { url: "checkedAt", valueDateTime: "2026-10-06T09:00:00Z" },
    { url: "source", valueCode: "lookup" },
  ],
};

function hasUndefined(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).some(hasUndefined);
}

function urls(ext: FhirExtension | null): string[] {
  return (ext?.extension ?? []).map((e) => e.url);
}

describe("toFhirExtension", () => {
  it("emits the documented instance with every option set", () => {
    const ext = toFhirExtension(FULL, ALL_OPTIONS);
    expect(ext).toStrictEqual(INSTANCE);
    expect(urls(ext)).toEqual(["code", "level", "confidence", "assigned", "checkedAt", "source"]);
    expect(urls(ext)).toEqual(Object.keys(SUB_EXTENSIONS));
  });

  it("emits sub-extensions in canonical order whatever the option order", () => {
    const ext = toFhirExtension(FULL, {
      source: "lookup",
      checkedAt: "2026-10-06T09:00:00Z",
      assigned: true,
      confidence: "high",
    });
    expect(urls(ext)).toEqual(["code", "level", "confidence", "assigned", "checkedAt", "source"]);
  });

  it("emits exactly code and level for a district with no options", () => {
    const ext = toFhirExtension(FULL, { level: "district" });
    expect(ext).toStrictEqual({
      url: EXTENSION_URL,
      extension: [
        { url: "code", valueString: "EK-01-A03" },
        { url: "level", valueCode: "district" },
      ],
    });
  });

  it("gives null for a bad postcode and for a reference whose code and level disagree", () => {
    expect(toFhirExtension("bad")).toBeNull();
    expect(toFhirExtension({ code: "EK-01-A03", level: "building" })).toBeNull();
  });

  it("takes a reference object and merges options over it", () => {
    const ref = { code: "EK-01-A03-FK-01", level: "building" as const, checked_at: "2026-10-06T09:00:00Z" };
    const ext = toFhirExtension(ref);
    expect(ext).toStrictEqual({
      url: EXTENSION_URL,
      extension: [
        { url: "code", valueString: "EK-01-A03-FK-01" },
        { url: "level", valueCode: "building" },
        { url: "checkedAt", valueDateTime: "2026-10-06T09:00:00Z" },
      ],
    });
    expect(toFhirExtension(ref, { level: "area" })).toStrictEqual({
      url: EXTENSION_URL,
      extension: [
        { url: "code", valueString: "EK-01-A03-FK" },
        { url: "level", valueCode: "area" },
        { url: "checkedAt", valueDateTime: "2026-10-06T09:00:00Z" },
      ],
    });
  });

  it("keeps a reference value when the option for it is undefined", () => {
    const ext = toFhirExtension({ code: "EK-01-A03", level: "district", source: "derived" }, { source: undefined });
    expect(urls(ext)).toEqual(["code", "level", "source"]);
  });

  it("throws RangeError for bad options on either input kind", () => {
    expect(() => toFhirExtension(FULL, { checkedAt: "2026-10-06" })).toThrow(RangeError);
    expect(() => toFhirExtension({ code: "EK-01", level: "lga" }, { confidence: "sure" as never })).toThrow(
      RangeError,
    );
  });

  it("never emits an undefined value", () => {
    const cases = [
      toFhirExtension(FULL),
      toFhirExtension(FULL, { level: "state", assigned: false }),
      toFhirExtension({ code: "EK-01-A03", level: "district" }, { confidence: undefined }),
    ];
    for (const ext of cases) {
      expect(ext).not.toBeNull();
      expect(hasUndefined(ext)).toBe(false);
    }
  });

  it("survives a JSON round-trip unchanged", () => {
    const ext = toFhirExtension(FULL, ALL_OPTIONS);
    expect(JSON.parse(JSON.stringify(ext))).toStrictEqual(ext);
  });
});

describe("fromFhirExtension", () => {
  const cases: [string, ReferenceOptions | undefined][] = [
    [FULL, ALL_OPTIONS],
    [FULL, { level: "area", confidence: "low", source: "derived" }],
    ["EK 01 A03", undefined],
    ["EK 01 A03 FK 01", { level: "district", assigned: false }],
  ];

  it.each(cases)("inverts toFhirExtension for %s %j", (input, options) => {
    const ext = toFhirExtension(input, options);
    expect(ext).not.toBeNull();
    expect(fromFhirExtension(ext)).toStrictEqual(toReference(input, options));
  });

  function withSubs(extension: unknown[]): unknown {
    return { url: EXTENSION_URL, extension };
  }

  const code = { url: "code", valueString: "EK-01-A03" };
  const level = { url: "level", valueCode: "district" };

  it("reads a minimal valid extension", () => {
    expect(fromFhirExtension(withSubs([code, level]))).toStrictEqual({ code: "EK-01-A03", level: "district" });
  });

  it("gives null for a wrong url", () => {
    expect(fromFhirExtension({ url: EXTENSION_URL + "-v2", extension: [code, level] })).toBeNull();
  });

  it("gives null without an extension array", () => {
    expect(fromFhirExtension({ url: EXTENSION_URL })).toBeNull();
    expect(fromFhirExtension({ url: EXTENSION_URL, extension: code })).toBeNull();
  });

  it("gives null when a value sits beside the sub-extensions", () => {
    expect(fromFhirExtension({ ...(withSubs([code, level]) as FhirExtension), valueString: "EK-01-A03" })).toBeNull();
  });

  it("gives null when code or level is missing", () => {
    expect(fromFhirExtension(withSubs([level]))).toBeNull();
    expect(fromFhirExtension(withSubs([code]))).toBeNull();
  });

  it("gives null when code and level disagree", () => {
    expect(fromFhirExtension(withSubs([code, { url: "level", valueCode: "building" }]))).toBeNull();
  });

  it("gives null for a duplicate known sub-extension", () => {
    expect(fromFhirExtension(withSubs([code, level, code]))).toBeNull();
    expect(
      fromFhirExtension(withSubs([code, level, { url: "source", valueCode: "derived" }, { url: "source", valueCode: "lookup" }])),
    ).toBeNull();
  });

  it("ignores unknown sub-extensions", () => {
    expect(fromFhirExtension(withSubs([{ url: "note", valueString: "x" }, code, level]))).toStrictEqual({
      code: "EK-01-A03",
      level: "district",
    });
  });

  it("gives null when a known sub-extension carries the wrong value type", () => {
    expect(fromFhirExtension(withSubs([code, { url: "level", valueString: "district" }]))).toBeNull();
    expect(fromFhirExtension(withSubs([{ url: "code", valueCode: "EK-01-A03" }, level]))).toBeNull();
    expect(fromFhirExtension(withSubs([code, level, { url: "assigned", valueString: "true" }]))).toBeNull();
    expect(fromFhirExtension(withSubs([code, level, { url: "assigned", valueBoolean: "true" }]))).toBeNull();
    expect(fromFhirExtension(withSubs([code, level, { url: "checkedAt", valueDateTime: "2026-10-06" }]))).toBeNull();
  });

  it("gives null rather than dropping an optional sub-extension with the wrong value type", () => {
    expect(fromFhirExtension(withSubs([code, level, { url: "confidence", valueCode: "high" }]))).not.toBeNull();
    expect(fromFhirExtension(withSubs([code, level, { url: "confidence", valueString: "high" }]))).toBeNull();
    expect(fromFhirExtension(withSubs([code, level, { url: "source" }]))).toBeNull();
  });

  it("gives null for a malformed sub-extension entry", () => {
    expect(fromFhirExtension(withSubs([code, level, null]))).toBeNull();
    expect(fromFhirExtension(withSubs([code, level, { valueString: "x" }]))).toBeNull();
  });

  it("gives null for a known sub-extension with two values", () => {
    expect(fromFhirExtension(withSubs([code, { url: "level", valueCode: "district", valueString: "district" }]))).toBeNull();
  });

  it("gives null for non-objects and empty objects", () => {
    expect(fromFhirExtension(null)).toBeNull();
    expect(fromFhirExtension("string")).toBeNull();
    expect(fromFhirExtension({})).toBeNull();
  });
});
