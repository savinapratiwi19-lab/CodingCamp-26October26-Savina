const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, browser, submit } = require('./helpers.cjs');
test('amount boundaries, malformed input, and invalid category names', () => {
 const app = loadApp();
 for (const amount of [0.01, '999999999.99', '12.50']) assert.equal(app.Validation.isValidAmount(amount), true);
 for (const amount of [0, -1, Infinity, NaN, '1e3', '.5', '12.001', '1000000000']) assert.equal(app.Validation.isValidAmount(amount), false);
 for (const category of [false, {}, 'x'.repeat(41)]) assert.equal(app.Validation.validateTransaction({ item: 'Lunch', amount: 1, category }).valid, false);
});
test('state snapshots cannot mutate internal transactions', () => {
 const app = loadApp(); const added = app.State.addTransaction({ item: 'Lunch', amount: '12.50', category: 'Food' }); added.item = 'changed';
 const snapshot = app.State.getTransactions(); snapshot[0].amount = 0; snapshot.pop();
 assert.equal(app.State.getTransactions()[0].item, 'Lunch'); assert.equal(app.State.getTransactions()[0].amount, 12.5);
 assert.throws(() => app.State.deleteTransaction('missing'));
});
test('arc geometry starts at top and switches large arc flag at 180 degrees', () => {
 const chart = loadApp().Chart;
 const point = chart.polarToCartesian(160, 160, 140, 0); assert.ok(Math.abs(point.x - 160) < 1e-8); assert.equal(point.y, 20);
 assert.match(chart.describeArc(0, 0, 10, 0, 90), /A 10 10 0 0 1/);
 assert.match(chart.describeArc(0, 0, 10, 0, 180), /A 10 10 0 1 1/);
});
test('empty view and a single category full circle with accessible labels', t => {
 const dom = browser(); t.after(() => dom.window.close()); const doc = dom.window.document;
 assert.equal(doc.getElementById('balance').textContent.replace(/\s/g, ' '), 'Rp 0,00'); assert.equal(doc.querySelectorAll('[role=listitem]').length, 0);
 assert.equal(doc.getElementById('chart').textContent, 'No spending data available');
 submit(dom); assert.equal(doc.querySelectorAll('svg circle').length, 1); assert.equal(doc.querySelectorAll('svg path').length, 0);
 assert.match(doc.querySelector('.chart-legend').textContent, /Food: 100.0%/); assert.equal(doc.querySelector('svg').getAttribute('role'), 'img');
});
test('invalid submit retains fields and displays all field messages', t => {
 const dom = browser(); t.after(() => dom.window.close()); submit(dom, 'Lunch', '0', ''); const doc = dom.window.document;
 assert.equal(doc.getElementById('item-input').value, 'Lunch'); assert.equal(doc.getElementById('amount-input').value, '0');
 assert.equal(doc.querySelectorAll('#form-messages li').length, 2); assert.equal(dom.window.App.State.getTransactions().length, 0);
});
test('transaction names are rendered as text rather than HTML', t => {
 const dom = browser(); t.after(() => dom.window.close()); submit(dom, '<img src=x onerror=alert(1)>');
 assert.equal(dom.window.document.querySelectorAll('#transaction-list img').length, 0);
 assert.equal(dom.window.document.querySelector('.item-name').textContent, '<img src=x onerror=alert(1)>');
});
test('chart uses actual totals for geometry despite rounded percentages', t => {
 const dom = browser(); t.after(() => dom.window.close()); submit(dom, 'A', '1', 'Food'); submit(dom, 'B', '1', 'Transport'); submit(dom, 'C', '1', 'Fun');
 const doc = dom.window.document; assert.equal(doc.querySelectorAll('svg path').length, 3);
 assert.equal(doc.querySelectorAll('.chart-legend li').length, 3); assert.match(doc.querySelector('.chart-legend').textContent, /33.3%/);
});
test('storage adapter reports missing, corrupt, malformed and throwing data', () => {
 assert.equal(loadApp().Storage.loadTransactions().transactions.length, 0);
 for (const raw of ['{', 'null', '{}', '[{"id":"x"}]']) assert.equal(loadApp({ getItem: () => raw }).Storage.loadTransactions().ok, false);
 const app = loadApp({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } });
 assert.equal(app.Storage.loadTransactions().ok, false); assert.equal(app.Storage.saveTransactions([]).ok, false);
});
