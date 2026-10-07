import { describe, expect, it } from "vitest";
import { coarsen, fromReference, isFhirDateTime, toReference } from "./reference";
import type { PostcodeReference, ReferenceOptions } from "./types";

const FULL = "EK 01 A03 FK 01";

describe("toReference", () => {
  it("gives code and level only for a bare full code", () => {
    const ref = toReference(FULL);
    expect(ref).toStrictEqual({ code: "EK-01-A03-FK-01", level: "building" });
    expect(Object.keys(ref as PostcodeReference)).toEqual(["code", "level"]);
  });

  it("truncates to the requested level", () => {
    expect(toReference(FULL, { level: "district" })).toStrictEqual({ code: "EK-01-A03", level: "district" });
  });

  it("accepts any input style and copies confidence and source", () => {
    expect(toReference("ek01a03fk01", { level: "area", confidence: "medium", source: "derived" })).toStrictEqual({
      code: "EK-01-A03-FK",
      level: "area",
      confidence: "medium",
      source: "derived",
    });
  });

  it("defaults to the level of a partial input", () => {
    expect(toReference("EK 01 A03")).toStrictEqual({ code: "EK-01-A03", level: "district" });
  });

  it("gives null when the requested level is finer than the input", () => {
    expect(toReference("EK 01 A03", { level: "building" })).toBeNull();
  });

  it("gives null for a bad postcode and an unknown level", () => {
    expect(toReference("bad")).toBeNull();
    expect(toReference(FULL, { level: "street" as never })).toBeNull();
  });

  it("rejects date-only and offset-less checkedAt", () => {
    expect(() => toReference(FULL, { checkedAt: "2026-10-06" })).toThrow(RangeError);
    expect(() => toReference(FULL, { checkedAt: "2026-10-06T09:00:00" })).toThrow(/checkedAt/);
  });

  it("copies a valid checkedAt verbatim", () => {
    expect(toReference(FULL, { checkedAt: "2026-10-06T09:00:00Z" })?.checked_at).toBe("2026-10-06T09:00:00Z");
    expect(toReference(FULL, { checkedAt: "2026-10-06T09:00:00.123+01:00" })?.checked_at).toBe(
      "2026-10-06T09:00:00.123+01:00",
    );
  });

  it("throws RangeError naming each bad option", () => {
    expect(() => toReference(FULL, { confidence: "certain" as never })).toThrow(RangeError);
    expect(() => toReference(FULL, { confidence: "certain" as never })).toThrow(/confidence/);
    expect(() => toReference(FULL, { source: "guess" as never })).toThrow(RangeError);
    expect(() => toReference(FULL, { source: "guess" as never })).toThrow(/source/);
    expect(() => toReference(FULL, { assigned: "yes" as never })).toThrow(RangeError);
    expect(() => toReference(FULL, { assigned: "yes" as never })).toThrow(/assigned/);
  });

  it("orders keys code, level, confidence, assigned, checked_at, source", () => {
    const options: ReferenceOptions = {
      source: "lookup",
      checkedAt: "2026-10-06T09:00:00Z",
      assigned: false,
      confidence: "high",
      level: "building",
    };
    expect(Object.keys(toReference(FULL, options) as PostcodeReference)).toEqual([
      "code",
      "level",
      "confidence",
      "assigned",
      "checked_at",
      "source",
    ]);
  });

  it("keeps assigned false rather than dropping it", () => {
    expect(toReference(FULL, { assigned: false })).toStrictEqual({
      code: "EK-01-A03-FK-01",
      level: "building",
      assigned: false,
    });
  });
});

describe("fromReference", () => {
  const full: PostcodeReference = {
    code: "EK-01-A03-FK-01",
    level: "building",
    confidence: "high",
    assigned: true,
    checked_at: "2026-10-06T09:00:00Z",
    source: "lookup",
  };

  it("round-trips a valid reference", () => {
    expect(fromReference(full)).toStrictEqual(full);
    expect(fromReference({ code: "EK-01", level: "lga" })).toStrictEqual({ code: "EK-01", level: "lga" });
  });

  it("normalises a lower-case or spaced code to hyphen form", () => {
    expect(fromReference({ code: "ek-01-a03", level: "district" })).toStrictEqual({
      code: "EK-01-A03",
      level: "district",
    });
    expect(fromReference({ code: "ek 01 a03 fk 01", level: "building" })?.code).toBe("EK-01-A03-FK-01");
  });

  it("gives null when code and level disagree", () => {
    expect(fromReference({ code: "EK-01-A03", level: "building" })).toBeNull();
    expect(fromReference({ code: "EK-01-A03-FK-01", level: "district" })).toBeNull();
  });

  it("gives null when code or level is missing or not a string", () => {
    expect(fromReference({ level: "building" })).toBeNull();
    expect(fromReference({ code: "EK-01-A03-FK-01" })).toBeNull();
    expect(fromReference({ code: 42, level: "building" })).toBeNull();
    expect(fromReference({ code: "bad", level: "building" })).toBeNull();
  });

  it("gives null for non-objects", () => {
    expect(fromReference(null)).toBeNull();
    expect(fromReference(undefined)).toBeNull();
    expect(fromReference("EK-01")).toBeNull();
    expect(fromReference(42)).toBeNull();
  });

  it("gives null for bad optional values", () => {
    expect(fromReference({ ...full, confidence: "certain" })).toBeNull();
    expect(fromReference({ ...full, assigned: "true" })).toBeNull();
    expect(fromReference({ ...full, checked_at: "2026-10-06" })).toBeNull();
    expect(fromReference({ ...full, checked_at: 1 })).toBeNull();
    expect(fromReference({ ...full, source: "guess" })).toBeNull();
    expect(fromReference({ ...full, confidence: null })).toBeNull();
  });

  it("drops unknown keys", () => {
    expect(fromReference({ code: "EK-01-A03", level: "district", note: "x" })).toStrictEqual({
      code: "EK-01-A03",
      level: "district",
    });
  });
});

