import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CODESYSTEM_URLS, EXTENSION_URL, SUB_EXTENSIONS, VALUESET_URLS, fromFhirExtension, toFhirExtension } from "./fhir";
import { HYPHEN_PARTIAL_REGEX, SEGMENTS } from "./segments";
import { format } from "./postcode";
import { stateName } from "./states";
import { CONFIDENCES, LEVELS, SOURCES } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const FHIR_DIR = new URL("../fhir/", import.meta.url);
const EXAMPLES_DIR = new URL("examples/", FHIR_DIR);

function jsonFiles(dir: URL): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

function load(dir: URL, name: string): Json {
  return JSON.parse(readFileSync(new URL(name, dir), "utf8"));
}

const ENUMS = { level: LEVELS, confidence: CONFIDENCES, source: SOURCES } as const;
const ENUM_NAMES = Object.keys(ENUMS) as (keyof typeof ENUMS)[];

describe("fhir/ files", () => {
  it("holds the seven definitions and four examples", () => {
    expect(jsonFiles(FHIR_DIR)).toEqual([
      "CodeSystem-ng-digital-postcode-confidence.json",
      "CodeSystem-ng-digital-postcode-level.json",
      "CodeSystem-ng-digital-postcode-source.json",
      "StructureDefinition-ng-digital-postcode.json",
      "ValueSet-ng-digital-postcode-confidence.json",
      "ValueSet-ng-digital-postcode-level.json",
      "ValueSet-ng-digital-postcode-source.json",
    ]);
    expect(jsonFiles(EXAMPLES_DIR)).toEqual(["Location.json", "Organization.json", "Patient-district.json", "Patient.json"]);
  });

  it("parses every file and each has a resourceType", () => {
    const all = [
      ...jsonFiles(FHIR_DIR).map((name) => load(FHIR_DIR, name)),
      ...jsonFiles(EXAMPLES_DIR).map((name) => load(EXAMPLES_DIR, name)),
    ];
    expect(all).toHaveLength(11);
    for (const resource of all) {
      expect(typeof resource.resourceType).toBe("string");
    }
  });
});

describe("StructureDefinition", () => {
  const sd = load(FHIR_DIR, "StructureDefinition-ng-digital-postcode.json");
  const elements: Json[] = sd.differential.element;
  const byId = (id: string): Json => elements.find((e) => e.id === id);

  it("defines an Address extension at EXTENSION_URL", () => {
    expect(sd.url).toBe(EXTENSION_URL);
    expect(sd.type).toBe("Extension");
    expect(sd.kind).toBe("complex-type");
    expect(sd.derivation).toBe("constraint");
    expect(sd.fhirVersion).toBe("4.0.1");
    expect(sd.context[0].expression).toBe("Address");
    expect(byId("Extension.url").fixedUri).toBe(EXTENSION_URL);
    expect(byId("Extension.value[x]").max).toBe("0");
  });

  it("slices exactly the SUB_EXTENSIONS names", () => {
    const sliceNames = elements.filter((e) => e.sliceName !== undefined).map((e) => e.sliceName);
    expect(new Set(sliceNames)).toEqual(new Set(Object.keys(SUB_EXTENSIONS)));
    expect(sliceNames).toHaveLength(Object.keys(SUB_EXTENSIONS).length);
  });

  it.each(Object.entries(SUB_EXTENSIONS))("fixes the url and value type of %s", (name, type) => {
    expect(byId(`Extension.extension:${name}.url`).fixedUri).toBe(name);
    const value = byId(`Extension.extension:${name}.value[x]`);
    expect(value.type).toHaveLength(1);
    expect(value.type[0].code).toBe(type);
  });

  it("requires code and level and leaves the rest optional", () => {
    for (const name of Object.keys(SUB_EXTENSIONS)) {
      const expected = name === "code" || name === "level" ? 1 : 0;
      expect(byId(`Extension.extension:${name}`).min).toBe(expected);
      expect(byId(`Extension.extension:${name}`).max).toBe("1");
    }
  });

  it("carries the partial-code regex in invariant ngpc-1", () => {
    const constraint = byId("Extension.extension:code.value[x]").constraint.find((c: Json) => c.key === "ngpc-1");
    expect(constraint.severity).toBe("error");
    expect(constraint.expression).toContain(HYPHEN_PARTIAL_REGEX.source);
  });

  it.each(ENUM_NAMES)("binds %s to its ValueSet as required", (name) => {
    const binding = byId(`Extension.extension:${name}.value[x]`).binding;
    expect(binding).toEqual({ strength: "required", valueSet: VALUESET_URLS[name] });
  });
});

