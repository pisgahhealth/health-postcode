import { describe, expect, it } from "vitest";
import { STATE_CODES_SEEN, STATE_NAMES, stateName } from "./states";

describe("STATE_NAMES", () => {
  it("has the 37 ISO 3166-2:NG codes, frozen", () => {
    expect(Object.keys(STATE_NAMES)).toHaveLength(37);
    expect(Object.isFrozen(STATE_NAMES)).toBe(true);
  });

  it("maps two upper-case letters to a non-empty name", () => {
    for (const [code, name] of Object.entries(STATE_NAMES)) {
      expect(code).toMatch(/^[A-Z]{2}$/);
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });
});

describe("STATE_CODES_SEEN", () => {
  it("has 11 codes, each one in STATE_NAMES", () => {
    expect(STATE_CODES_SEEN).toHaveLength(11);
    for (const code of STATE_CODES_SEEN) expect(STATE_NAMES).toHaveProperty(code);
  });
});

describe("stateName", () => {
  it("names the state of a code, a partial or a full postcode in any style", () => {
    expect(stateName("EK")).toBe("Ekiti");
    expect(stateName("ek")).toBe("Ekiti");
    expect(stateName("EK 01 A03")).toBe("Ekiti");
    expect(stateName("FC-02-A09-DB-09")).toBe("FCT");
    expect(stateName("LA11W06TC10")).toBe("Lagos");
  });

  it("returns null for a well-formed code that is not a state", () => {
    expect(stateName("XX")).toBeNull();
  });

  it("returns null for anything unparseable", () => {
    expect(stateName("E")).toBeNull();
    expect(stateName("")).toBeNull();
    expect(stateName(42 as unknown as string)).toBeNull();
  });
});
