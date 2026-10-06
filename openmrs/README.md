# OpenMRS address template

Paste the contents of `address-template.xml` as the value of the `layout.address.format` global property (Administration, Manage Address Template). The full code lives in `postalCode`, and the FHIR2 module maps it to `Address.postalCode`. OpenMRS does not emit the health-postcode extension, so apply the ladder at export time with `forPurpose` and add the extension with `toFhirExtension` in your export job. The regex allows lower case and either separator, so normalise with `format(value, "display")` on save if you want one spelling in the database.
