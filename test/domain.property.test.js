const { test } = require('node:test');
const assert = require('node:assert/strict');
const fc = require('fast-check');
const { loadApp } = require('./helpers.cjs');
const options = { numRuns: 150 };
const item = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
const amount = fc.integer({ min: 1, max: 99999999999 }).map(n => n / 100);
const category = fc.constantFrom('Food', 'Transport', 'Fun', 'Shopping', 'Health', '__proto__');
const input = fc.record({ item, amount, category });
const transactions = fc.array(input, { maxLength: 80 });
// Feature: expense-budget-visualizer, Property 1: Valid transaction is accepted
test('Property 1: valid transactions are accepted and added', () => {
 fc.assert(fc.property(input, value => { const app = loadApp(); assert.equal(app.Validation.validateTransaction(value).valid, true); app.State.addTransaction(value); assert.equal(app.State.getTransactions().length, 1); }), options);
});
// Feature: expense-budget-visualizer, Property 2: Empty or whitespace-only fields are rejected
test('Property 2: blank fields identify the rejected field', () => {
 fc.assert(fc.property(input, fc.constantFrom('item', 'amount', 'category'), fc.constantFrom('', ' ', '\t\n'), (value, field, blank) => { const result = loadApp().Validation.validateTransaction({ ...value, [field]: blank }); assert.equal(result.valid, false); assert.ok(result.errors.some(e => e.toLowerCase().includes(field))); }), options);
});
// Feature: expense-budget-visualizer, Property 3: Invalid amount is rejected
test('Property 3: invalid amounts are rejected', () => {
 const invalid = fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 1000000000 }), fc.integer({ min: 1, max: 999999 }).map(n => n + '.001'), fc.constantFrom(NaN, Infinity, '', 'abc'));
 fc.assert(fc.property(input, invalid, (value, amount) => { assert.equal(loadApp().Validation.validateTransaction({ ...value, amount }).valid, false); }), options);
});
// Feature: expense-budget-visualizer, Property 4: Item name length boundary is enforced
test('Property 4: name boundaries', () => {
 fc.assert(fc.property(fc.integer({ min: 1, max: 200 }), n => { assert.equal(loadApp().Validation.isValidItemName('x'.repeat(n)), n <= 100); }), options);
});
// Feature: expense-budget-visualizer, Property 5: Transaction list preserves insertion order
test('Property 5: insertion order and unique ids', () => {
 fc.assert(fc.property(transactions, list => { const app = loadApp(); list.forEach(t => app.State.addTransaction(t)); const result = app.State.getTransactions(); assert.equal(new Set(result.map(t => t.id)).size, list.length); assert.deepEqual(Array.from(result, t => t.item), list.map(t => t.item.trim())); }), options);
});
// Feature: expense-budget-visualizer, Property 6: Deletion removes exactly the chosen transaction
test('Property 6: exact deletion preserves remaining order', () => {
 fc.assert(fc.property(fc.array(input, { minLength: 1, maxLength: 60 }), fc.nat(), (list, index) => { const app = loadApp(); list.forEach(t => app.State.addTransaction(t)); const before = app.State.getTransactions(); const position = index % before.length; app.State.deleteTransaction(before[position].id); assert.deepEqual(Array.from(app.State.getTransactions(), t => t.id), Array.from(before.filter((_, i) => i !== position), t => t.id)); }), options);
});
// Feature: expense-budget-visualizer, Property 7: Total balance equals the sum of amounts, empty equals zero
test('Property 7: exact cents sum and empty zero', () => {
 fc.assert(fc.property(transactions, list => { assert.equal(loadApp().Balance.computeTotalBalance(list), list.reduce((sum, t) => sum + Math.round(t.amount * 100), 0) / 100); }), options);
 assert.equal(loadApp().Balance.computeTotalBalance([]), 0);
});
// Feature: expense-budget-visualizer, Property 8: Category distribution sums to 100 and matches per-category totals
test('Property 8: distribution totals, labels, rounding tolerance', () => {
 fc.assert(fc.property(fc.array(input, { minLength: 1, maxLength: 80 }), list => { const result = loadApp().Distribution.computeDistribution(list); const grand = list.reduce((s, t) => s + Math.round(t.amount * 100), 0); for (const s of result) { const total = list.filter(t => t.category === s.category).reduce((v, t) => v + Math.round(t.amount * 100), 0); assert.equal(s.total, total / 100); assert.equal(s.percentage, Math.round(total / grand * 1000) / 10); } assert.ok(Math.abs(result.reduce((s, v) => s + v.percentage, 0) - 100) <= result.length * 0.05 + 1e-9); }), options);
});
// Feature: expense-budget-visualizer, Property 9: Missing category is grouped under Uncategorized
test('Property 9: missing categories', () => {
 fc.assert(fc.property(amount, fc.constantFrom('', '  ', undefined, null), (amount, category) => { const result = loadApp().Distribution.computeDistribution([{ amount, category }]); assert.equal(result[0].category, 'Uncategorized'); assert.equal(result[0].percentage, 100); }), options);
});
// Feature: expense-budget-visualizer, Property 10: Serialization round trip preserves transactions
test('Property 10: storage round trip preserves transaction data', () => {
 fc.assert(fc.property(transactions, list => { let saved = null; const app = loadApp({ getItem: () => saved, setItem: (_, value) => { saved = value; } }); list.forEach(t => app.State.addTransaction(t)); assert.equal(app.Storage.saveTransactions(app.State.getTransactions()).ok, true); assert.equal(JSON.stringify(app.Storage.loadTransactions().transactions), JSON.stringify(app.State.getTransactions())); }), options);
});
