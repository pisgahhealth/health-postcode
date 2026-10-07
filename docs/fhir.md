# FHIR R4

The package stores a postcode as a complex extension on `Address`, so every system writes the code the same way and says how precise it is. The short version is in the [README](../README.md).

## The extension

```ts
import { toFhirExtension, fromFhirExtension, EXTENSION_URL } from "health-postcode";

const ext = toFhirExtension("EK 01 A03 FK 01", {
  confidence: "high",
  assigned: true,
  checkedAt: "2026-10-06T09:00:00Z",
  source: "lookup",
});
ext?.url === EXTENSION_URL; // true
fromFhirExtension(ext);
// { code: "EK-01-A03-FK-01", level: "building", confidence: "high", assigned: true, checked_at: "2026-10-06T09:00:00Z", source: "lookup" }
```

`ext` is this, ready to go in `Address.extension`:

```json
{
  "url": "https://pisgahhealth.com/fhir/StructureDefinition/ng-digital-postcode",
  "extension": [
    { "url": "code", "valueString": "EK-01-A03-FK-01" },
    { "url": "level", "valueCode": "building" },
    { "url": "confidence", "valueCode": "high" },
    { "url": "assigned", "valueBoolean": true },
    { "url": "checkedAt", "valueDateTime": "2026-10-06T09:00:00Z" },
    { "url": "source", "valueCode": "lookup" }
  ]
}
```

| Field | Type | Values |
|---|---|---|
| `code` | string, required | hyphenated upper-case code, cut to `level` |
| `level` | code, required | `state`, `lga`, `district`, `area`, `building` |
| `confidence` | code | `high`, `medium`, `low` |
| `assigned` | boolean | NIPOST reported the building code as assigned; absent when not checked |
| `checkedAt` | dateTime | when `assigned` was read from NIPOST |
| `source` | code | `lookup`, `self-reported`, `derived` |

Two invariants are enforced by the StructureDefinition and by `fromFhirExtension`: the code must be a valid hyphenated prefix, and its length must match `level`, so an extension cannot say district while carrying a building.

## Rules worth knowing

- `checkedAt` must be a full timestamp with an offset, such as `new Date().toISOString()`. A date alone, or an HTML `datetime-local` value such as `2026-10-06T09:00`, throws a `RangeError`.
- When you truncate the extension for export, for example with `{ level: "district" }`, also drop or truncate `Address.postalCode` in the same step, or the full code travels beside the short one.
- For an export copy, build the extension fresh from the code, `toFhirExtension(ref.code, { level: "district", source: "derived" })`, so `assigned` and `checkedAt` stay with the full record. See [../fhir/examples/Patient-district.json](../fhir/examples/Patient-district.json).
- `fromFhirExtension` is strict about value types: a `valueString` where `level` needs a `valueCode` gives `null`. `fromReference` below is lenient about code spelling and accepts any style or case.
- `Address.postalCode`, when present, should hold the display form of the same code, so systems that ignore extensions still get something correct.

## What ships in `fhir/`

The [fhir/](../fhir/) folder is in the npm package, so `health-postcode/fhir/StructureDefinition-ng-digital-postcode.json` resolves from `node_modules`. It holds the StructureDefinition, a CodeSystem and a ValueSet each for level, confidence and source, and four examples: a Patient at building level, its de-identified district copy, a Location (a clinic) and an Organization (a pharmacy). This is a draft Pisgah Labs extension, not an HL7 or NIPOST artifact.

## Plain JSON for agents and APIs

`toReference` and `fromReference` use the postcode-reference shape from Kayode Adeniyi's [schema](https://adeniyikayodee.github.io/ng-postcode/schemas/postcode-reference.schema.json), plus an optional `source`, so a FHIR record and an agent message carry the same fields. Note `checked_at` in this shape and `checkedAt` in options and in FHIR.

```ts
import { toReference, fromReference } from "health-postcode";

toReference("EK 01 A03 FK 01", { level: "district", source: "derived" });
// { code: "EK-01-A03", level: "district", source: "derived" }
fromReference({ code: "ek 01 a03", level: "district" });
// { code: "EK-01-A03", level: "district" }
```

## Validating with the HL7 validator

Needs Java 11 or later. Add `-tx n/a` when offline. Expect no errors; warnings about draft and experimental status are fine.

```sh
curl -L -o validator_cli.jar https://github.com/hapifhir/org.hl7.fhir.core/releases/latest/download/validator_cli.jar
java -jar validator_cli.jar fhir/StructureDefinition-ng-digital-postcode.json -version 4.0.1
java -jar validator_cli.jar fhir/examples/Patient.json fhir/examples/Patient-district.json fhir/examples/Location.json fhir/examples/Organization.json -version 4.0.1 -ig fhir
```
