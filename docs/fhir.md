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

Three invariants are enforced by the StructureDefinition and by `fromFhirExtension`: the code must be a valid hyphenated prefix (`ngpc-1`), its length must match `level` (`ngpc-2`), and `assigned` and `checkedAt` may only appear when `level` is `building` (`ngpc-3`), because they describe one building code.

The fields answer one question each, and none of them answers the others: a valid format says the characters form a postcode; `assigned` says NIPOST knows a building with that code; neither says the patient lives there now, nor that visiting or contacting them there is appropriate. Those last two are for the care team and the record around the address.

## Rules worth knowing

- `checkedAt` must be a full timestamp with an offset, such as `new Date().toISOString()`. A date alone, or an HTML `datetime-local` value such as `2026-10-06T09:00`, throws a `RangeError`.
- To share at a coarser level, use `coarsen(ref, "district")` for the reference or `coarsenFhirAddress(address, "district")` for the whole `Address`. Both drop `assigned` and `checkedAt` and set `source` to `derived`; `toFhirExtension(ref, { level: "district" })` does the same. See [../fhir/examples/Patient-district.json](../fhir/examples/Patient-district.json).
- `coarsenFhirAddress` handles one `Address`: it keeps `use`, `type`, `state` and `country` plus the cut extension, and drops `line`, `city`, `district`, `text`, `postalCode`, `period` and every other extension (a geolocation extension would otherwise carry coordinates). It does not touch the rest of the resource, so names, identifiers, narrative, linked resources and dates are still yours to handle.
- `fromFhirExtension` is strict about value types: a `valueString` where `level` needs a `valueCode` gives `null`. `fromReference` below is lenient about code spelling and accepts any style or case.
- `Address.postalCode`, when present, should hold the display form of the same code, so systems that ignore extensions still get something correct.

## Sharing a whole address

```ts
import { coarsenFhirAddress } from "health-postcode";

const home = {
  use: "home",
  line: ["12 Example Street"],
  city: "Ado Ekiti",
  state: "Ekiti",
  postalCode: "EK 01 A03 FK 01",
  country: "NG",
  extension: [ext], // the building-level extension from above
};
coarsenFhirAddress(home, "district");
// { use: "home", state: "Ekiti", country: "NG", extension: [{ url: EXTENSION_URL, extension: [
//   { url: "code", valueString: "EK-01-A03" }, { url: "level", valueCode: "district" },
//   { url: "confidence", valueCode: "high" }, { url: "source", valueCode: "derived" } ] }] }
```

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

Needs Java 11 or later. Add `-tx n/a` when offline. Expect no errors; warnings about draft and experimental status are fine. A clean run shows the artifacts conform to FHIR R4 as checked by the validator; it is not an HL7 or NIPOST endorsement, and it says nothing about whether any other system has adopted the extension.

```sh
curl -L -o validator_cli.jar https://github.com/hapifhir/org.hl7.fhir.core/releases/latest/download/validator_cli.jar
java -jar validator_cli.jar fhir/StructureDefinition-ng-digital-postcode.json -version 4.0.1
java -jar validator_cli.jar fhir/examples/Patient.json fhir/examples/Patient-district.json fhir/examples/Location.json fhir/examples/Organization.json -version 4.0.1 -ig fhir
```
