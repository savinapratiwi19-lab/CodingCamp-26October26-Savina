# Tests

Run npm ci followed by npm test with Node.js >=18.

- domain.property.test.js: design Properties 1–10, each with 150 fast-check iterations.
- app.unit.test.js: validation, state isolation, SVG geometry, chart labels and empty states, storage validation and safe text rendering.
- app.integration.test.js: form/list/balance/chart wiring, confirmation/cancellation, reload restoration, write/load failures, deletion rollback, legacy categories and performance budgets.
- validation.unit.test.js: runs the original 79-check verification harness in an isolated VM.
- helpers.cjs: isolated application VM and jsdom document fixtures. No test libraries are loaded by index.html.

Tests run sequentially to reduce timing interference. Performance assertions use 100 existing rows and require initialization <1s and add/delete <100ms in jsdom. Real browser compatibility and paint times require manual browser checks.
