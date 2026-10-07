import { describe, expect, it } from "vitest";
import type { Level, Style } from "./types";
import { at, format, isValidFormat, levelOf, parse, parsePartial } from "./postcode";

const FULL = "EK 01 A03 FK 01";
const EXPECTED = {
  level: "building",
  state: "EK",
  lga: "01",
  district: "A03",
  area: "FK",
  building: "01",
  compact: "EK01A03FK01",
  display: "EK 01 A03 FK 01",
  hyphen: "EK-01-A03-FK-01",
};

describe("parse", () => {
  it("parses the Ekiti example into every field", () => {
    expect(parse(FULL)).toEqual(EXPECTED);
  });

  it("parses the two FCT examples", () => {
    expect(parse("FC 02 A09 DB 09")?.compact).toBe("FC02A09DB09");
    const d66 = parse("FC 02 D66 JE 06");
    expect(d66?.compact).toBe("FC02D66JE06");
    expect(d66?.district).toBe("D66");
  });

  it.each([
    "ek 01 a03 fk 01",
    "EK-01-A03-FK-01",
    "EK01A03FK01",
    "ek-01 a03-fk 01",
    "  EK 01 A03 FK 01\n",
  ])("accepts %j as the same code", (input) => {
    expect(parse(input)).toEqual(EXPECTED);
  });

  it.each([
    "EK  01 A03 FK 01",
    "EK 01 A03 FK",
    "EK01A03FK0",
    "EK01A03FK011",
    "EK 00 A03 FK 01",
    "EK 01 A03 FK 00",
    "EK 0A A03 FK 01",
    "EK 01 A03 FK A1",
    "E1 01 A03 FK 01",
    "EK 01 A03 F1 01",
    "EK 01 A-3 FK 01",
    "EK_01_A03_FK_01",
    "EK\t01 A03 FK 01",
    "",
    "   ",
  ])("rejects %j", (input) => {
    expect(parse(input)).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(parse(42 as unknown as string)).toBeNull();
    expect(parse(null as unknown as string)).toBeNull();
    expect(parse(undefined as unknown as string)).toBeNull();
  });

  it.each([
    "ß 01 A03 FK 01",
    "ık 01 a03 fk 01",
    "ſk 01 a03 fk 01",
    "ﬁ 01 A03 FK 01",
    "ＥＫ 01 A03 FK 01",
    "EK\u00A001 A03 FK 01",
  ])("rejects non-ASCII input %j rather than upper-casing it into ASCII", (input) => {
    expect(parsePartial(input)).toBeNull();
    expect(parse(input)).toBeNull();
  });
});

describe("parsePartial", () => {
  it("returns a state-level partial with no lga key", () => {
    const p = parsePartial("EK");
    expect(p).toEqual({ level: "state", state: "EK", compact: "EK", display: "EK", hyphen: "EK" });
    expect(p).not.toHaveProperty("lga");
  });

  it("returns lga, district and area partials", () => {
    expect(parsePartial("ek-01")).toMatchObject({ level: "lga", lga: "01", display: "EK 01" });
    expect(parsePartial("EK 01 A03")).toMatchObject({ level: "district", hyphen: "EK-01-A03" });
    expect(parsePartial("EK01A03FK")).toMatchObject({ level: "area", display: "EK 01 A03 FK" });
    expect(parsePartial("EK 01 A03")).not.toHaveProperty("area");
  });

  it("equals parse on a full code", () => {
    expect(parsePartial(FULL)).toEqual(parse(FULL));
  });

  it.each(["E", "EK 0", "EK 01 A", "EK 01 A03 F", "EK 01 A03 FK 0"])("rejects %j", (input) => {
    expect(parsePartial(input)).toBeNull();
  });
});

describe("isValidFormat", () => {
  it.each([
    "EK 01 A03 FK 01",
    "EK-01-A03-FK-01",
    "EK01A03FK01",
    "ek 01 a03 fk 01",
    "FC 02 A09 DB 09",
    "FC-02-A09-DB-09",
    "fc02a09db09",
    "FC 02 D66 JE 06",
    "FC-02-D66-JE-06",
    "FC02D66JE06",
  ])("is true for %j", (input) => {
    expect(isValidFormat(input)).toBe(true);
  });

  it.each(["EK 01 A03 FK", "", "EK  01 A03 FK 01"])("is false for %j", (input) => {
    expect(isValidFormat(input)).toBe(false);
  });
});

describe("format", () => {
  it("renders any accepted input in the requested style", () => {
    expect(format("ek01a03fk01", "display")).toBe("EK 01 A03 FK 01");
    expect(format("EK 01 A03 FK 01", "hyphen")).toBe("EK-01-A03-FK-01");
    expect(format("EK-01-A03-FK-01", "compact")).toBe("EK01A03FK01");
    expect(format("EK 01 A03", "hyphen")).toBe("EK-01-A03");
  });

  it("returns null for bad input and throws for a bad style", () => {
    expect(format("bad", "display")).toBeNull();
    expect(() => format(FULL, "dots" as Style)).toThrow(RangeError);
  });
});

describe("levelOf", () => {
  it("names the narrowest segment present", () => {
    expect(levelOf("EK")).toBe("state");
    expect(levelOf("EK 01")).toBe("lga");
    expect(levelOf("EK 01 A03")).toBe("district");
    expect(levelOf("EK 01 A03 FK")).toBe("area");
    expect(levelOf(FULL)).toBe("building");
  });

  it("is null for anything unparseable", () => {
    expect(levelOf("EK 01 A03 FK 0")).toBeNull();
    expect(levelOf("")).toBeNull();
  });
});

describe("at", () => {
  it("cuts a full code to a level", () => {
    expect(at(FULL, "district")).toBe("EK 01 A03");
    expect(at(FULL, "state")).toBe("EK");
    expect(at(FULL, "building")).toBe(FULL);
    expect(at(FULL, "lga")).toBe("EK 01");
    expect(at(FULL, "area")).toBe("EK 01 A03 FK");
  });

  it("honours the style option", () => {
    expect(at(FULL, "area", { style: "hyphen" })).toBe("EK-01-A03-FK");
    expect(at(FULL, "lga", { style: "compact" })).toBe("EK01");
    expect(at(FULL, "district", { style: "display" })).toBe("EK 01 A03");
  });

  it("works on the D66 example", () => {
    expect(at("FC 02 D66 JE 06", "district")).toBe("FC 02 D66");
  });

  it("returns null when the input is coarser than the level", () => {
    expect(at("EK 01 A03", "district")).toBe("EK 01 A03");
    expect(at("EK 01 A03", "area")).toBeNull();
    expect(at("EK 01 A03", "building")).toBeNull();
  });

  it("returns null for bad input or an unknown level", () => {
    expect(at("bad", "district")).toBeNull();
    expect(at(FULL, "street" as Level)).toBeNull();
    expect(at(42 as unknown as string, "district")).toBeNull();
  });

  it("throws RangeError for a bad style, even on bad input", () => {
    expect(() => at(FULL, "district", { style: "dots" as Style })).toThrow(RangeError);
    expect(() => at("bad", "district", { style: "dots" as Style })).toThrow(RangeError);
  });
});
