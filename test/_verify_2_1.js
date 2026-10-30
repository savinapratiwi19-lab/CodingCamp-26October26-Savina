// Temporary verification harness for Task 2.1 (run via osascript -l JavaScript)
// Loaded AFTER js/app.js in the same JSContext so globalThis.App is defined.
var App = globalThis.App;
var pass = 0, fail = 0;
var failures = [];
function eq(actual, expected, label) {
  var aok = (actual === expected);
  if (aok) { pass++; }
  else { fail++; failures.push(label + ' => expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)); }
}
function isTrue(actual, label) { eq(actual, true, label); }
function isFalse(actual, label) { eq(actual, false, label); }
function contains(arr, needle, label) {
  var found = (arr || []).some(function (e) { return String(e).indexOf(needle) !== -1; });
  if (found) pass++; else { fail++; failures.push(label + ' => expected errors to contain "' + needle + '", got ' + JSON.stringify(arr)); }
}
function lenEq(arr, expected, label) {
  var n = (arr || []).length;
  if (n === expected) pass++; else { fail++; failures.push(label + ' => expected length ' + expected + ', got ' + n + ' :: ' + JSON.stringify(arr)); }
}

// ---------------- isValidAmount ----------------
// Valid string inputs
isTrue(App.Validation.isValidAmount('12.50'), 'isValidAmount 12.50');
isTrue(App.Validation.isValidAmount('12.5'), 'isValidAmount 12.5');
isTrue(App.Validation.isValidAmount('12'), 'isValidAmount 12');
isTrue(App.Validation.isValidAmount('0.01'), 'isValidAmount 0.01');
isTrue(App.Validation.isValidAmount('999999999.99'), 'isValidAmount cap string');
isTrue(App.Validation.isValidAmount('100'), 'isValidAmount 100');
// Valid number inputs
isTrue(App.Validation.isValidAmount(12.5), 'isValidAmount 12.5 number');
isTrue(App.Validation.isValidAmount(12), 'isValidAmount 12 number');
isTrue(App.Validation.isValidAmount(999999999.99), 'isValidAmount cap number');
isTrue(App.Validation.isValidAmount(0.01), 'isValidAmount 0.01 number');
// Whitespace tolerated
isTrue(App.Validation.isValidAmount('  12.50  '), 'isValidAmount trimmed whitespace');

// Invalid string inputs
isFalse(App.Validation.isValidAmount(''), 'isValidAmount empty');
isFalse(App.Validation.isValidAmount('   '), 'isValidAmount whitespace');
isFalse(App.Validation.isValidAmount('0'), 'isValidAmount zero');
isFalse(App.Validation.isValidAmount('0.00'), 'isValidAmount 0.00');
isFalse(App.Validation.isValidAmount('-5'), 'isValidAmount negative');
isFalse(App.Validation.isValidAmount('abc'), 'isValidAmount non-numeric');
isFalse(App.Validation.isValidAmount('12.555'), 'isValidAmount 3 decimals');
isFalse(App.Validation.isValidAmount('1e3'), 'isValidAmount scientific');
isFalse(App.Validation.isValidAmount('1000000000'), 'isValidAmount over cap');
isFalse(App.Validation.isValidAmount('999999999.991'), 'isValidAmount over cap w/3dec');
isFalse(App.Validation.isValidAmount('12.5.5'), 'isValidAmount double dot');
isFalse(App.Validation.isValidAmount('5,000'), 'isValidAmount thousands sep');
isFalse(App.Validation.isValidAmount('+5'), 'isValidAmount plus sign');
isFalse(App.Validation.isValidAmount('.5'), 'isValidAmount no integer part');
// Invalid number / other inputs
isFalse(App.Validation.isValidAmount(NaN), 'isValidAmount NaN');
isFalse(App.Validation.isValidAmount(Infinity), 'isValidAmount Infinity');
isFalse(App.Validation.isValidAmount(-5), 'isValidAmount negative number');
isFalse(App.Validation.isValidAmount(0), 'isValidAmount zero number');
isFalse(App.Validation.isValidAmount(1000000000), 'isValidAmount over cap number');
isFalse(App.Validation.isValidAmount(null), 'isValidAmount null');
isFalse(App.Validation.isValidAmount(undefined), 'isValidAmount undefined');
isFalse(App.Validation.isValidAmount('0.1+0.2'), 'isValidAmount expression string');

// ---------------- isValidItemName ----------------
isTrue(App.Validation.isValidItemName('Lunch'), 'isValidItemName Lunch');
isTrue(App.Validation.isValidItemName('a'), 'isValidItemName single char');
isTrue(App.Validation.isValidItemName('  Lunch  '), 'isValidItemName trimmed whitespace');
isTrue(App.Validation.isValidItemName('a b c'), 'isValidItemName with spaces');
isTrue(App.Validation.isValidItemName(new Array(100 + 1).join('x')), 'isValidItemName exactly 100');
isFalse(App.Validation.isValidItemName(''), 'isValidItemName empty');
isFalse(App.Validation.isValidItemName('   '), 'isValidItemName whitespace only');
isFalse(App.Validation.isValidItemName(new Array(102).join('x')), 'isValidItemName 101 chars');
isFalse(App.Validation.isValidItemName(null), 'isValidItemName null');
isFalse(App.Validation.isValidItemName(undefined), 'isValidItemName undefined');
isFalse(App.Validation.isValidItemName(123), 'isValidItemName number');

// ---------------- validateTransaction ----------------
// Fully valid input
(function () {
  var r = App.Validation.validateTransaction({ item: 'Lunch', amount: '12.50', category: 'Food' });
  eq(r.valid, true, 'valid input valid=true');
  lenEq(r.errors, 0, 'valid input no errors');
})();

// Empty item only
(function () {
  var r = App.Validation.validateTransaction({ item: '', amount: '12.50', category: 'Food' });
  eq(r.valid, false, 'empty item invalid');
  contains(r.errors, 'Item Name', 'empty item names field');
})();

// Whitespace item
(function () {
  var r = App.Validation.validateTransaction({ item: '   ', amount: '12.50', category: 'Food' });
  contains(r.errors, 'Item Name', 'whitespace item names field');
})();

// Empty amount only
(function () {
  var r = App.Validation.validateTransaction({ item: 'Lunch', amount: '', category: 'Food' });
  eq(r.valid, false, 'empty amount invalid');
  contains(r.errors, 'Amount', 'empty amount names field');
})();

// Whitespace amount
(function () {
  var r = App.Validation.validateTransaction({ item: 'Lunch', amount: '   ', category: 'Food' });
  contains(r.errors, 'Amount', 'whitespace amount names field');
})();

// Invalid (non-empty) amount only -> invalid-amount message, not empty
(function () {
  var r = App.Validation.validateTransaction({ item: 'Lunch', amount: '12.555', category: 'Food' });
  eq(r.valid, false, '3dec amount invalid');
  contains(r.errors, 'Amount', '3dec amount names field');
  // should NOT contain the "required" empty message for amount
  var hasRequired = r.errors.some(function (e) { return e.indexOf('required') !== -1; });
  isFalse(hasRequired, '3dec amount not reported as required');
})();

// Zero amount -> invalid-amount message
(function () {
  var r = App.Validation.validateTransaction({ item: 'Lunch', amount: '0', category: 'Food' });
  eq(r.valid, false, 'zero amount invalid');
  contains(r.errors, 'Amount', 'zero amount names field');
})();

// Empty category only
(function () {
  var r = App.Validation.validateTransaction({ item: 'Lunch', amount: '12.50', category: '' });
  eq(r.valid, false, 'empty category invalid');
  contains(r.errors, 'Category', 'empty category names field');
})();

// All three empty -> three errors, each naming its field
(function () {
  var r = App.Validation.validateTransaction({ item: '', amount: '', category: '' });
  eq(r.valid, false, 'all empty invalid');
  lenEq(r.errors, 3, 'all empty three errors');
  contains(r.errors, 'Item Name', 'all empty names item');
  contains(r.errors, 'Amount', 'all empty names amount');
  contains(r.errors, 'Category', 'all empty names category');
})();

// Item too long only
(function () {
  var longName = new Array(102).join('x'); // 101 chars
  var r = App.Validation.validateTransaction({ item: longName, amount: '12.50', category: 'Food' });
  eq(r.valid, false, 'too long item invalid');
  contains(r.errors, 'Item Name', 'too long item names field');
  var hasTooLong = r.errors.some(function (e) { return e.indexOf('too long') !== -1 || e.indexOf('100') !== -1; });
  isTrue(hasTooLong, 'too long item message indicates length');
})();

// Boundary: exactly 100-char item is valid
(function () {
  var name100 = new Array(101).join('x'); // 100 chars
  var r = App.Validation.validateTransaction({ item: name100, amount: '12.50', category: 'Food' });
  eq(r.valid, true, '100 char item valid');
})();

// Boundary: amount exactly at cap is valid
(function () {
  var r = App.Validation.validateTransaction({ item: 'Lunch', amount: '999999999.99', category: 'Food' });
  eq(r.valid, true, 'cap amount valid');
})();

// Mixed: empty item + invalid amount + empty category
(function () {
  var r = App.Validation.validateTransaction({ item: '', amount: 'abc', category: '' });
  eq(r.valid, false, 'mixed invalid');
  lenEq(r.errors, 3, 'mixed three errors');
  contains(r.errors, 'Item Name', 'mixed names item');
  contains(r.errors, 'Amount', 'mixed names amount');
  contains(r.errors, 'Category', 'mixed names category');
})();

// Numeric amount input path through validateTransaction
(function () {
  var r = App.Validation.validateTransaction({ item: 'Lunch', amount: 12.5, category: 'Food' });
  eq(r.valid, true, 'numeric amount valid');
})();

// null/undefined input does not throw and reports all empty
(function () {
  var r = App.Validation.validateTransaction(null);
  eq(r.valid, false, 'null input invalid');
  lenEq(r.errors, 3, 'null input three errors');
  r = App.Validation.validateTransaction(undefined);
  lenEq(r.errors, 3, 'undefined input three errors');
})();

// valid result shape: errors is always an array
(function () {
  var r = App.Validation.validateTransaction({ item: 'Lunch', amount: '12.50', category: 'Food' });
  isTrue(Array.isArray(r.errors), 'valid result errors is array');
})();

// ---------------- Report ----------------
var summary = 'PASS=' + pass + ' FAIL=' + fail;
if (fail > 0) {
  summary += '\nFAILURES:\n' + failures.join('\n');
}
summary;
