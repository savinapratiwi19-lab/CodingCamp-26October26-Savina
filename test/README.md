# Test Directory

This directory holds the test suite for the Expense & Budget Visualizer. The
running application has **zero JavaScript dependencies** (Requirement 7.1); all
test-only dependencies (`fast-check`) live in `package.json` `devDependencies`
and are never part of the deployed app.

## Layout

Test files are organized by type, matching the design's testing strategy:

- `*.property.test.js` — property-based tests for the pure domain-logic layer
  (validation, balance, distribution, deletion state, serialization). Each
  property test runs a minimum of 100 fast-check iterations and is tagged with
  a comment in the form:
  `// Feature: expense-budget-visualizer, Property {n}: {property text}`
- `*.unit.test.js` — example-based unit tests for specific scenarios and edge
  cases (form clearing, list rendering, delete confirm/cancel, balance
  formatting, chart empty state, 100%-slice full circle).
- `*.integration.test.js` — integration tests for the persistence and UI wiring
  (storage round-trip, quota/throwing-store failure modes, performance budgets).

## Running tests

```sh
npm test
```

This runs `node --test` (Node's built-in test runner) in single-execution mode —
no watch mode. Node >= 18 is required for the built-in test runner.

## How tests load the app module

The app is a single plain JavaScript file (`js/app.js`) that attaches its
modules to a global namespace (`globalThis.App` / `window.App`) and is not an ES
module. To access the pure modules from a Node test context, tests read the
file and evaluate it in the current context so that `globalThis.App` becomes
available, for example:

```js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadApp() {
  const code = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'app.js'),
    'utf8'
  );
  vm.runInThisContext(code, { filename: 'app.js' });
  return globalThis.App;
}

const App = loadApp();
// App.Validation, App.Balance, App.Distribution, App.Chart, ... are now usable.
```

`js/app.js` is written so that DOM-dependent initialization only runs when a
browser environment is present, so the pure modules load cleanly under Node
without a DOM.
