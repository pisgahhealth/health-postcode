import { describe, expect, it, vi } from "vitest";
import { verify, type Lookup } from "./verify";

// The FHIR R4 dateTime pattern behind isFhirDateTime, copied so this file does not depend on reference.ts.
const FHIR_DATE_TIME =
  /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?(Z|[+-]((0[0-9]|1[0-3]):[0-5][0-9]|14:00))$/;

describe("verify", () => {
  it("builds a building-level reference from the lookup result", async () => {
    const lookup = vi.fn<Lookup>().mockResolvedValue({ assigned: true, checkedAt: "2026-10-06T09:00:00Z" });
    const ref = await verify("ek 01 a03 fk 01", lookup);
    expect(ref).toEqual({
      code: "EK-01-A03-FK-01",
      level: "building",
      assigned: true,
      checked_at: "2026-10-06T09:00:00.000Z",
      source: "lookup",
    });
    expect(Object.keys(ref ?? {})).toEqual(["code", "level", "assigned", "checked_at", "source"]);
    expect(ref).not.toHaveProperty("confidence");
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith("EK01A03FK01");
  });

  it("stamps the current time when the lookup gives no checkedAt", async () => {
    const lookup = vi.fn<Lookup>().mockResolvedValue({ assigned: false });
    const before = Date.now();
    const ref = await verify("EK 01 A03 FK 01", lookup);
    const after = Date.now();
    expect(ref?.assigned).toBe(false);
    expect(ref?.checked_at).toMatch(FHIR_DATE_TIME);
    const stamped = Date.parse(ref?.checked_at ?? "");
    expect(stamped).toBeGreaterThanOrEqual(before);
    expect(stamped).toBeLessThanOrEqual(after);
  });

  it("treats anything but assigned === true as not assigned", async () => {
    const lookup = vi.fn().mockResolvedValue({ assigned: "yes" });
    expect((await verify("EK 01 A03 FK 01", lookup))?.assigned).toBe(false);
  });

  it("normalises an offset checkedAt to UTC", async () => {
    const lookup = vi.fn<Lookup>().mockResolvedValue({ assigned: true, checkedAt: "2026-10-06T10:00:00+01:00" });
    expect((await verify("EK 01 A03 FK 01", lookup))?.checked_at).toBe("2026-10-06T09:00:00.000Z");
  });

  it.each(["bad", "EK 01 A03", "EK 01 A03 FK", "", 42 as unknown as string])(
    "returns null for %j without calling the lookup",
    async (input) => {
      const lookup = vi.fn<Lookup>();
      expect(await verify(input, lookup)).toBeNull();
      expect(lookup).not.toHaveBeenCalled();
    },
  );

  it("rejects with the lookup's own error", async () => {
    const failure = new Error("NIPOST is down");
    const lookup = vi.fn<Lookup>().mockRejectedValue(failure);
    await expect(verify("EK 01 A03 FK 01", lookup)).rejects.toBe(failure);
  });

  it("rejects with RangeError when checkedAt cannot be parsed", async () => {
    const lookup = vi.fn<Lookup>().mockResolvedValue({ assigned: true, checkedAt: "yesterday" });
    await expect(verify("EK 01 A03 FK 01", lookup)).rejects.toBeInstanceOf(RangeError);
  });
});

describe("verify checkedAt must be a FHIR date-time", () => {
  it.each(["2026-10-06", "2026-10-06T09:00", "1", "Oct 6", "+010000-01-01T00:00:00Z", "0000-01-01T00:00:00Z"])(
    "rejects %j with RangeError and never guesses a time",
    async (checkedAt) => {
      const lookup = vi.fn<Lookup>(async () => ({ assigned: true, checkedAt }));
      await expect(verify("EK 01 A03 FK 01", lookup)).rejects.toThrow(RangeError);
    },
  );
});
