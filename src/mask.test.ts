import { describe, expect, it } from "vitest";
import { LEVELS, type Level, type Style } from "./types";
import { mask } from "./mask";

const FULL = "EK 01 A03 FK 01";

describe("mask", () => {
  it("keeps the real segments up to the level and fills the rest", () => {
    expect(mask(FULL, "district")).toBe("EK 01 A03 ·· ··");
    expect(mask(FULL, "area")).toBe("EK 01 A03 FK ··");
    expect(mask(FULL, "building")).toBe(FULL);
    expect(mask(FULL, "state")).toBe("EK ·· ··· ·· ··");
    expect(mask(FULL, "lga")).toBe("EK 01 ··· ·· ··");
  });

  it("defaults the fill to the middle dot U+00B7", () => {
    expect(mask(FULL, "area")).toBe("EK 01 A03 FK ··");
  });

  it("honours the fill and style options", () => {
    expect(mask(FULL, "district", { fill: "*" })).toBe("EK 01 A03 ** **");
    expect(mask(FULL, "district", { style: "hyphen" })).toBe("EK-01-A03-··-··");
    expect(mask(FULL, "district", { style: "compact" })).toBe("EK01A03····");
  });

  it("accepts any input style", () => {
    expect(mask("ek-01-a03-fk-01", "district")).toBe("EK 01 A03 ·· ··");
    expect(mask("EK01A03FK01", "area", { style: "hyphen" })).toBe("EK-01-A03-FK-··");
  });

  it("clamps when the input is coarser than the level", () => {
    expect(mask("EK 01 A03", "building")).toBe("EK 01 A03 ·· ··");
    expect(mask("EK 01", "district")).toBe("EK 01 ··· ·· ··");
  });

  it("returns null for bad input or an unknown level", () => {
    expect(mask("bad", "district")).toBeNull();
    expect(mask("", "district")).toBeNull();
    expect(mask(42 as unknown as string, "district")).toBeNull();
    expect(mask(FULL, "street" as Level)).toBeNull();
  });

  it("throws RangeError when the fill is not exactly one character", () => {
    expect(() => mask(FULL, "district", { fill: "" })).toThrow(RangeError);
    expect(() => mask(FULL, "district", { fill: "ab" })).toThrow(RangeError);
    expect(() => mask(FULL, "district", { fill: "ab" })).toThrow("fill must be exactly one character");
    expect(() => mask(FULL, "district", { fill: 7 as unknown as string })).toThrow(RangeError);
  });

  it("throws RangeError for a bad style", () => {
    expect(() => mask(FULL, "district", { style: "dots" as Style })).toThrow(RangeError);
  });

  it.each(LEVELS)("is always 15 characters in display style at %s", (level) => {
    for (const input of [FULL, "EK", "EK 01", "EK 01 A03", "EK 01 A03 FK"]) {
      expect(mask(input, level)).toHaveLength(15);
      expect(mask(input, level, { fill: "*" })).toHaveLength(15);
    }
  });
});
