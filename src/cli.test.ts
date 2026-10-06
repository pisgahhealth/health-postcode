import { describe, expect, it } from "vitest";
import { USAGE, run } from "./cli";
import { EXTENSION_URL } from "./fhir";
import { parsePartial } from "./postcode";

const FULL = "EK 01 A03 FK 01";

describe("run: commands", () => {
  it("at cuts the code to a level", () => {
    expect(run(["at", FULL, "district"])).toEqual({ exitCode: 0, stdout: "EK 01 A03", stderr: "" });
    expect(run(["at", FULL, "district", "--style", "hyphen"]).stdout).toBe("EK-01-A03");
  });

  it("mask fills the hidden segments with the given character", () => {
    expect(run(["mask", FULL, "area", "--fill", "x"])).toEqual({
      exitCode: 0,
      stdout: "EK 01 A03 FK xx",
      stderr: "",
    });
  });

  it("for gives the code a purpose may see", () => {
    expect(run(["for", FULL, "analytics"])).toEqual({ exitCode: 0, stdout: "EK 01 A03", stderr: "" });
  });

  it("for patient_message refuses on one line", () => {
    expect(run(["for", FULL, "patient_message"])).toEqual({
      exitCode: 1,
      stdout: "",
      stderr: "patient_message: never include a postcode",
    });
  });

  it("parse prints parsePartial as JSON", () => {
    const r = run(["parse", "ek-01-a03-fk-01"]);
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual(parsePartial("ek-01-a03-fk-01"));
    expect(r.stdout).toContain('\n  "level": "building"');
  });

  it("fhir prints the extension with only the sub-extensions asked for", () => {
    const r = run(["fhir", FULL, "--level", "district"]);
    expect(r.exitCode).toBe(0);
    const extension = JSON.parse(r.stdout);
    expect(extension.url).toBe(EXTENSION_URL);
    expect(extension.extension).toHaveLength(2);
  });

  it("fhir rejects a date-only --checked-at and names checkedAt", () => {
    const r = run(["fhir", FULL, "--checked-at", "2026-10-06"]);
    expect(r.exitCode).toBe(1);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("checkedAt");
  });

  it("state names the state", () => {
    expect(run(["state", "FC 02 A09 DB 09"])).toEqual({ exitCode: 0, stdout: "FCT", stderr: "" });
  });

  it("state fails on a well-formed code with no known state", () => {
    const r = run(["state", "XX"]);
    expect(r.exitCode).toBe(1);
    expect(r.stdout).toBe("");
    expect(r.stderr).toBe("XX: unknown state code");
  });
});

describe("run: null results exit 1 with one line", () => {
  it("at on a coarser input names its display form and the level", () => {
    expect(run(["at", "EK 01 A03", "area"])).toEqual({
      exitCode: 1,
      stdout: "",
      stderr: "EK 01 A03: input is coarser than area",
    });
  });

  it("at on an input that does not parse", () => {
    expect(run(["at", "bad", "area"])).toEqual({ exitCode: 1, stdout: "", stderr: "not a valid NIPOST postcode" });
  });

  it.each([
    [["at", FULL, "street"], "street: unknown level"],
    [["mask", FULL, "street"], "street: unknown level"],
    [["fhir", FULL, "--level", "street"], "street: unknown level"],
    [["for", FULL, "marketing"], "marketing: unknown purpose"],
  ])("%j names the unknown level or purpose", (argv, message) => {
    expect(run(argv)).toEqual({ exitCode: 1, stdout: "", stderr: message });
  });

  it("no message carries a newline", () => {
    for (const argv of [["at", "EK 01 A03", "area"], ["for", FULL, "patient_message"], ["state", "bad"]]) {
      expect(run(argv).stderr).not.toContain("\n");
    }
  });
});

describe("run: bad option values exit 1 with the library's message", () => {
  it("--fill with two characters", () => {
    const r = run(["mask", FULL, "area", "--fill", "ab"]);
    expect(r.exitCode).toBe(1);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("fill");
  });

  it("--style that is not a style", () => {
    const r = run(["at", FULL, "district", "--style", "dots"]);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("style");
  });
});

describe("run: help, version and usage errors", () => {
  it.each([[[]], [["help"]], [["--help"]], [["at", "--help"]]])("%j prints usage on stdout", (argv) => {
    expect(run(argv)).toEqual({ exitCode: 0, stdout: USAGE, stderr: "" });
  });

  it("usage lists every command and option without a trailing newline or an em dash", () => {
    for (const word of ["parse", "at", "mask", "for", "fhir", "state", "help", "--version"]) {
      expect(USAGE).toContain(word);
    }
    for (const option of ["--style", "--fill", "--level", "--confidence", "--source", "--assigned", "--checked-at"]) {
      expect(USAGE).toContain(option);
    }
    expect(USAGE.endsWith("\n")).toBe(false);
    expect(USAGE).not.toContain(String.fromCharCode(0x2014));
  });

  it("--version prints the build version", () => {
    expect(run(["--version"])).toEqual({ exitCode: 0, stdout: "test", stderr: "" });
  });

  it.each([
    [["frobnicate"], "unknown command: frobnicate"],
    [["at", FULL, "district", "--colour", "red"], "unknown option: --colour"],
    [["at", FULL], "missing <level>"],
    [["at", FULL, "district", "--style"], "--style needs a value"],
    [["mask", FULL, "area", "--style", "--fill", "x"], "--style needs a value"],
    [["fhir", FULL, "--assigned", "yes"], "--assigned must be true or false"],
    [["at", FULL, "district", "extra"], "unexpected argument: extra"],
    [["at", FULL, "district", "--style", "hyphen", "--style", "compact"], "--style given twice"],
  ])("%j exits 2 with the reason and usage on stderr", (argv, reason) => {
    expect(run(argv)).toEqual({ exitCode: 2, stdout: "", stderr: reason + "\n\n" + USAGE });
  });
});
