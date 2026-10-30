const { test } = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { browser, submit } = require('./helpers.cjs');
function memoryStore() { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } }; }
test('add, cancel, confirm, reload, and delete to empty update the complete interface', t => {
 const storage = memoryStore(); const dom = browser(storage); t.after(() => dom.window.close()); const doc = dom.window.document;
 submit(dom, 'Lunch', '12.50', 'Food'); submit(dom, 'Bus', '3', 'Transport');
 assert.deepEqual(Array.from(doc.querySelectorAll('.item-name'), n => n.textContent), ['Lunch', 'Bus']);
 assert.equal(doc.getElementById('balance').textContent.replace(/\s/g, ' '), 'Rp 15,50'); assert.equal(doc.getElementById('item-input').value, ''); assert.equal(doc.getElementById('category-input').value, '');
 dom.window.confirm = () => false; doc.querySelector('.delete-control').click(); assert.equal(doc.querySelectorAll('.transaction-item').length, 2);
 dom.window.confirm = () => true; doc.querySelector('.delete-control').click(); assert.equal(doc.getElementById('balance').textContent.replace(/\s/g, ' '), 'Rp 3,00');
 const restored = browser(storage); t.after(() => restored.window.close()); const next = restored.window.document;
 assert.equal(next.querySelector('.item-name').textContent, 'Bus'); assert.equal(next.getElementById('balance').textContent.replace(/\s/g, ' '), 'Rp 3,00'); assert.equal(next.querySelectorAll('circle').length, 1);
 next.querySelector('.delete-control').click(); assert.equal(next.getElementById('balance').textContent.replace(/\s/g, ' '), 'Rp 0,00'); assert.equal(next.getElementById('chart').textContent, 'No spending data available');
});
test('quota failure retains added transaction and reports unsaved data', t => {
 const dom = browser({ getItem: () => null, setItem() { throw new Error('QuotaExceededError'); } }); t.after(() => dom.window.close()); submit(dom);
 const doc = dom.window.document; assert.equal(doc.querySelectorAll('.transaction-item').length, 1); assert.equal(doc.getElementById('balance').textContent.replace(/\s/g, ' '), 'Rp 12,50'); assert.match(doc.getElementById('form-messages').textContent, /could not be saved/);
});
test('failed deletion rolls back state and preserves persisted data', t => {
 let fail = false; let stored = null;
 const storage = { getItem: () => stored, setItem(_, value) { if (fail) throw new Error('quota'); stored = value; } };
 const dom = browser(storage); t.after(() => dom.window.close()); submit(dom); const before = stored; fail = true;
 dom.window.document.querySelector('.delete-control').click(); assert.equal(dom.window.App.State.getTransactions().length, 1);
 assert.equal(stored, before); assert.equal(dom.window.document.querySelectorAll('.transaction-item').length, 1); assert.match(dom.window.document.getElementById('form-messages').textContent, /Could not delete/);
});
test('corrupted or inaccessible storage initializes empty view with error', t => {
 for (const storage of [{ getItem: () => '{' }, { getItem() { throw new Error('denied'); } }]) {
  const dom = browser(storage); t.after(() => dom.window.close()); const doc = dom.window.document;
  assert.equal(doc.getElementById('balance').textContent.replace(/\s/g, ' '), 'Rp 0,00'); assert.equal(doc.querySelectorAll('.transaction-item').length, 0); assert.equal(doc.getElementById('chart').textContent, 'No spending data available'); assert.match(doc.getElementById('form-messages').textContent, /Could not load/);
 }
});
test('legacy missing categories are restored and grouped as Uncategorized', t => {
 const data = [{ id: 'legacy', item: 'Old expense', amount: 5, category: '' }];
 const dom = browser({ getItem: () => JSON.stringify(data) }); t.after(() => dom.window.close()); assert.match(dom.window.document.querySelector('.chart-legend').textContent, /Uncategorized: 100.0%/);
});
test('representative 100-row load <1s and add/delete <100ms', t => {
 const list = Array.from({ length: 100 }, (_, i) => ({ id: 'row-' + i, item: 'Expense ' + i, amount: 10, category: ['Food', 'Transport', 'Fun'][i % 3] }));
 const storage = memoryStore(); storage.setItem('expense-visualizer:transactions', JSON.stringify(list));
 let start = performance.now(); const dom = browser(storage); const loadMs = performance.now() - start; t.after(() => dom.window.close());
 start = performance.now(); submit(dom); const addMs = performance.now() - start;
 start = performance.now(); dom.window.document.querySelector('.delete-control').click(); const deleteMs = performance.now() - start;
 t.diagnostic(JSON.stringify({ loadMs, addMs, deleteMs })); assert.ok(loadMs < 1000, 'initial render <1s'); assert.ok(addMs < 100, 'add <100ms'); assert.ok(deleteMs < 100, 'delete <100ms');
});

