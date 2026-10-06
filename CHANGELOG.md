# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/Pisgah/health-postcode/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Pisgah/health-postcode/releases/tag/v0.1.0
