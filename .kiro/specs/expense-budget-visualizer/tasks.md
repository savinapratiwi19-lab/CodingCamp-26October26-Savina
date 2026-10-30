# Implementation Plan: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page, client-side web app for tracking personal expenses. It is built with plain HTML, one CSS file (`css/styles.css`), and one vanilla JavaScript file (`js/app.js`) — no front-end framework and no external JS library (Requirement 7). The single JS file is internally organized into module namespaces that separate pure domain logic (validation, balance, distribution, SVG arc geometry) from side effects (DOM rendering, event handling, Local Storage I/O), keeping the pure layer independently testable.

The implementation proceeds bottom-up: project structure and HTML/CSS first, then the pure domain-logic modules with their fast-check property tests, then the persistence adapter, then the controller/view layer that wires everything together, and finally integration tests plus a final checkpoint. The pie chart is rendered with hand-authored SVG arc paths (no charting library), and floating-point is handled by rounding (balance to 2 decimals, percentages to 1 decimal). All Local Storage access is wrapped in try/catch returning ok/error result envelopes.

## Tasks

- [x] 1. Set up project structure, HTML, CSS, and test infrastructure
  - [x] 1.1 Create directory structure and index.html skeleton
    - Create `css/` and `js/` directories
    - Create `index.html` containing: an Input Form (Item Name input with maxlength 100, Amount input, Category select with Food/Transport/Fun options, submit button), a Total Balance header, a scrollable Transaction List container, and a Pie Chart container
    - Link `css/styles.css` and `js/app.js` (no other scripts); no backend/server dependency
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 9.1_

  - [x] 1.2 Create css/styles.css single-page layout and typography
    - Create the single CSS file with a single-page layout for the form, balance, list, and chart
    - Apply consistent typography to all headings (larger font size) and consistent typography to all body content so headings are visually distinguishable from body content
    - Add scrollable styling for the Transaction List and a container for the chart/empty-state message
    - _Requirements: 7.2, 9.1, 9.2_

  - [x] 1.3 Set up test infrastructure (package.json, fast-check, test runner)
    - Add `package.json` with `fast-check` as a pinned devDependency and a test runner (e.g., Node's built-in test runner or vitest `--run`) configured for single-execution runs (no watch mode)
    - Create a `test/` directory for property, unit, and integration test files
    - _Requirements: 7.1 (test deps are separate from the app's single-JS-file runtime constraint)_

  - [x] 1.4 Structure js/app.js module namespace skeleton exposing pure modules for testing
    - Create `js/app.js` with module objects/namespaces (Validation, State, Balance, Distribution, Chart, Storage, Controller) attached to a global namespace (e.g., `globalThis.App` / `window.App`)
    - Guard DOM-dependent initialization so the pure modules can be loaded in a Node test context without a DOM; only run `init()` when a browser environment is present
    - _Requirements: 7.3_

- [ ] 2. Implement Validation module (pure)
  - [ ] 2.1 Implement validateTransaction, isValidAmount, isValidItemName
    - `validateTransaction({ item, amount, category })` returns `{ valid: boolean, errors: string[] }` with field-specific messages
    - `isValidAmount(value)`: true when finite, positive, not exceeding 999,999,999.99, with at most 2 decimal places
    - `isValidItemName(value)`: true when trimmed length is 1..100 and non-empty; reject names exceeding 100 characters
    - _Requirements: 1.3, 1.4, 1.5, 1.7_

  - [~]* 2.2 Write property test for valid transaction acceptance
    - **Property 1: Valid transaction is accepted**
    - **Validates: Requirements 1.3**

  - [~]* 2.3 Write property test for empty/whitespace field rejection
    - **Property 2: Empty or whitespace-only fields are rejected**
    - **Validates: Requirements 1.4**

  - [~]* 2.4 Write property test for invalid amount rejection
    - **Property 3: Invalid amount is rejected**
    - **Validates: Requirements 1.5**

  - [~]* 2.5 Write property test for item name length boundary
    - **Property 4: Item name length boundary is enforced**
    - **Validates: Requirements 1.7, 1.3**

- [ ] 3. Implement State module
  - [~] 3.1 Implement getTransactions, addTransaction, deleteTransaction
    - `addTransaction(input)` assigns a unique id, appends to the in-memory list (preserving insertion order), and returns the new Transaction
    - `deleteTransaction(id)` removes exactly the matching transaction and leaves all others in original relative order
    - `getTransactions()` returns the current list
    - _Requirements: 2.1, 3.3_

  - [~]* 3.2 Write property test for insertion-order preservation
    - **Property 5: Transaction list preserves insertion order**
    - **Validates: Requirements 2.1**

  - [~]* 3.3 Write property test for exact-deletion semantics
    - **Property 6: Deletion removes exactly the chosen transaction**
    - **Validates: Requirements 3.3**

- [ ] 4. Implement Balance module (pure)
  - [~] 4.1 Implement computeTotalBalance
    - Sum of all transaction amounts rounded to 2 decimal places; return 0 for an empty list
    - _Requirements: 4.1, 4.3_

  - [~]* 4.2 Write property test for total balance sum and empty-list zero
    - **Property 7: Total balance equals the sum of amounts, empty equals zero**
    - **Validates: Requirements 4.1, 4.3**

- [ ] 5. Implement Distribution module (pure)
  - [~] 5.1 Implement computeDistribution
    - Group transactions by category, summing amounts per category; compute each percentage as `categoryTotal / grandTotal * 100` rounded to 1 decimal place; return `[]` for an empty list
    - Transactions with empty, whitespace-only, or unrecognized categories are grouped under an "Uncategorized" segment
    - _Requirements: 5.1, 5.4_

  - [~]* 5.2 Write property test for distribution sum and per-category totals
    - **Property 8: Category distribution sums to 100 and matches per-category totals**
    - **Validates: Requirements 5.1**

  - [~]* 5.3 Write property test for missing-category grouping
    - **Property 9: Missing category is grouped under "Uncategorized"**
    - **Validates: Requirements 5.4**

- [ ] 6. Implement Chart geometry module (pure)
  - [~] 6.1 Implement polarToCartesian and describeArc
    - `polarToCartesian(cx, cy, r, angleDeg)` returns `{ x, y }` converting polar coordinates to Cartesian (degrees measured from top)
    - `describeArc(cx, cy, r, startAngle, endAngle)` returns SVG path data using the arc command; set `large-arc-flag` to 1 for any slice covering 180° or more
    - _Requirements: 5.1_

  - [~] 6.2 Implement buildPieChartSVG
    - Build and return an SVG element with one labeled segment per distribution slice (category name and percentage); draw a 100%-single-category slice as a full `<circle>`; return null for empty input
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Implement Persistence layer (Storage adapter)
  - [x] 7.1 Implement saveTransactions and loadTransactions
    - `saveTransactions(transactions)`: wrap `localStorage.setItem` (key `expense-visualizer:transactions`, JSON) in try/catch; return `{ ok, error? }`, never throw; on `QuotaExceededError` or any exception return `{ ok: false }`
    - `loadTransactions()`: wrap `localStorage.getItem` + `JSON.parse` in try/catch; missing key returns `{ ok: true, transactions: [] }`; parse/storage failure returns `{ ok: false }`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [~]* 7.2 Write property test for serialization round trip
    - **Property 10: Serialization round trip preserves transactions**
    - **Validates: Requirements 6.3**

  - [~]* 7.3 Write unit/integration tests for storage failure modes
    - `QuotaExceededError` on write retains in-memory transactions and shows an error message
    - Missing storage key loads empty state (empty list, zero balance, empty-state chart)
    - Corrupted/throwing store loads empty state
    - _Requirements: 6.4, 6.5, 6.6_

- [ ] 8. Implement Controller/View layer (rendering and events)
  - [~] 8.1 Implement renderBalance and renderTransactionList
    - `renderBalance(amount)`: format to 2 decimal places; empty list shows `0.00`
    - `renderTransactionList(transactions)`: render rows showing item name, amount, and category, each with a delete control; append without page reload on add; show empty list when no transactions exist
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 4.1, 4.3_

  - [~] 8.2 Implement renderChart (SVG or empty-state message)
    - Render the `buildPieChartSVG` output with category and percentage labels; when empty, show an empty-state message ("No spending data available") instead of an empty SVG
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [~] 8.3 Implement form submit handler with validation and form clearing
    - On submit: call `validateTransaction`; on valid, `addTransaction` → `saveTransactions` → `renderAll` → clear the form fields
    - On invalid: display field-specific validation messages and retain entered values
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 6.1_

  - [~] 8.4 Implement delete with confirmation prompt
    - Show a confirmation prompt when the delete control is activated; on confirm, remove the transaction → persist → re-render; on cancel, retain the transaction; on error, retain the transaction and display an error message
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 6.1_

  - [~] 8.5 Implement renderAll orchestration, attachEventListeners, and init entry point
    - `renderAll()`: recompute balance and distribution from current state and re-render balance, list, and chart
    - `attachEventListeners()`: wire form submit, delete clicks, and confirm/cancel dialog
    - `init()`: load persisted transactions, populate state, and render the initial view (empty list, zero balance, empty-state chart when storage is empty or fails)
    - _Requirements: 6.2, 6.5, 6.6, 8.2_

- [~] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Integration tests and performance verification
  - [~]* 10.1 Write integration tests for UI wiring and persistence round-trip
    - Add transaction appends to the list without page reload and clears the form; delete removes the row and cancels retain it
    - Save-then-reload round-trips transactions restoring identical item/amount/category
    - Add/delete updates the balance (2 decimals) and chart within the interface
    - _Requirements: 1.6, 2.3, 3.3, 3.4, 4.2, 5.2, 6.3_

  - [~]* 10.2 Write performance-budget assertions
    - Assert the interface renders within 1 second of load with a representative data set; assert a single add/delete updates the interface within 100 milliseconds
    - _Requirements: 8.2, 8.3_

- [~] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties for the pure domain-logic layer; each property test runs a minimum of 100 fast-check iterations and is tagged with its design property number and the requirements clause it checks
- Unit tests validate specific examples and edge cases (form clearing, list rendering, delete confirm/cancel, balance formatting, chart empty state, 100%-slice full circle)
- Integration tests verify the persistence round-trip and UI wiring with representative examples and stubbed or real Local Storage
- Browser compatibility across Chrome, Firefox, Edge, and Safari (Requirement 8.1) is satisfied by the standards-based, framework-free implementation; cross-browser validation is out of scope for automated coding tasks
- The app's single-JS-file runtime constraint (Requirement 7.3) applies to the running Visualizer; test files and dev-only test dependencies live separately and are not part of the deployed app

## Task Dependency Graph

All implementation tasks (1.4, 2.1, 3.1, 4.1, 5.1, 6.1, 6.2, 7.1, 8.1–8.5) write to the single permitted JS file (`js/app.js`), so each occupies its own wave to avoid write conflicts. Test sub-tasks write to separate test files and are interleaved into waves that already contain a `js/app.js` task wherever their dependencies are satisfied, maximizing parallelism.

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4"] },
    { "id": 2, "tasks": ["7.1"] },
    { "id": 3, "tasks": ["2.1", "7.2", "7.3"] },
    { "id": 4, "tasks": ["3.1", "2.2", "2.3", "2.4", "2.5"] },
    { "id": 5, "tasks": ["4.1", "3.2", "3.3"] },
    { "id": 6, "tasks": ["5.1", "4.2"] },
    { "id": 7, "tasks": ["6.1", "5.2", "5.3"] },
    { "id": 8, "tasks": ["6.2"] },
    { "id": 9, "tasks": ["8.1"] },
    { "id": 10, "tasks": ["8.2"] },
    { "id": 11, "tasks": ["8.3"] },
    { "id": 12, "tasks": ["8.4"] },
    { "id": 13, "tasks": ["8.5"] },
    { "id": 14, "tasks": ["10.1", "10.2"] }
  ]
}
```
