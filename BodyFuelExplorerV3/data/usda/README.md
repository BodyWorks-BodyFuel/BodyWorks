# Body Fuel Explorer USDA search index

`foods-index.js` is a compact, browser-ready derivative of these official USDA
FoodData Central releases:

- Foundation Foods, April 2026
- SR Legacy, April 2018 (final release)
- FNDDS 2021–2023, October 2024 release

The index contains only the identifiers, descriptions, representative portions,
and protein/carbohydrate/fat values needed by the Explorer. Raw USDA archives are
not stored in this repository.

Rebuild it with `scripts/build-usda-index.mjs` and the three official downloaded
JSON files. The generated `manifest.json` records source filenames, releases, and
SHA-256 hashes for reproducibility.

Source: U.S. Department of Agriculture, Agricultural Research Service, FoodData
Central. Data are published under CC0 1.0 Universal.
