import { describe, expect, it } from "vitest";
import { LEVELS } from "./types";
import {
  COMPACT_REGEX,
  HYPHEN_PARTIAL_REGEX,
  HYPHEN_REGEX_BY_LEVEL,
  LOOSE_REGEX_BY_LEVEL,
  SEGMENTS,
  levelIndex,
  render,
} from "./segments";

describe("SEGMENTS", () => {
  it("lists the five levels in order", () => {
    expect(SEGMENTS.map((s) => s.level)).toEqual([...LEVELS]);
  });

  it("adds up to eleven characters", () => {
    expect(SEGMENTS.reduce((sum, s) => sum + s.length, 0)).toBe(11);
  });
});

describe("COMPACT_REGEX", () => {
  it("has the published source", () => {
    expect(COMPACT_REGEX.source).toBe("^[A-Z]{2}(0[1-9]|[1-9][0-9])[A-Z0-9]{3}[A-Z]{2}(0[1-9]|[1-9][0-9])$");
  });

  it("matches the NIPOST examples in compact form only", () => {
    expect(COMPACT_REGEX.test("EK01A03FK01")).toBe(true);
    expect(COMPACT_REGEX.test("FC02A09DB09")).toBe(true);
    expect(COMPACT_REGEX.test("EK 01 A03 FK 01")).toBe(false);
    expect(COMPACT_REGEX.test("ek01a03fk01")).toBe(false);
  });
});

describe("HYPHEN_REGEX_BY_LEVEL", () => {
  it("equals the postcode-reference schema patterns verbatim", () => {
    expect(HYPHEN_REGEX_BY_LEVEL.state.source).toBe("^[A-Z]{2}$");
    expect(HYPHEN_REGEX_BY_LEVEL.lga.source).toBe("^[A-Z]{2}-(0[1-9]|[1-9][0-9])$");
    expect(HYPHEN_REGEX_BY_LEVEL.district.source).toBe("^[A-Z]{2}-(0[1-9]|[1-9][0-9])-[A-Z0-9]{3}$");
    expect(HYPHEN_REGEX_BY_LEVEL.area.source).toBe("^[A-Z]{2}-(0[1-9]|[1-9][0-9])-[A-Z0-9]{3}-[A-Z]{2}$");
    expect(HYPHEN_REGEX_BY_LEVEL.building.source).toBe(
      "^[A-Z]{2}-(0[1-9]|[1-9][0-9])-[A-Z0-9]{3}-[A-Z]{2}-(0[1-9]|[1-9][0-9])$",
    );
  });

  it("has one entry per level and is frozen", () => {
    expect(Object.keys(HYPHEN_REGEX_BY_LEVEL)).toEqual([...LEVELS]);
    expect(Object.isFrozen(HYPHEN_REGEX_BY_LEVEL)).toBe(true);
  });
});

describe("HYPHEN_PARTIAL_REGEX", () => {
  it("has the nested optional source used by the FHIR invariant", () => {
    expect(HYPHEN_PARTIAL_REGEX.source).toBe(
      "^[A-Z]{2}(-(0[1-9]|[1-9][0-9])(-[A-Z0-9]{3}(-[A-Z]{2}(-(0[1-9]|[1-9][0-9]))?)?)?)?$",
    );
  });

  it.each(["EK", "EK-01", "EK-01-A03", "EK-01-A03-FK", "EK-01-A03-FK-01"])("matches %s", (code) => {
    expect(HYPHEN_PARTIAL_REGEX.test(code)).toBe(true);
  });

  it.each(["EK-00", "EK-01-A03-FK-0", "ek-01", "EK 01", "EK-", "EK-01-", ""])("rejects %j", (code) => {
    expect(HYPHEN_PARTIAL_REGEX.test(code)).toBe(false);
  });
});

describe("LOOSE_REGEX_BY_LEVEL", () => {
  it("names each group after its level", () => {
    const m = LOOSE_REGEX_BY_LEVEL.building.exec("EK-01 A03FK 01");
    expect(m?.groups).toEqual({ state: "EK", lga: "01", district: "A03", area: "FK", building: "01" });
  });

  it("allows at most one separator between segments", () => {
    expect(LOOSE_REGEX_BY_LEVEL.lga.test("EK 01")).toBe(true);
    expect(LOOSE_REGEX_BY_LEVEL.lga.test("EK-01")).toBe(true);
    expect(LOOSE_REGEX_BY_LEVEL.lga.test("EK01")).toBe(true);
    expect(LOOSE_REGEX_BY_LEVEL.lga.test("EK  01")).toBe(false);
    expect(LOOSE_REGEX_BY_LEVEL.lga.test("EK--01")).toBe(false);
    expect(LOOSE_REGEX_BY_LEVEL.lga.test("EK_01")).toBe(false);
  });
});

describe("levelIndex and render", () => {
  it("indexes levels and returns -1 otherwise", () => {
    expect(LEVELS.map(levelIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(levelIndex("street")).toBe(-1);
    expect(levelIndex(undefined)).toBe(-1);
    expect(levelIndex(2)).toBe(-1);
  });

  it("joins with the separator for each style", () => {
    expect(render(["EK", "01", "A03"], "display")).toBe("EK 01 A03");
    expect(render(["EK", "01", "A03"], "hyphen")).toBe("EK-01-A03");
    expect(render(["EK", "01", "A03"], "compact")).toBe("EK01A03");
  });

  it("throws RangeError on an unknown style", () => {
    expect(() => render(["EK"], "dots" as never)).toThrow(RangeError);
  });
});
