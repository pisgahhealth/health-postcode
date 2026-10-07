# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-10-07

Three behaviours changed after an outside review. All three are breaking for code that relied on the old shape.

### Changed

- `verify` now throws a `TypeError` when the lookup resolves without a boolean `assigned`, instead of recording `assigned: false` with a fresh timestamp. A malformed adapter response is a failed check, not a negative one.
- `assigned` and `checked_at` are only valid at building level. `toReference` and `toFhirExtension` throw a `RangeError` when they are given with a coarser level; `fromReference` and `fromFhirExtension` return `null` for a coarser reference that carries them; the StructureDefinition gains invariant `ngpc-3` saying the same.
- `toFhirExtension(reference, { level })` with a coarser level now coarsens: it drops `assigned` and `checkedAt` and sets `source` to `derived`, instead of shortening the code under an unchanged check.
- `suppressSmallCounts` returns only the rows safe to export, as an array. The counts of what it dropped moved to `suppressionReport`, so serialising the export cannot disclose a hidden total.

### Added

- `coarsen(reference, level)`: the explicit way to cut a checked reference to a coarser level.
- `coarsenFhirAddress(address, level)`: the share copy of one FHIR `Address` at a coarser level, keeping `use`, `type`, `state` and `country` and the cut extension, dropping lines, city, district, text, `postalCode`, `period` and every other extension.
- `suppressionReport(rows, options)`: kept rows, suppressed rows and suppressed total, for logs and review.
- `FhirAddress` and `SuppressionReport` types.

### Removed

- The `SuppressResult` type.

## [0.1.0] - 2026-10-06

### Added

- `parse`, `parsePartial`, `isValidFormat`, `format`, `levelOf` and `at` for NIPOST digital postcodes, full or cut to a level, in display, hyphen and compact styles.
- `mask`, which hides the segments below a level and keeps the five-segment shape.
- `PURPOSES`, `forPurpose` and `suppressSmallCounts` for who-sees-what policy, with the reasons in `docs/policy.md`.
- `verify`, which records a NIPOST assignment check through a lookup function you supply; the library makes no network calls.
- `toReference`, `fromReference` and `isFhirDateTime` for the plain postcode-reference JSON shape.
- `toFhirExtension`, `fromFhirExtension`, `EXTENSION_URL`, `CODESYSTEM_URLS`, `VALUESET_URLS` and `SUB_EXTENSIONS` for the FHIR R4 `Address` extension, with its StructureDefinition, three CodeSystems, three ValueSets and four example resources in `fhir/`.
- `STATE_NAMES`, `STATE_CODES_SEEN` and `stateName`, using ISO 3166-2:NG names as a display hint; not yet checked against NIPOST's own list, which needs an API key.
- `LEVELS`, `CONFIDENCES`, `SOURCES`, `COMPACT_REGEX`, `HYPHEN_REGEX_BY_LEVEL` and `HYPHEN_PARTIAL_REGEX`.
- The `health-postcode` command with `parse`, `at`, `mask`, `for`, `fhir` and `state`.
- An OpenMRS address template in `openmrs/`.

[Unreleased]: https://github.com/pisgahhealth/health-postcode/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/pisgahhealth/health-postcode/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/pisgahhealth/health-postcode/releases/tag/v0.1.0