test('rupiah formatting and category pie chart aggregate spending and update after deletion', t => {
 const dom = browser(); t.after(() => dom.window.close()); const doc = dom.window.document;
 submit(dom, 'Lunch', '25000', 'Food'); submit(dom, 'Dinner', '50000', 'Food'); submit(dom, 'Bus', '25000', 'Transport');
 const normalized = node => node.textContent.replace(/\s/g, ' ');
 assert.equal(normalized(doc.getElementById('balance')), 'Rp 100.000,00');
 assert.equal(normalized(doc.querySelector('.item-amount')), 'Rp 25.000,00');
 assert.equal(doc.querySelectorAll('svg path').length, 2);
 const legend = Array.from(doc.querySelectorAll('.chart-legend li'), normalized);
 assert.ok(legend.some(text => text.includes('Food: 75.0%') && text.includes('Rp 75.000,00')));
 assert.ok(legend.some(text => text.includes('Transport: 25.0%') && text.includes('Rp 25.000,00')));
 assert.match(normalized(doc.querySelector('svg title')), /Food: 75.0%.*Rp 75.000,00/);
 doc.querySelectorAll('.delete-control')[2].click();
 assert.equal(doc.querySelectorAll('svg circle').length, 1);
 assert.match(normalized(doc.querySelector('.chart-legend')), /Food: 100.0%.*Rp 75.000,00/);
 submit(dom, 'Small expense', '0.50', 'Fun');
 assert.equal(normalized(doc.getElementById('balance')), 'Rp 75.000,50');
});

test('theme toggle switches both ways, persists separately, and restores preference', t => {
 const values = new Map(); const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
 const dom = browser(storage); t.after(() => dom.window.close()); const doc = dom.window.document; const button = doc.getElementById('theme-toggle');
 assert.equal(doc.documentElement.dataset.theme, 'light'); assert.equal(button.getAttribute('aria-pressed'), 'false');
 submit(dom, 'Lunch', '25000'); const saved = values.get('expense-visualizer:transactions');
 button.click(); assert.equal(doc.documentElement.dataset.theme, 'dark'); assert.equal(button.textContent, 'Light mode'); assert.equal(button.getAttribute('aria-pressed'), 'true');
 assert.equal(values.get('expense-visualizer:theme'), 'dark'); assert.equal(values.get('expense-visualizer:transactions'), saved);
 const restored = browser(storage); t.after(() => restored.window.close()); assert.equal(restored.window.document.documentElement.dataset.theme, 'dark');
 button.click(); assert.equal(doc.documentElement.dataset.theme, 'light'); assert.equal(values.get('expense-visualizer:theme'), 'light');
});
test('theme uses system preference unless a valid saved preference exists', t => {
 for (const [saved, expected] of [[null, 'dark'], ['invalid', 'dark'], ['light', 'light']]) {
  const dom = browser({ getItem: key => key === 'expense-visualizer:theme' ? saved : null, setItem() {} }, { dark: true });
  t.after(() => dom.window.close()); assert.equal(dom.window.document.documentElement.dataset.theme, expected);
 }
});
test('theme toggle remains usable when storage access is denied', t => {
 const dom = browser({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } }); t.after(() => dom.window.close());
 const doc = dom.window.document; doc.getElementById('theme-toggle').click(); assert.equal(doc.documentElement.dataset.theme, 'dark');
 doc.getElementById('theme-toggle').click(); assert.equal(doc.documentElement.dataset.theme, 'light');
});