describe("isFhirDateTime", () => {
  it.each(["2026-10-06T09:00:00Z", "2026-10-06T09:00:00.5+01:00", "2026-12-31T23:59:60Z"])("accepts %s", (v) => {
    expect(isFhirDateTime(v)).toBe(true);
  });

  it.each([
    "2026-10-06",
    "2026-10-06T09:00",
    "2026-10-06T09:00:00",
    "2026-13-01T00:00:00Z",
    "2026-10-06T24:00:00Z",
    "2026-10-06T09:00:00+15:00",
  ])("rejects %s", (v) => {
    expect(isFhirDateTime(v)).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isFhirDateTime(undefined)).toBe(false);
    expect(isFhirDateTime(new Date())).toBe(false);
  });
});

describe("isFhirDateTime year and calendar rules", () => {
  it("rejects year 0000 and days that do not exist", () => {
    expect(isFhirDateTime("0000-01-01T00:00:00Z")).toBe(false);
    expect(isFhirDateTime("2026-02-31T09:00:00Z")).toBe(false);
    expect(isFhirDateTime("2023-02-29T09:00:00Z")).toBe(false);
    expect(isFhirDateTime("2026-04-31T09:00:00Z")).toBe(false);
    expect(isFhirDateTime("0100-02-29T00:00:00Z")).toBe(false);
  });

  it("accepts leap days and the first valid year", () => {
    expect(isFhirDateTime("2024-02-29T09:00:00Z")).toBe(true);
    expect(isFhirDateTime("0001-01-01T00:00:00Z")).toBe(true);
    expect(isFhirDateTime("2000-02-29T00:00:00Z")).toBe(true);
  });
});

describe("fromReference reads own keys only", () => {
  it("ignores inherited fields", () => {
    expect(fromReference(Object.create({ code: "EK-01", level: "lga" }))).toBeNull();
    const inherited = Object.assign(Object.create({ assigned: true, confidence: "high" }), { code: "EK-01", level: "lga" });
    expect(fromReference(inherited)).toEqual({ code: "EK-01", level: "lga" });
  });
});

describe("assigned and checked_at belong to a building code only", () => {
  it("toReference throws when they are given with a coarser level", () => {
    expect(() => toReference(FULL, { level: "district", assigned: true })).toThrow(RangeError);
    expect(() => toReference(FULL, { level: "lga", checkedAt: "2026-10-06T09:00:00Z" })).toThrow(/coarsen/);
    expect(() => toReference("EK 01 A03", { assigned: false })).toThrow(RangeError);
  });

  it("fromReference returns null for a coarser reference that carries them", () => {
    expect(fromReference({ code: "EK-01-A03", level: "district", assigned: true })).toBeNull();
    expect(fromReference({ code: "EK-01", level: "lga", checked_at: "2026-10-06T09:00:00Z" })).toBeNull();
    expect(fromReference({ code: "EK-01-A03-FK-01", level: "building", assigned: true })).not.toBeNull();
  });
});

describe("coarsen", () => {
  const checked: PostcodeReference = {
    code: "EK-01-A03-FK-01",
    level: "building",
    confidence: "high",
    assigned: true,
    checked_at: "2026-10-06T09:00:00Z",
    source: "lookup",
  };

  it("cuts the code, keeps confidence, drops the check and marks the result derived", () => {
    expect(coarsen(checked, "district")).toStrictEqual({
      code: "EK-01-A03",
      level: "district",
      confidence: "high",
      source: "derived",
    });
    expect(coarsen(checked, "state")).toStrictEqual({ code: "EK", level: "state", confidence: "high", source: "derived" });
  });

  it("returns the normalised reference unchanged at its own level", () => {
    expect(coarsen(checked, "building")).toStrictEqual(checked);
    expect(coarsen({ code: "ek 01 a03", level: "district" }, "district")).toStrictEqual({ code: "EK-01-A03", level: "district" });
  });

  it("gives null for a finer level, an unknown level or an invalid reference", () => {
    expect(coarsen({ code: "EK-01-A03", level: "district" }, "building")).toBeNull();
    expect(coarsen(checked, "street" as never)).toBeNull();
    expect(coarsen({ code: "EK-01-A03", level: "building" }, "state")).toBeNull();
    expect(coarsen(null, "state")).toBeNull();
  });
});
