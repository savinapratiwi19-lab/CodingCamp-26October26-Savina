const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
test('original validation regression harness', () => {
 const context = vm.createContext({});
 vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8'), context);
 const summary = vm.runInContext(fs.readFileSync(path.join(__dirname, '_verify_2_1.js'), 'utf8'), context);
 assert.match(summary, /FAIL=0$/);
});