function addCategory(dom, name) {
 const doc = dom.window.document; doc.getElementById('new-category-input').value = name;
 doc.getElementById('category-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}
test('custom category is selected, persists before use, and appears in chart after reload', t => {
 const storage = memoryStore(); const dom = browser(storage); t.after(() => dom.window.close()); const doc = dom.window.document;
 addCategory(dom, '  Shopping  '); assert.equal(doc.getElementById('category-input').value, 'Shopping');
 const fresh = browser(storage); t.after(() => fresh.window.close()); assert.ok(Array.from(fresh.window.document.querySelectorAll('#category-input option')).some(o => o.value === 'Shopping'));
 submit(dom, 'Clothes', '150000', 'Shopping'); assert.equal(doc.querySelector('.category-tag').textContent, 'Shopping');
 assert.match(doc.querySelector('.chart-legend').textContent, /Shopping: 100.0%/);
 const color = doc.querySelector('svg circle').getAttribute('fill');
 const restored = browser(storage); t.after(() => restored.window.close()); assert.equal(restored.window.document.querySelector('svg circle').getAttribute('fill'), color);
 assert.match(restored.window.document.querySelector('.chart-legend').textContent, /Shopping: 100.0%/);
});
test('custom category rejects empty, overlong, duplicate, and reserved names', t => {
 const dom = browser(); t.after(() => dom.window.close()); const doc = dom.window.document;
 for (const name of ['', '  ', 'x'.repeat(41), 'food', ' Food ', 'UNCATEGORIZED']) {
  addCategory(dom, name); assert.equal(doc.querySelectorAll('#category-input option').length, 4); assert.notEqual(doc.getElementById('category-message').textContent, 'Category added.');
 }
 addCategory(dom, 'Health'); addCategory(dom, 'health'); assert.equal(doc.querySelectorAll('#category-input option').length, 5);
});
test('custom category is safe text and supports prototype-like names with valid colors', t => {
 const dom = browser(); t.after(() => dom.window.close()); const doc = dom.window.document;
 for (const name of ['<img src=x onerror=alert(1)>', '__proto__', 'constructor']) {
  addCategory(dom, name); submit(dom, 'Expense', '10', name);
 }
 assert.equal(doc.querySelectorAll('img').length, 0); assert.equal(doc.querySelectorAll('svg path').length, 3);
 for (const path of doc.querySelectorAll('svg path')) assert.match(path.getAttribute('fill'), /^hsl\(/);
});
test('custom category remains usable on save failure and recovers from stored transactions', t => {
 const dom = browser({ getItem: () => null, setItem() { throw new Error('quota'); } }); t.after(() => dom.window.close());
 addCategory(dom, 'Health'); assert.equal(dom.window.document.getElementById('category-input').value, 'Health'); assert.match(dom.window.document.getElementById('category-message').textContent, /could not be saved/);
 submit(dom, 'Medicine', '25000', 'Health'); assert.match(dom.window.document.querySelector('.chart-legend').textContent, /Health/);
 const data = [{ id: 'old', item: 'Medicine', amount: 25000, category: 'Health' }];
 const restored = browser({ getItem: key => key === 'expense-visualizer:transactions' ? JSON.stringify(data) : null, setItem() {} }); t.after(() => restored.window.close());
 assert.ok(Array.from(restored.window.document.querySelectorAll('#category-input option')).some(o => o.value === 'Health'));
});

function deleteCategory(dom, name) {
 const button = Array.from(dom.window.document.querySelectorAll('#custom-category-list button')).find(button => button.dataset.category === name);
 assert.ok(button, 'category has a delete button'); button.click();
}
test('category deletion supports cancellation and persists removal of an unused category', t => {
 const storage = memoryStore(); const dom = browser(storage); t.after(() => dom.window.close()); addCategory(dom, 'Shopping');
 dom.window.confirm = () => false; deleteCategory(dom, 'Shopping'); assert.equal(dom.window.document.getElementById('category-input').value, 'Shopping');
 dom.window.confirm = () => true; deleteCategory(dom, 'Shopping');
 assert.equal(dom.window.document.getElementById('category-input').value, ''); assert.equal(dom.window.document.querySelectorAll('#custom-category-list button').length, 0);
 const restored = browser(storage); t.after(() => restored.window.close()); assert.ok(!Array.from(restored.window.document.querySelectorAll('#category-input option')).some(o => o.value === 'Shopping'));
 assert.equal(restored.window.document.querySelectorAll('#category-input option').length, 4);
});
test('deleting a used category keeps amounts and transactions under Uncategorized after reload', t => {
 const storage = memoryStore(); const dom = browser(storage); t.after(() => dom.window.close()); addCategory(dom, 'Health');
 submit(dom, 'Medicine', '25000', 'Health'); submit(dom, 'Lunch', '10000', 'Food');
 const before = dom.window.document.getElementById('balance').textContent; deleteCategory(dom, 'Health');
 assert.equal(dom.window.document.getElementById('balance').textContent, before);
 assert.equal(dom.window.App.State.getTransactions().length, 2); assert.equal(dom.window.App.State.getTransactions()[0].category, '');
 assert.match(dom.window.document.querySelector('.chart-legend').textContent, /Uncategorized/);
 const restored = browser(storage); t.after(() => restored.window.close());
 assert.equal(restored.window.App.State.getTransactions().length, 2); assert.equal(restored.window.document.getElementById('balance').textContent, before);
 assert.equal(restored.window.document.querySelectorAll('#custom-category-list button').length, 0);
 addCategory(restored, 'Health'); assert.equal(restored.window.App.State.getTransactions()[0].category, '');
});
test('failed category deletion retains category and rolls back saved transaction categories', t => {
 for (const failedKey of ['expense-visualizer:categories', 'expense-visualizer:transactions']) {
  const values = new Map(); let fail = false;
  const storage = { getItem: key => values.get(key) ?? null, setItem(key, value) { if (fail && key === failedKey) throw new Error('quota'); values.set(key, value); }, removeItem: key => values.delete(key) };
  const dom = browser(storage); t.after(() => dom.window.close()); addCategory(dom, 'Health'); submit(dom, 'Medicine', '25000', 'Health');
  const saved = values.get('expense-visualizer:transactions'); fail = true; deleteCategory(dom, 'Health');
  assert.equal(dom.window.App.State.getTransactions()[0].category, 'Health'); assert.equal(values.get('expense-visualizer:transactions'), saved);
  assert.equal(dom.window.document.querySelectorAll('#custom-category-list button').length, 1); assert.match(dom.window.document.getElementById('category-message').textContent, /Could not delete/);
 }
});

function setBudget(dom, value) {
 const doc = dom.window.document; doc.getElementById('budget-input').value = value;
 doc.getElementById('budget-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}
test('limit highlights only spending strictly over limit and clears after deletion', t => {
 const dom = browser(); t.after(() => dom.window.close()); const doc = dom.window.document;
 setBudget(dom, '100000'); submit(dom, 'Lunch', '75000');
 assert.equal(doc.querySelector('.balance-section').classList.contains('over-limit'), false);
 assert.match(doc.getElementById('budget-status').textContent.replace(/\s/g, ' '), /Rp 25.000,00 remaining/);
 submit(dom, 'Dinner', '25000'); assert.equal(doc.querySelector('.balance-section').classList.contains('over-limit'), false); assert.match(doc.getElementById('budget-status').textContent, /limit reached/);
 submit(dom, 'Bus', '0.01', 'Transport'); assert.equal(doc.querySelector('.balance-section').classList.contains('over-limit'), true);
 assert.match(doc.getElementById('budget-status').textContent.replace(/\s/g, ' '), /Over your Rp 100.000,00 limit by Rp 0,01/);
 doc.querySelectorAll('#transaction-list .delete-control')[2].click(); assert.equal(doc.querySelector('.balance-section').classList.contains('over-limit'), false);
});
test('limit restores after reload, can be changed, and can be removed', t => {
 const storage = memoryStore(); const dom = browser(storage); t.after(() => dom.window.close()); setBudget(dom, '100'); submit(dom, 'Lunch', '200');
 const restored = browser(storage); t.after(() => restored.window.close()); const doc = restored.window.document;
 assert.equal(doc.getElementById('budget-input').value, '100'); assert.equal(doc.querySelector('.balance-section').classList.contains('over-limit'), true);
 setBudget(restored, '300'); assert.equal(doc.querySelector('.balance-section').classList.contains('over-limit'), false);
 doc.getElementById('clear-budget').click(); assert.equal(doc.getElementById('budget-status').textContent, ''); assert.equal(doc.getElementById('budget-input').value, '');
 const cleared = browser(storage); t.after(() => cleared.window.close()); assert.equal(cleared.window.document.getElementById('budget-status').textContent, ''); assert.equal(cleared.window.App.State.getTransactions().length, 1);
});
test('invalid limits leave the previously applied limit unchanged', t => {
 const dom = browser(); t.after(() => dom.window.close()); setBudget(dom, '10'); submit(dom, 'Lunch', '11');
 for (const invalid of ['', '0', '-1', '1000000000', '1.001']) {
  setBudget(dom, invalid); assert.match(dom.window.document.getElementById('budget-message').textContent, /Enter a positive limit/);
  assert.equal(dom.window.document.querySelector('.balance-section').classList.contains('over-limit'), true);
 }
});
test('invalid stored limit is ignored and storage failure keeps the limit working for this visit', t => {
 for (const raw of ['{', '{}', '"100"', '-1']) {
  const dom = browser({ getItem: key => key === 'expense-visualizer:budget' ? raw : null, setItem() {} }); t.after(() => dom.window.close());
  assert.equal(dom.window.document.getElementById('budget-status').textContent, ''); assert.match(dom.window.document.getElementById('budget-message').textContent, /Could not load/);
 }
 const dom = browser({ getItem: () => null, setItem() { throw new Error('quota'); } }); t.after(() => dom.window.close()); setBudget(dom, '10'); submit(dom, 'Lunch', '11');
 assert.equal(dom.window.document.querySelector('.balance-section').classList.contains('over-limit'), true); assert.match(dom.window.document.getElementById('budget-message').textContent, /could not be saved/);
 dom.window.document.getElementById('clear-budget').click(); assert.equal(dom.window.document.querySelector('.balance-section').classList.contains('over-limit'), false);
});
