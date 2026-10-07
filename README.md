# health-postcode

Nigeria's NIPOST digital postcode, made safe for health records.

A code such as `EK 01 A03 FK 01` names one building, not a person. Cut it short and it zooms out: `EK 01 A03` is a district, `EK 01` a local government area. This package parses the code, cuts it to a named level, applies a who-sees-what policy, and stores it as a FHIR R4 `Address` extension the same way in every system. Zero dependencies, ESM and CommonJS, Node 18 or later.

## Install

```sh
npm install health-postcode
```

## 30-second example

```ts
import { parse, at, mask, forPurpose } from "health-postcode";

parse("ek-01-a03-fk-01")?.display;   // "EK 01 A03 FK 01"
at("EK 01 A03 FK 01", "district");   // "EK 01 A03"
mask("EK 01 A03 FK 01", "area");     // "EK 01 A03 FK ··"
forPurpose("EK 01 A03 FK 01", "analytics");       // "EK 01 A03"
forPurpose("EK 01 A03 FK 01", "patient_message"); // null
```

## The ladder

| Level | Cut of `EK 01 A03 FK 01` | Rough size |
|---|---|---|
| `state` | `EK` | a whole state |
| `lga` | `EK 01` | one local government area |
| `district` | `EK 01 A03` | many hundreds of buildings |
| `area` | `EK 01 A03 FK` | at most 99 buildings |
| `building` | `EK 01 A03 FK 01` | one building |

Display, hyphen and compact spellings are all accepted (`EK 01 A03 FK 01`, `EK-01-A03-FK-01`, `EK01A03FK01`), in any case.

## Who sees what

| Purpose | Gets | Example |
|---|---|---|
| `analytics`, `ai` | district | `EK 01 A03` |
| `outbreak_signal`, `chw_planning` | area | `EK 01 A03 FK` |
| `home_visit` | building | `EK 01 A03 FK 01` |
| `research_export` | lga | `EK 01` |
| `patient_message` | nothing | `null` |

The reasons are in [docs/policy.md](docs/policy.md). Override rows with `forPurpose(code, purpose, { purposes: { analytics: "lga" } })`.

## FHIR R4

```ts
import { toFhirExtension, fromFhirExtension } from "health-postcode";

const ext = toFhirExtension("EK 01 A03 FK 01", { assigned: true, checkedAt: "2026-10-06T09:00:00Z" });
fromFhirExtension(ext); // { code: "EK-01-A03-FK-01", level: "building", assigned: true, checked_at: "..." }
```

The extension, its StructureDefinition, CodeSystems, ValueSets and examples are described in [docs/fhir.md](docs/fhir.md). An OpenMRS address template is in [openmrs/](openmrs/).

## Command line

```sh
npx health-postcode at "EK 01 A03 FK 01" district   # EK 01 A03
npx health-postcode for "EK 01 A03 FK 01" analytics # EK 01 A03
npx health-postcode state EK                        # Ekiti
```

## More

- [docs/api.md](docs/api.md): every function, input rules, null versus throw, checking a code against NIPOST, the full CLI.
- [docs/fhir.md](docs/fhir.md): the extension in detail, the plain JSON reference shape, validating with the HL7 validator.
- [docs/policy.md](docs/policy.md): why each purpose gets the level it gets.

## What this is not

Not a NIPOST client (no network calls), no LGA or district names, no checksum (NIPOST's format has none), no geocoding, FHIR R4 only, and not an official NIPOST or HL7 artifact.

## Contributing and licence

Issues and pull requests at [github.com/pisgahhealth/health-postcode](https://github.com/pisgahhealth/health-postcode). Run `npm run typecheck && npm run lint && npm test`. MIT, Copyright (c) 2026 Pisgah Labs.
