# health-postcode

Nigeria's NIPOST digital postcode, made safe for health records.

A NIPOST postcode such as `EK 01 A03 FK 01` names one building, not a person, and cutting it short zooms out: `EK 01 A03` is a district and `EK 01` a local government area. This package parses the code, zooms it to a named level, applies a who-sees-what policy for each purpose, and stores it in a FHIR R4 `Address` extension the same way in every system. Zero runtime dependencies, ESM and CommonJS, Node 18 or later, with an OpenMRS address template and a small command line.

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

| Level | Cut of `EK 01 A03 FK 01` | What it names | Rough size |
|---|---|---|---|
| `state` | `EK` | the state, or the FCT (two letters) | a whole state |
| `lga` | `EK 01` | a local government area (two digits) | one LGA |
| `district` | `EK 01 A03` | a district (three letters or digits) | many hundreds of buildings |
| `area` | `EK 01 A03 FK` | an area (two letters) | at most 99 buildings |
| `building` | `EK 01 A03 FK 01` | one building, NIPOST's building unit (two digits) | one building |

Three input styles are accepted: display `EK 01 A03 FK 01`, hyphen `EK-01-A03-FK-01` and compact `EK01A03FK01`. Input is trimmed and upper-cased, then each gap between segments may hold nothing, one space or one hyphen, mixed freely, so `" ek-01 a03-fk 01 "` parses. Anything else is rejected, including a double space, a tab or an underscore between segments, and `00` in either numeric segment (both run 01 to 99). Non-ASCII input is rejected before upper-casing, so a `ß` or a dotless `ı` never passes as `SS` or `I`.

```ts
import { parse, parsePartial, format, levelOf, at, mask, stateName } from "health-postcode";

parse("EK  01 A03 FK 01");                          // null: double space
parsePartial("EK 01 A03")?.level;                   // "district"
levelOf("EK01A03FK");                               // "area"
format("ek01a03fk01", "hyphen");                    // "EK-01-A03-FK-01"
at("EK 01 A03 FK 01", "area", { style: "compact" }); // "EK01A03FK"
at("EK 01 A03", "area");                            // null: the input is coarser than area
mask("EK 01 A03 FK 01", "district", { fill: "*" }); // "EK 01 A03 ** **"
stateName("EK 01 A03 FK 01");                       // "Ekiti"
```

`parse` takes full codes only; `parsePartial` also takes the prefixes the ladder produces. `at` returns `null` when the input is coarser than the level you ask for, while `mask` and `forPurpose` clamp and show what the input has. `mask` fills hidden segments with the middle dot `·` by default, which some terminals and SMS gateways mangle, so pass `{ fill: "*" }` for plain ASCII. A digit fill is refused, because `FK 11` would read as another building.

`stateName` returns the ISO 3166-2:NG name for the first two letters, and that name is a display hint only: NIPOST has not published its own list of state codes, but all 11 state codes in its 21 published test postcodes match ISO 3166-2:NG. Store the code; never treat the name as a fact of record.

## Command line

```sh
npx health-postcode at "EK 01 A03 FK 01" district           # EK 01 A03
npx health-postcode mask "EK 01 A03 FK 01" area --fill x    # EK 01 A03 FK xx
npx health-postcode for "EK 01 A03 FK 01" analytics         # EK 01 A03
npx health-postcode fhir "EK 01 A03 FK 01" --level district # the extension as JSON, code and level only
npx health-postcode state EK                                # Ekiti
```

`parse <code>` prints the parsed code as JSON, `--style display|hyphen|compact` works on `at`, `mask` and `for`, and `fhir` also takes `--confidence`, `--source`, `--assigned true|false` and `--checked-at <timestamp>`. A null result prints one line to stderr and exits 1, bad options print the error and exit 1, and an unknown command or option prints usage and exits 2.

## Who sees what

| Purpose | Ceiling | `EK 01 A03 FK 01` becomes |
|---|---|---|
| `analytics` | district | `EK 01 A03` |
| `ai` | district | `EK 01 A03` |
| `outbreak_signal` | area | `EK 01 A03 FK` |
| `chw_planning` | area | `EK 01 A03 FK` |
| `home_visit` | building | `EK 01 A03 FK 01` |
| `research_export` | lga | `EK 01` |
| `patient_message` | never | `null` |

The reason for each row is in [docs/policy.md](docs/policy.md). A ceiling is not a target, so `forPurpose("EK 01", "analytics")` returns `"EK 01"`, and an unknown purpose returns `null`. Pass `purposes` to override rows; tighten rather than loosen, and keep your table in code where it gets reviewed.

```ts
import { forPurpose, suppressSmallCounts } from "health-postcode";

forPurpose("EK 01 A03 FK 01", "analytics", { purposes: { analytics: "lga" } }); // "EK 01"

const rows = [
  { district: "EK 01 A03", visits: 12 },
  { district: "EK 01 A04", visits: 3 },
  { district: "EK 01 A05", visits: 5 },
];
const { kept, suppressed } = suppressSmallCounts(rows, { count: "visits" });
kept.map((row) => row.district); // ["EK 01 A03", "EK 01 A05"]
suppressed;                      // { rows: 1, total: 3 }
```

Rows with a count below `min` (default 5) are dropped, not folded into an "other" row, and `kept` holds the same objects in the same order. Compute every published total from `kept` only.

