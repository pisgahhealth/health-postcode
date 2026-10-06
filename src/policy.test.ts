import { describe, expect, it } from "vitest";
import type { Level } from "./types";
import { PURPOSES, forPurpose, suppressSmallCounts, type Purpose } from "./policy";

const FULL = "EK 01 A03 FK 01";

describe("PURPOSES", () => {
  it("is the published table, frozen", () => {
    expect(PURPOSES).toEqual({
      analytics: "district",
      ai: "district",
      outbreak_signal: "area",
      chw_planning: "area",
      home_visit: "building",
      research_export: "lga",
      patient_message: null,
    });
    expect(Object.isFrozen(PURPOSES)).toBe(true);
  });
});

describe("forPurpose", () => {
  it("cuts a full code to each purpose's ceiling", () => {
    expect(forPurpose(FULL, "analytics")).toBe("EK 01 A03");
    expect(forPurpose(FULL, "ai")).toBe("EK 01 A03");
    expect(forPurpose(FULL, "outbreak_signal")).toBe("EK 01 A03 FK");
    expect(forPurpose(FULL, "chw_planning")).toBe("EK 01 A03 FK");
    expect(forPurpose(FULL, "home_visit")).toBe(FULL);
    expect(forPurpose(FULL, "research_export")).toBe("EK 01");
    expect(forPurpose(FULL, "patient_message")).toBeNull();
  });

  it("clamps when the input is coarser than the ceiling", () => {
    expect(forPurpose("EK 01", "analytics")).toBe("EK 01");
    expect(forPurpose("ek-01-a03", "home_visit")).toBe("EK 01 A03");
  });

  it("merges overrides over the default table", () => {
    expect(forPurpose(FULL, "analytics", { purposes: { analytics: "lga" } })).toBe("EK 01");
    expect(forPurpose(FULL, "research_export", { purposes: { research_export: "building" } })).toBe(FULL);
    expect(forPurpose(FULL, "home_visit", { purposes: { home_visit: null } })).toBeNull();
    expect(forPurpose(FULL, "ai", { purposes: { analytics: "lga" } })).toBe("EK 01 A03");
  });

  it("honours the style option", () => {
    expect(forPurpose(FULL, "analytics", { style: "hyphen" })).toBe("EK-01-A03");
    expect(forPurpose(FULL, "research_export", { style: "compact" })).toBe("EK01");
  });

  it("returns null for an unknown purpose", () => {
    expect(forPurpose(FULL, "marketing" as Purpose)).toBeNull();
    expect(forPurpose(FULL, "toString" as Purpose)).toBeNull();
    expect(forPurpose(FULL, 42 as unknown as Purpose)).toBeNull();
  });

  it("returns null for bad input", () => {
    expect(forPurpose("bad", "analytics")).toBeNull();
    expect(forPurpose(42 as unknown as string, "analytics")).toBeNull();
  });

  it("returns null when an override is not a level or null", () => {
    expect(forPurpose(FULL, "analytics", { purposes: { analytics: "street" as Level } })).toBeNull();
    expect(forPurpose(FULL, "analytics", { purposes: { analytics: 3 as unknown as Level } })).toBeNull();
  });
});

describe("suppressSmallCounts", () => {
  const rows = [
    { d: "EK 01 A03", n: 12 },
    { d: "EK 01 A04", n: 3 },
    { d: "EK 01 A05", n: 5 },
    { d: "EK 01 A06", n: 0 },
  ];

  it("keeps rows at or above the default minimum of 5, in order", () => {
    expect(suppressSmallCounts(rows, { count: "n" })).toEqual({
      kept: [rows[0], rows[2]],
      suppressed: { rows: 2, total: 3 },
    });
  });

  it("honours a custom minimum", () => {
    expect(suppressSmallCounts(rows, { count: "n", min: 10 })).toEqual({
      kept: [rows[0]],
      suppressed: { rows: 3, total: 8 },
    });
    expect(suppressSmallCounts(rows, { count: "n", min: 0 })).toEqual({
      kept: rows,
      suppressed: { rows: 0, total: 0 },
    });
  });

  it("handles an empty input", () => {
    expect(suppressSmallCounts([], { count: "n" })).toEqual({ kept: [], suppressed: { rows: 0, total: 0 } });
  });

  it("does not mutate the input and keeps the same row objects", () => {
    const before = structuredClone(rows);
    const result = suppressSmallCounts(rows, { count: "n" });
    expect(rows).toEqual(before);
    expect(result.kept[0]).toBe(rows[0]);
    expect(result.kept[1]).toBe(rows[2]);
    expect(result.kept).not.toBe(rows);
  });

  it.each([["3"], [Number.NaN], [-1], [Number.POSITIVE_INFINITY], [undefined]])(
    "throws TypeError naming the row for count %j",
    (bad) => {
      const input = [{ d: "EK 01 A03", n: 12 as unknown }, { d: "EK 01 A04", n: bad }];
      expect(() => suppressSmallCounts(input, { count: "n" })).toThrow(TypeError);
      expect(() => suppressSmallCounts(input, { count: "n" })).toThrow(
        "row 1: count must be a finite non-negative number",
      );
    },
  );

  it.each([[-1], [Number.NaN], [Number.POSITIVE_INFINITY]])("throws RangeError for min %j", (min) => {
    expect(() => suppressSmallCounts(rows, { count: "n", min })).toThrow(RangeError);
  });
});
