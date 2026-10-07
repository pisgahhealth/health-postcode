# Who sees what

These are the default ceilings in `PURPOSES`, one per purpose. A ceiling is the finest level a purpose may receive; `forPurpose` passes coarser input through unchanged and returns `null` for `patient_message`, an unknown purpose or an unusable code.

| Purpose | Level | Why |
|---|---|---|
| analytics | district | Dashboards count by neighbourhood; a district holds many hundreds of buildings, which lowers the chance that one row points at one household. |
| ai | district | A model or prompt that needs place context gets a district, not an address it could echo back. Many AI tasks need no location at all; district is a ceiling, not a default input. |
| outbreak_signal | area | Cluster detection needs street scale; an area is at most 99 building codes, still not one door. |
| chw_planning | area | Community health workers plan rounds by patch; the exact door is given at visit time, not in the plan. |
| home_visit | building | The nurse at the door needs the full code. This is the only purpose that gets it; the caller decides who asks, checks the visit is appropriate, and logs the release. |
| research_export | lga | Datasets leave the organisation; LGA plus small-count suppression is the floor the library can offer, not a guarantee of anonymity. |
| patient_message | never | SMS and WhatsApp are not secure channels, and a code is a building, not a person; never echo it back. |

## What the library does and does not enforce

`forPurpose` chooses a precision. It does not authenticate the caller, establish that the purpose is real, check that a visit is assigned, enforce a time window, or write an audit event. Those belong to the application that calls it, and so does the decision to override a ceiling. Cutting a code to district and dropping cells under five are disclosure-control rules; a rare diagnosis, a date, or a free-text field beside the code can still identify someone, and an area with at most 99 building codes says nothing about how many people live there.

## Overrides

Pass a partial table as `purposes` and it is merged over the defaults, for example `forPurpose(code, "analytics", { purposes: { analytics: "lga" } })` gives `"EK 01"` for `EK 01 A03 FK 01`. The library allows tightening and loosening alike and logs neither, so tighten rather than loosen, keep your table in code where it is reviewed, and treat any loosening as a decision someone signs.

## Small counts

`suppressSmallCounts(rows, { count, min })` returns only the rows whose count is at or above `min` (default 5); it adds no "other" row and says nothing about what it dropped, so serialising its result discloses nothing. `suppressionReport(rows, { count, min })` gives the kept and dropped counts for logs and review; keep it out of the export. Neither does complementary suppression, so a dropped cell can still be recovered by subtracting the kept rows from a total published elsewhere. Compute every published total from the kept rows only.

## Storage

Keep the full code once, encrypted like the written address. Derive shorter forms when you read, with `at` or `forPurpose`, instead of storing a copy at each level. Index the district prefix, `at(code, "district")`, for reports. When you share a record at a coarser level, use `coarsenFhirAddress(address, level)` so the extension, `postalCode`, address lines, city and other extensions are handled in one step; cutting the extension alone leaves the full code beside it.