describe.each(ENUM_NAMES)("%s terminology", (name) => {
  const cs = load(FHIR_DIR, `CodeSystem-ng-digital-postcode-${name}.json`);
  const vs = load(FHIR_DIR, `ValueSet-ng-digital-postcode-${name}.json`);

  it("CodeSystem concepts equal the TS tuple in order", () => {
    expect(cs.resourceType).toBe("CodeSystem");
    expect(cs.url).toBe(CODESYSTEM_URLS[name]);
    expect(cs.concept.map((c: Json) => c.code)).toEqual([...ENUMS[name]]);
    expect(cs.count).toBe(cs.concept.length);
    expect(cs.valueSet).toBe(VALUESET_URLS[name]);
    expect(cs.content).toBe("complete");
  });

  it("ValueSet includes the whole CodeSystem", () => {
    expect(vs.resourceType).toBe("ValueSet");
    expect(vs.url).toBe(VALUESET_URLS[name]);
    expect(vs.compose.include).toHaveLength(1);
    expect(vs.compose.include[0].system).toBe(CODESYSTEM_URLS[name]);
  });
});

describe.each(jsonFiles(EXAMPLES_DIR))("example %s", (file) => {
  const resource = load(EXAMPLES_DIR, file);
  const addresses: Json[] = Array.isArray(resource.address) ? resource.address : [resource.address];

  it("has at least one address", () => {
    expect(addresses.length).toBeGreaterThan(0);
    expect(addresses[0]).toBeDefined();
  });

  it("round-trips each address extension and agrees with postalCode and state", () => {
    for (const address of addresses) {
      expect(address.country).toBe("NG");
      const exts = (address.extension ?? []).filter((e: Json) => e.url === EXTENSION_URL);
      expect(exts).toHaveLength(1);
      const ext = exts[0];
      const ref = fromFhirExtension(ext);
      expect(ref).not.toBeNull();
      expect(toFhirExtension(ref!)).toStrictEqual(ext);
      if (address.postalCode !== undefined) {
        expect(format(address.postalCode, "display")).toBe(address.postalCode);
        expect(format(address.postalCode, "hyphen")).toBe(ref!.code);
        expect(ref!.level).toBe("building");
        expect(address.state).toBe(stateName(ref!.code));
      }
    }
  });
});

describe("Patient-district.json", () => {
  const resource = load(EXAMPLES_DIR, "Patient-district.json");

  it("is the de-identified copy: no name, no postalCode, no state", () => {
    expect(resource.name).toBeUndefined();
    expect(resource.identifier).toBeUndefined();
    for (const address of resource.address) {
      expect(address.postalCode).toBeUndefined();
      expect(address.state).toBeUndefined();
    }
  });

  it("carries the district prefix of the building-level patient", () => {
    const full = fromFhirExtension(load(EXAMPLES_DIR, "Patient.json").address[0].extension[0]);
    const district = fromFhirExtension(resource.address[0].extension[0]);
    expect(district).toStrictEqual({ code: "FC-02-A09", level: "district", source: "derived" });
    expect(full?.code.startsWith(district!.code + "-")).toBe(true);
  });
});

describe("ngpc-2 ties level to the length of code", () => {
  const sd = JSON.parse(readFileSync(new URL("StructureDefinition-ng-digital-postcode.json", FHIR_DIR), "utf8"));
  const root = sd.differential.element.find((e: { id: string }) => e.id === "Extension");
  const constraint = root.constraint.find((c: { key: string }) => c.key === "ngpc-2");

  it("is an error-severity constraint on the root element", () => {
    expect(constraint.severity).toBe("error");
  });

  it("pairs every level with its hyphenated length from SEGMENTS", () => {
    let length = 0;
    SEGMENTS.forEach((segment, i) => {
      length += segment.length + (i > 0 ? 1 : 0);
      expect(constraint.expression).toContain(
        `(extension.where(url='code').value.length() = ${length} and extension.where(url='level').value = '${segment.level}')`,
      );
    });
  });
});