## FHIR R4

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

Only `code` and `level` are required. The [fhir/](fhir/) folder holds the StructureDefinition, a CodeSystem and ValueSet each for level, confidence and source, and four examples (a Patient, its de-identified district copy, a Location and an Organization); they ship in the package, so `health-postcode/fhir/StructureDefinition-ng-digital-postcode.json` resolves from `node_modules`. This is a draft Pisgah Labs extension, not an HL7 or NIPOST artifact.

- `checkedAt` must be a full timestamp with an offset, such as `new Date().toISOString()`; a date alone, or an HTML `datetime-local` value such as `2026-10-06T09:00`, throws a `RangeError`.
- When you truncate the extension for export, for example with `{ level: "district" }`, also drop or truncate `Address.postalCode` in the same step, or the full code travels beside the short one.
- For an export copy, build the extension fresh from the code, `toFhirExtension(ref.code, { level: "district", source: "derived" })`, so `assigned` and `checkedAt` stay with the full record, as in [fhir/examples/Patient-district.json](fhir/examples/Patient-district.json).
- `fromFhirExtension` is strict about value types (a `valueString` where `level` needs a `valueCode` gives `null`), while `fromReference` is lenient about code spelling and accepts any style or case.

For agents and APIs that want plain JSON, `toReference` and `fromReference` use the postcode-reference shape from Kayode Adeniyi's [schema](https://adeniyikayodee.github.io/ng-postcode/schemas/postcode-reference.schema.json), plus an optional `source`. Note `checked_at` in this shape and `checkedAt` in options and in FHIR.

```ts
import { toReference, fromReference } from "health-postcode";

toReference("EK 01 A03 FK 01", { level: "district", source: "derived" });
// { code: "EK-01-A03", level: "district", source: "derived" }
fromReference({ code: "ek 01 a03", level: "district" });
// { code: "EK-01-A03", level: "district" }
```

NIPOST calls the last segment the building unit and the ng-postcode package calls it `unit`; here it is `building`, the same two digits.

## Checking a code with NIPOST

```ts
import { createPostcodeClient } from "ng-postcode";
import { verify } from "health-postcode";

const api = createPostcodeClient({ apiKey: process.env.NIPOST_API_KEY });
const ref = await verify("EK 01 A03 FK 01", async (code) => {
  const r = await api.lookup(code, 1);
  return { assigned: r.valid === true };
});
// { code: "EK-01-A03-FK-01", level: "building", assigned: true, checked_at: "2026-...Z", source: "lookup" }
```

This package makes no network calls. `verify` calls your lookup once with the compact code, returns `null` without calling it when the input is malformed or partial, and lets the lookup's errors through; return `checkedAt` too if your source gives one, as a full timestamp with an offset or `verify` throws a `RangeError`, otherwise it uses the current time. The adapter was checked against ng-postcode 0.1.1, where `createPostcodeClient` takes `{ baseUrl, apiKey, fetch }`, `lookup(code, level)` resolves to the response's `data`, and `valid` is the field read here as assigned; its mock answers `valid: true` for any well-formed code, so confirm the field against the version you install before you trust the result.

## OpenMRS

[openmrs/address-template.xml](openmrs/address-template.xml) is an address template that labels `postalCode` as the NIPOST digital postcode and checks its format with a regex. [openmrs/README.md](openmrs/README.md) says where to paste it and what it does not do.

## Optional checks

Validate the FHIR artifacts with the HL7 validator (Java 11 or later; add `-tx n/a` when offline). Expect no errors; warnings about draft and experimental status are fine.

```sh
curl -L -o validator_cli.jar https://github.com/hapifhir/org.hl7.fhir.core/releases/latest/download/validator_cli.jar
java -jar validator_cli.jar fhir/StructureDefinition-ng-digital-postcode.json -version 4.0.1
java -jar validator_cli.jar fhir/examples/Patient.json fhir/examples/Patient-district.json fhir/examples/Location.json fhir/examples/Organization.json -version 4.0.1 -ig fhir
```

Checking the state table: from a clone, `NIPOST_API_KEY=... NIPOST_STATES_URL=... node scripts/check-states.mjs` diffs `STATE_NAMES` against NIPOST's list-states endpoint and exits 1 on any difference.

## What this is not

- Not a NIPOST client: no network calls; `verify` takes a lookup you supply.
- No LGA or district names; state names only, as a display hint.
- No checksum, because NIPOST's format has none, so a well-formed code may not exist.
- No geocoding and no coordinates.
- Not an official NIPOST or HL7 artifact, and not endorsed by either.
- FHIR R4 only.

`null` means the postcode could not be used (malformed, coarser than asked, or an unknown level or purpose), and a thrown `RangeError` or `TypeError` means your options were wrong.

## Contributing

Issues and pull requests are welcome at [github.com/pisgahhealth/health-postcode](https://github.com/pisgahhealth/health-postcode). Use npm and run `npm run typecheck && npm run lint && npm test`; tests are vitest files next to the source, linting is ESLint with no Prettier, the style is double quotes, semicolons, trailing commas and two-space indent, and there are no runtime dependencies.

## Licence

MIT, Copyright (c) 2026 Pisgah Labs. See [LICENSE](LICENSE).
