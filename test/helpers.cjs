const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
function loadApp(storage = { getItem: () => null, setItem() {} }) {
  const context = vm.createContext({ localStorage: storage });
  vm.runInContext(source, context);
  return context.App;
}
function browser(storage, options = {}) {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'https://expenses.example', runScripts: 'outside-only', pretendToBeVisual: true });
  if (storage) Object.defineProperty(dom.window, 'localStorage', { value: storage });
  dom.window.matchMedia = () => ({ matches: Boolean(options.dark) });
  dom.window.confirm = () => true;
  dom.window.eval(source);
  return dom;
}
function submit(dom, item = 'Lunch', amount = '12.50', category = 'Food') {
  const document = dom.window.document;
  document.getElementById('item-input').value = item;
  document.getElementById('amount-input').value = amount;
  document.getElementById('category-input').value = category;
  document.getElementById('transaction-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}
module.exports = { loadApp, browser, submit };
