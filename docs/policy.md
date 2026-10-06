# Who sees what

These are the default ceilings in `PURPOSES`, one per purpose. A ceiling is the finest level a purpose may receive; `forPurpose` passes coarser input through unchanged and returns `null` for `patient_message`, an unknown purpose or an unusable code.

| Purpose | Level | Why |
|---|---|---|
| analytics | district | Dashboards count by neighbourhood; a district holds many hundreds of buildings, so no household is identifiable. |
| ai | district | A model or prompt gets place context without an address it could echo back. |
| outbreak_signal | area | Cluster detection needs street scale; an area is at most 99 buildings, still not one door. |
| chw_planning | area | Community health workers plan rounds by patch; the exact door is given at visit time, not in the plan. |
| home_visit | building | The nurse at the door needs the full code; this is the only purpose that gets it, and the caller logs the release. |
| research_export | lga | Datasets leave the organisation; LGA plus small-count suppression is the floor for re-identification risk. |
| patient_message | never | SMS and WhatsApp are not secure channels, and a code is a building, not a person; never echo it back. |

## Overrides

Pass a partial table as `purposes` and it is merged over the defaults, for example `forPurpose(code, "analytics", { purposes: { analytics: "lga" } })` gives `"EK 01"` for `EK 01 A03 FK 01`. The library allows tightening and loosening alike and logs neither, so tighten rather than loosen, keep your table in code where it is reviewed, and treat any loosening as a decision someone signs.

## Small counts

`suppressSmallCounts(rows, { count, min })` drops every row whose count is below `min` (default 5) and reports what it dropped as `suppressed: { rows, total }`; it adds no "other" row. It does no complementary suppression, so a dropped cell can still be recovered by subtracting the kept rows from a total published elsewhere. Compute every published total from `kept` only.

## Storage

Keep the full code once, encrypted like the written address. Derive shorter forms when you read, with `at` or `forPurpose`, instead of storing a copy at each level. Index the district prefix, `at(code, "district")`, for reports. When you truncate the extension for export, also drop or truncate `Address.postalCode` in the same step, or the full code leaks beside the short one.
