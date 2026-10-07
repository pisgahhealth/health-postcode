# API

Everything the package exports, with the rules that are easy to miss. The short version is in the [README](../README.md).

## Input rules

Three spellings are accepted: display `EK 01 A03 FK 01`, hyphen `EK-01-A03-FK-01` and compact `EK01A03FK01`. Input is trimmed and upper-cased, then each gap between segments may hold nothing, one space or one hyphen, mixed freely, so `" ek-01 a03-fk 01 "` parses. Anything else is rejected: a double space, a tab or an underscore between segments, and `00` in either numeric segment (both run 01 to 99). Non-ASCII input is rejected before upper-casing, so a `ß` or a dotless `ı` never passes as `SS` or `I`.

The segments are state (two letters), lga (two digits), district (three letters or digits), area (two letters) and building (two digits). NIPOST calls the last one the building unit and the `ng-postcode` package calls it `unit`; here it is `building`.

## Null versus throw

`null` means the postcode could not be used: malformed, coarser than the level asked for, or an unknown level or purpose. A thrown `RangeError` or `TypeError` means your options were wrong (a bad `fill`, a bad `checkedAt`, a bad `min`).

## Parsing and cutting

```ts
import { parse, parsePartial, isValidFormat, format, levelOf, at, mask, stateName } from "health-postcode";

parse("EK  01 A03 FK 01");                           // null: double space
parsePartial("EK 01 A03")?.level;                    // "district"
isValidFormat("EK01A03FK01");                        // true
levelOf("EK01A03FK");                                // "area"
format("ek01a03fk01", "hyphen");                     // "EK-01-A03-FK-01"
at("EK 01 A03 FK 01", "area", { style: "compact" }); // "EK01A03FK"
at("EK 01 A03", "area");                             // null: the input is coarser than area
mask("EK 01 A03 FK 01", "district", { fill: "*" });  // "EK 01 A03 ** **"
stateName("EK 01 A03 FK 01");                        // "Ekiti"
```

- `parse` takes full codes only and returns `{ state, lga, district, area, building, compact, display, hyphen }`. `parsePartial` also takes the prefixes the ladder produces and adds `level`.
- `at` returns `null` when the input is coarser than the level you ask for. `mask` and `forPurpose` clamp instead and show what the input has.
- `mask` keeps all five segments so columns line up. The default fill is the middle dot `·`, which some terminals and SMS gateways mangle; pass `{ fill: "*" }` for plain ASCII. A digit fill is refused because `FK 11` would read as another building.
- `stateName` returns the ISO 3166-2:NG name for the first two letters. NIPOST has not published its own list of state codes, but all 11 state codes in its 21 published test postcodes match ISO 3166-2:NG. The name is a display hint; the code is the fact.
- `LEVELS`, `CONFIDENCES`, `SOURCES`, `STATE_NAMES`, `STATE_CODES_SEEN`, `COMPACT_REGEX`, `HYPHEN_REGEX_BY_LEVEL` and `HYPHEN_PARTIAL_REGEX` are exported for anyone who needs the vocabulary or the patterns.

## Policy

```ts
import { PURPOSES, forPurpose, suppressSmallCounts } from "health-postcode";

PURPOSES; // { analytics: "district", ai: "district", outbreak_signal: "area", chw_planning: "area", home_visit: "building", research_export: "lga", patient_message: null }

forPurpose("EK 01", "analytics");                                                // "EK 01": a ceiling, not a target
forPurpose("EK 01 A03 FK 01", "analytics", { purposes: { analytics: "lga" } }); // "EK 01"
forPurpose("EK 01 A03 FK 01", "marketing" as never);                            // null: unknown purpose

const rows = [
  { district: "EK 01 A03", visits: 12 },
  { district: "EK 01 A04", visits: 3 },
  { district: "EK 01 A05", visits: 5 },
];
const { kept, suppressed } = suppressSmallCounts(rows, { count: "visits" });
kept.map((row) => row.district); // ["EK 01 A03", "EK 01 A05"]
suppressed;                      // { rows: 1, total: 3 }
```

Pass `purposes` to override rows; tighten rather than loosen, and keep your table in code where it gets reviewed. `suppressSmallCounts` drops rows with a count below `min` (default 5) rather than folding them into an "other" row, and `kept` holds the same objects in the same order. Compute every published total from `kept` only. The reason behind each purpose is in [policy.md](policy.md).

## Checking a code against NIPOST

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

This package makes no network calls. `verify` calls your lookup once with the compact code, returns `null` without calling it when the input is malformed or partial, and lets the lookup's errors through. Return `checkedAt` too if your source gives one, as a full timestamp with an offset, or `verify` throws a `RangeError`; otherwise it uses the current time. The adapter was checked against `ng-postcode` 0.1.1, where `createPostcodeClient` takes `{ baseUrl, apiKey, fetch }`, `lookup(code, level)` resolves to the response's `data`, and `valid` is the field read here as assigned. Its mock answers `valid: true` for any well-formed code, so confirm the field against the version you install.

## Command line

```sh
npx health-postcode parse "EK 01 A03 FK 01"                 # the parsed code as JSON
npx health-postcode at "EK 01 A03 FK 01" district           # EK 01 A03
npx health-postcode mask "EK 01 A03 FK 01" area --fill x    # EK 01 A03 FK xx
npx health-postcode for "EK 01 A03 FK 01" analytics         # EK 01 A03
npx health-postcode fhir "EK 01 A03 FK 01" --level district # the extension as JSON
npx health-postcode state EK                                # Ekiti
```

`--style display|hyphen|compact` works on `at`, `mask` and `for`. `fhir` also takes `--confidence`, `--source`, `--assigned true|false` and `--checked-at <timestamp>`. A null result prints one line to stderr and exits 1, bad options print the error and exit 1, and an unknown command or option prints usage and exits 2.

## Checking the state table

From a clone, with a NIPOST API key: `NIPOST_API_KEY=... NIPOST_STATES_URL=... node scripts/check-states.mjs` diffs `STATE_NAMES` against NIPOST's list-states endpoint and exits 1 on any difference. The script is not part of the published package.
