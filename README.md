# Expense & Budget Visualizer

A client-side expense tracker using plain HTML, one CSS file and one JavaScript file. No backend, runtime libraries or build step are required.

Open index.html in a modern browser. Add expenses under Food, Transport or Fun; the transaction list, total spending balance and category pie chart update immediately. Amounts use Indonesian rupiah formatting (for example, Rp 25.000,00); chart legends show each category’s percentage and rupiah total. Enter amounts as plain numbers, such as 25000. Confirm a deletion to remove an expense. Transactions are saved under the Local Storage key expense-visualizer:transactions for the current browser and origin.

If saving an addition fails, the expense stays visible with an error message. If saving a deletion fails, the deletion is rolled back. Invalid or inaccessible saved data produces an empty view and an error message. Legacy missing or unknown categories appear as Uncategorized.

## Tests

With Node.js 18 or newer installed:

~~~sh
npm ci
npm test
~~~

Test dependencies are development-only: fast-check for randomized properties and jsdom for DOM integration. Tests cover all ten specified properties (150 runs each), currency and SVG edge cases, safe text rendering, form submission, deletion confirmation/cancellation, reload persistence, storage failure behavior, and performance budgets for 100 transactions.

The performance tests measure DOM behavior in jsdom on the test machine; they do not certify browser paint timing or cross-browser behavior. Browser extension packaging is not included; an extension host must supply its manifest and permissions.

A portable Node runtime may be available locally under the ignored .tools directory. It is only used for development verification.

Use the theme button at the top to switch between light and dark mode. On the first visit the app uses your system preference; your selection is saved separately from transactions. If browser storage is unavailable, the toggle still works for the current visit.

To add a category, expand “Add a custom category” below the transaction form, enter a name (up to 40 characters), and choose Add Category. It becomes selected immediately and is saved for future visits. Duplicate names are checked without case sensitivity. Custom categories appear by name with a stable color in the pie chart; only missing category names fall back to Uncategorized.

Expand “Manage custom categories” to delete a custom category. Confirming deletion keeps its transactions and moves them to Uncategorized, preserving total spending. Food, Transport, and Fun remain built-in categories. Failed saves keep the category and attempt to restore saved transaction categories.

Set a total spending limit in rupiah using Spending Limit. The limit applies to all recorded transactions. The total is highlighted with an over-limit amount only when spending exceeds the limit; remaining funds or an exact-limit message appear otherwise. Limits are restored on reload and can be changed or removed. Save failures retain the setting for the current visit with a message.
