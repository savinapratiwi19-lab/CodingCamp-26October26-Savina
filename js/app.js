/*
 * Expense & Budget Visualizer — single application script
 *
 * Requirement 7.3: exactly one JavaScript file in the `js/` directory. All
 * behavior lives here, organized into module objects/namespaces that mirror the
 * layered architecture (see design.md):
 *
 *   Validation    [pure]  — input validation (Task 2.1)
 *   State                — in-memory transaction list (Task 3.1)
 *   Balance       [pure] — total balance computation (Task 4.1)
 *   Distribution  [pure] — category distribution / percentages (Task 5.1)
 *   Chart                — SVG arc geometry [pure] (Task 6.1) + builder (Task 6.2)
 *   Storage              — Local Storage adapter, try/catch envelopes (Task 7.1)
 *   Controller           — view/render layer + event wiring + init (Tasks 8.1–8.5)
 *
 * The modules attach to the global namespace `globalThis.App`. `globalThis` is
 * available in both browsers (where it is `window`) and Node, so the pure
 * modules can be loaded and tested in a Node context (no `window`/DOM dependency)
 * by evaluating this file with `vm.runInThisContext`. DOM-dependent
 * initialization only runs when a browser environment is present, so the pure
 * modules load cleanly under Node without a DOM.
 *
 * All modules are implemented below; DOM access is confined to the view layer.
 */

(function () {
  'use strict';

  // Attach the application namespace to the global object. Using `globalThis`
  // (not `window` exclusively) keeps the pure modules reachable from Node tests.
  var App = (globalThis.App = globalThis.App || {});

  /* ------------------------------------------------------------------ */
  /* Validation Module [pure]                                            */
  /* Contracts (implemented in Task 2.1):                                */
  /*   validateTransaction({ item, amount, category })                    */
  /*     -> { valid: boolean, errors: string[] }                          */
  /*   isValidAmount(value) -> boolean                                    */
  /*   isValidItemName(value) -> boolean                                  */
  /* ------------------------------------------------------------------ */
  App.Validation = {
    // Task 2.1 — validate a raw form input object against the transaction
    // rules (Requirements 1.3, 1.4, 1.5, 1.7). Pure: no DOM or storage access.
    // Returns { valid, errors } where errors holds field-specific messages.
    validateTransaction: function (input) {
      var errors = [];
      var item = input ? input.item : undefined;
      var amount = input ? input.amount : undefined;
      var category = input ? input.category : undefined;

      // Item Name — reject empty/whitespace-only (Req 1.4) and names longer
      // than 100 characters after trimming (Req 1.7). The two cases are
      // mutually exclusive so each gets its own message.
      var itemTrimmed = typeof item === 'string' ? item.trim() : '';
      if (itemTrimmed.length === 0) {
        errors.push('Item Name is required.');
      } else if (itemTrimmed.length > 100) {
        errors.push('Item Name is too long (maximum 100 characters).');
      }

      // Amount — reject empty/whitespace-only (Req 1.4); otherwise require a
      // positive number <= 999,999,999.99 with at most 2 decimal places.
      var amountBlank = amount === null || amount === undefined ||
        (typeof amount === 'string' && amount.trim() === '');
      if (amountBlank) {
        errors.push('Amount is required.');
      } else if (!App.Validation.isValidAmount(amount)) {
        errors.push('Amount must be positive, up to Rp 999.999.999,99, with at most 2 decimal places.');
      }

      // Built-in and custom category names share the same validation.
      var categoryBlank = category === null || category === undefined ||
        (typeof category === 'string' && category.trim() === '');
      if (categoryBlank) {
        errors.push('Category is required.');
      } else if (typeof category !== 'string' || category.trim().length > 40) {
        errors.push('Category must be a name of at most 40 characters.');
      }

      return { valid: errors.length === 0, errors: errors };
    },

    // Task 2.1 — true when value is a finite, positive number not exceeding
    // 999,999,999.99 with at most 2 decimal places (Requirements 1.3, 1.5).
    // Accepts both string (from the form) and number inputs.
    isValidAmount: function (value) {
      var s;
      if (typeof value === 'number') {
        // Reject NaN, Infinity, -Infinity up front.
        if (!isFinite(value)) return false;
        s = String(value);
      } else if (typeof value === 'string') {
        s = value;
      } else {
        return false;
      }

      s = s.trim();
      if (s === '') return false;

      // Allow only a plain decimal with 0-2 fractional digits (no sign,
      // scientific notation, or thousands separators). Inspecting the
      // string representation directly avoids the floating-point artifacts
      // that appear when round-tripping through Number().toString().
      if (!/^\d+(?:\.\d{1,2})?$/.test(s)) return false;

      var n = Number(s);
      if (!isFinite(n) || n <= 0) return false;
      if (n > 999999999.99) return false;

      return true;
    },

    // Task 2.1 — true when value is a non-empty string of 1..100 characters
    // after trimming (Requirements 1.3, 1.7).
    isValidItemName: function (value) {
      if (typeof value !== 'string') return false;
      var trimmed = value.trim();
      return trimmed.length >= 1 && trimmed.length <= 100;
    }
  };

  /* ------------------------------------------------------------------ */
  /* State Module                                                        */
  /* Contracts (implemented in Task 3.1):                                */
  /*   getTransactions() -> Transaction[]                                 */
  /*   addTransaction(input) -> Transaction   (assigns id; mutates state)*/
  /*   deleteTransaction(id) -> Transaction[] (mutates state)            */
  /* ------------------------------------------------------------------ */

  // In-memory single source of truth for the current transaction list.
  var transactions = [];

  var rupiahFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  function formatRupiah(amount) { return rupiahFormatter.format(amount); }
  function cents(amount) { return Math.round(Number(amount) * 100); }
  function clone(list) { return list.map(function (t) { return Object.assign({}, t); }); }
  var nextId = 0;
  App.State = {
    getTransactions: function () { return clone(transactions); },
    setTransactions: function (list) { transactions = clone(list); },
    addTransaction: function (input) {
      var validation = App.Validation.validateTransaction(input);
      if (!validation.valid) throw new Error(validation.errors.join(' '));
      var id;
      do { id = Date.now().toString(36) + '-' + (++nextId).toString(36); }
      while (transactions.some(function (t) { return t.id === id; }));
      var transaction = { id: id, item: input.item.trim(), amount: Number(input.amount), category: input.category.trim() };
      transactions.push(transaction);
      return Object.assign({}, transaction);
    },
    deleteTransaction: function (id) {
      var index = transactions.findIndex(function (t) { return t.id === id; });
      if (index < 0) throw new Error('Transaction not found.');
      transactions.splice(index, 1);
      return clone(transactions);
    }
  };
  App.Balance = {
    computeTotalBalance: function (list) {
      return list.reduce(function (total, t) { return total + cents(t.amount); }, 0) / 100;
    }
  };
  App.Distribution = {
    computeDistribution: function (list) {
      var totals = new Map();
      list.forEach(function (t) {
        var category = typeof t.category === 'string' && t.category.trim() ? t.category.trim() : 'Uncategorized';
        totals.set(category, (totals.get(category) || 0) + cents(t.amount));
      });
      var total = Array.from(totals.values()).reduce(function (a, b) { return a + b; }, 0);
      if (!total) return [];
      return Array.from(totals, function (entry) {
        return { category: entry[0], total: entry[1] / 100, percentage: Math.round(entry[1] / total * 1000) / 10 };
      });
    }
  };
  var colors = { Food: '#247ba0', Transport: '#a85412', Fun: '#7953a9', Uncategorized: '#627d98' };
  function categoryColor(category) {
    if (Object.prototype.hasOwnProperty.call(colors, category)) return colors[category];
    var hash = 0;
    for (var i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
    return 'hsl(' + (hash % 360) + ', 55%, 45%)';
  }
  function svgElement(tag, attributes) {
    var element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attributes).forEach(function (key) { element.setAttribute(key, attributes[key]); });
    return element;
  }
  App.Chart = {
    polarToCartesian: function (cx, cy, r, angleDeg) {
      var angle = (angleDeg - 90) * Math.PI / 180;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    },
    describeArc: function (cx, cy, r, startAngle, endAngle) {
      var start = App.Chart.polarToCartesian(cx, cy, r, startAngle);
      var end = App.Chart.polarToCartesian(cx, cy, r, endAngle);
      return ['M', cx, cy, 'L', start.x, start.y, 'A', r, r, 0, endAngle - startAngle >= 180 ? 1 : 0, 1, end.x, end.y, 'Z'].join(' ');
    },
    buildPieChartSVG: function (segments) {
      if (!segments.length) return null;
      var svg = svgElement('svg', { viewBox: '0 0 320 320', role: 'img', 'aria-label': 'Spending by category' });
      var total = segments.reduce(function (sum, s) { return sum + s.total; }, 0);
      var angle = 0;
      segments.forEach(function (segment) {
        // Geometry uses unrounded totals so rounded labels cannot leave gaps.
        var end = angle + segment.total / total * 360;
        var shape = segments.length === 1
          ? svgElement('circle', { cx: 160, cy: 160, r: 140 })
          : svgElement('path', { d: App.Chart.describeArc(160, 160, 140, angle, end) });
        shape.setAttribute('fill', categoryColor(segment.category));
        var label = segment.category + ': ' + segment.percentage.toFixed(1) + '% — ' + formatRupiah(segment.total);
        var title = svgElement('title', {}); title.textContent = label; shape.appendChild(title);
        svg.appendChild(shape);
        angle = end;
      });
      return svg;
    }
  };
  var STORAGE_KEY = 'expense-visualizer:transactions';
  function validStoredList(list) {
    if (!Array.isArray(list)) return false;
    var ids = new Set();
    return list.every(function (t) {
      if (!t || typeof t.id !== 'string' || !t.id || ids.has(t.id) ||
          !App.Validation.isValidItemName(t.item) || typeof t.amount !== 'number' ||
          !App.Validation.isValidAmount(t.amount) ||
          !(t.category == null || typeof t.category === 'string')) return false;
      ids.add(t.id); return true;
    });
  }
  App.Storage = {
    saveTransactions: function (list) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); return { ok: true }; }
      catch (e) { return { ok: false, error: e.message || 'Failed to save transactions.' }; }
    },
    loadTransactions: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        var list = raw === null ? [] : JSON.parse(raw);
        if (!validStoredList(list)) throw new Error('Saved transaction data is invalid.');
        return { ok: true, transactions: list };
      } catch (e) { return { ok: false, transactions: [], error: e.message || 'Failed to load transactions.' }; }
    }
  };
  function byId(id) { return document.getElementById(id); }
  function messages(errors) {
    var container = byId('form-messages'); container.replaceChildren();
    errors.forEach(function (message) {
      var li = document.createElement('li'); li.textContent = message; container.appendChild(li);
    });
  }
  var CATEGORY_KEY = 'expense-visualizer:categories';
  var categories = ['Food', 'Transport', 'Fun'];
  App.Categories = {
    render: function (selected) {
      var select = byId('category-input');
      select.replaceChildren();
      var placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Select a category'; select.appendChild(placeholder);
      categories.forEach(function (name) {
        var option = document.createElement('option'); option.value = name; option.textContent = name; select.appendChild(option);
      });
      select.value = selected || '';
      var manager = byId('custom-category-list'); manager.replaceChildren();
      categories.slice(3).forEach(function (name) {
        var row = document.createElement('li');
        var label = document.createElement('span'); label.textContent = name;
        var button = document.createElement('button'); button.type = 'button'; button.className = 'delete-control';
        button.textContent = 'Delete'; button.dataset.category = name;
        button.setAttribute('aria-label', 'Delete category ' + name);
        row.append(label, button); manager.appendChild(row);
      });
    },
    remove: function (name) {
      if (categories.indexOf(name) < 3) return;
      var previous = App.State.getTransactions();
      var affected = previous.filter(function (t) { return typeof t.category === 'string' && t.category.trim().toLowerCase() === name.toLowerCase(); });
      var prompt = 'Delete category "' + name + '"?' + (affected.length ? ' Its ' + affected.length + ' transaction(s) will be kept under Uncategorized.' : '');
      if (!globalThis.confirm(prompt)) return;
      var selected = byId('category-input').value;
      var updated = previous.map(function (t) {
        if (typeof t.category === 'string' && t.category.trim().toLowerCase() === name.toLowerCase()) t.category = '';
        return t;
      });
      var remaining = categories.filter(function (category) { return category !== name; });
      var oldStoredTransactions;
      var wroteTransactions = false;
      try {
        // Save transactions first so a deleted category cannot be recovered on reload.
        if (affected.length) {
          oldStoredTransactions = localStorage.getItem(STORAGE_KEY);
          var saved = App.Storage.saveTransactions(updated);
          if (!saved.ok) throw new Error(saved.error);
          wroteTransactions = true;
        }
        localStorage.setItem(CATEGORY_KEY, JSON.stringify(remaining.slice(3)));
      } catch (e) {
        if (wroteTransactions) {
          try {
            if (oldStoredTransactions === null) localStorage.removeItem(STORAGE_KEY);
            else localStorage.setItem(STORAGE_KEY, oldStoredTransactions);
          } catch (restoreError) {
            byId('category-message').textContent = 'Category was kept, but restoring saved transaction categories failed. Your transactions are still visible for this visit.';
            return;
          }
        }
        byId('category-message').textContent = 'Could not delete category: ' + e.message;
        return;
      }
      categories = remaining; App.State.setTransactions(updated);
      App.Categories.render(selected === name ? '' : selected); App.Controller.renderAll();
      byId('category-message').textContent = 'Category deleted.' + (affected.length ? ' Its transactions were moved to Uncategorized.' : '');
      byId('new-category-input').focus();
    },
    init: function (list) {
      var warning = '';
      categories = ['Food', 'Transport', 'Fun'];
      function include(name) {
        if (typeof name === 'string' && name.trim() && name.trim().length <= 40 &&
            name.trim().toLowerCase() !== 'uncategorized' && !categories.some(function (c) { return c.toLowerCase() === name.trim().toLowerCase(); })) categories.push(name.trim());
      }
      try {
        var raw = localStorage.getItem(CATEGORY_KEY);
        if (raw !== null) {
          var saved = JSON.parse(raw);
          if (!Array.isArray(saved) || !saved.every(function (c) { return typeof c === 'string' && c.trim().length > 0 && c.trim().length <= 40; })) throw new Error('Invalid saved categories.');
          saved.forEach(include);
        }
      } catch (e) { warning = 'Could not load saved categories: ' + e.message; }
      // Recover categories from saved transactions even if category storage was lost.
      list.forEach(function (t) { include(t.category); });
      App.Categories.render();
      byId('custom-category-list').addEventListener('click', function (event) {
        var button = event.target.closest('button[data-category]');
        if (button && byId('custom-category-list').contains(button)) App.Categories.remove(button.dataset.category);
      });
      byId('category-form').addEventListener('submit', function (event) {
        event.preventDefault();
        var input = byId('new-category-input'); var name = input.value.trim();
        var message = byId('category-message');
        if (!name || name.length > 40) { message.textContent = 'Enter a category name of 1–40 characters.'; return; }
        if (name.toLowerCase() === 'uncategorized' || categories.some(function (c) { return c.toLowerCase() === name.toLowerCase(); })) {
          message.textContent = 'That category already exists or is reserved.'; return;
        }
        categories.push(name); App.Categories.render(name); input.value = '';
        try {
          localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories.slice(3)));
          message.textContent = 'Category added.';
        } catch (e) { message.textContent = 'Category added for this visit, but could not be saved.'; }
        byId('category-input').focus();
      });
      return warning;
    }
  };
  var THEME_KEY = 'expense-visualizer:theme';
  App.Theme = {
    apply: function (theme) {
      document.documentElement.dataset.theme = theme;
      var toggle = byId('theme-toggle');
      var dark = theme === 'dark';
      toggle.setAttribute('aria-pressed', String(dark));
      toggle.textContent = dark ? 'Light mode' : 'Dark mode';
      toggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    },
    init: function () {
      var saved;
      try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* Use system preference. */ }
      var preferred = typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
      App.Theme.apply(saved === 'dark' || saved === 'light' ? saved : preferred ? 'dark' : 'light');
      byId('theme-toggle').addEventListener('click', function () {
        var theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        App.Theme.apply(theme);
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* Theme still works without persistence. */ }
      });
    }
  };
  var BUDGET_KEY = 'expense-visualizer:budget';
  var spendingLimit = null;
  App.Budget = {
    render: function (total) {
      var over = spendingLimit !== null && cents(total) > cents(spendingLimit);
      document.querySelector('.balance-section').classList.toggle('over-limit', over);
      var status = byId('budget-status');
      if (spendingLimit === null) { status.textContent = ''; return; }
      var difference = Math.abs(cents(spendingLimit) - cents(total)) / 100;
      status.textContent = over
        ? 'Over your ' + formatRupiah(spendingLimit) + ' limit by ' + formatRupiah(difference) + '.'
        : cents(total) === cents(spendingLimit)
          ? 'Spending limit reached: ' + formatRupiah(spendingLimit) + '.'
          : formatRupiah(difference) + ' remaining of your ' + formatRupiah(spendingLimit) + ' limit.';
    },
    set: function (value) {
      spendingLimit = value;
      App.Budget.render(App.Balance.computeTotalBalance(App.State.getTransactions()));
      byId('budget-input').value = value === null ? '' : String(value);
      try {
        localStorage.setItem(BUDGET_KEY, JSON.stringify(value));
        byId('budget-message').textContent = value === null ? 'Spending limit removed.' : 'Spending limit saved.';
      } catch (e) {
        byId('budget-message').textContent = 'Limit updated for this visit, but could not be saved.';
      }
    },
    init: function () {
      spendingLimit = null;
      try {
        var raw = localStorage.getItem(BUDGET_KEY);
        var saved = raw === null ? null : JSON.parse(raw);
        if (saved !== null && (typeof saved !== 'number' || !App.Validation.isValidAmount(saved))) throw new Error('Invalid saved limit.');
        spendingLimit = saved;
      } catch (e) { byId('budget-message').textContent = 'Could not load your spending limit. Set a new limit to enable highlighting.'; }
      byId('budget-input').value = spendingLimit === null ? '' : String(spendingLimit);
      byId('budget-form').addEventListener('submit', function (event) {
        event.preventDefault();
        var value = byId('budget-input').value;
        if (!App.Validation.isValidAmount(value)) {
          byId('budget-message').textContent = 'Enter a positive limit up to Rp 999.999.999,99 with at most 2 decimal places.';
          return;
        }
        App.Budget.set(Number(value));
      });
      byId('clear-budget').addEventListener('click', function () { App.Budget.set(null); });
    }
  };
  App.Controller = {
    renderAll: function () {
      var list = App.State.getTransactions();
      App.Controller.renderBalance(App.Balance.computeTotalBalance(list));
      App.Controller.renderTransactionList(list);
      App.Controller.renderChart(list);
    },
    renderBalance: function (amount) { byId('balance').textContent = formatRupiah(amount); App.Budget.render(amount); },
    renderTransactionList: function (list) {
      var fragment = document.createDocumentFragment();
      var existing = new Map();
      byId('transaction-list').querySelectorAll('.transaction-item').forEach(function (row) { existing.set(row.dataset.id, row); });
      list.forEach(function (t) {
        var signature = JSON.stringify([t.item, t.amount, t.category]);
        var current = existing.get(t.id);
        if (current && current.dataset.signature === signature) { fragment.appendChild(current); return; }
        var row = document.createElement('div'); row.dataset.id = t.id; row.dataset.signature = signature; row.className = 'transaction-item'; row.setAttribute('role', 'listitem');
        var details = document.createElement('div'); details.className = 'transaction-details';
        var name = document.createElement('span'); name.className = 'item-name'; name.textContent = t.item;
        var category = document.createElement('span'); category.className = 'category-tag'; category.textContent = typeof t.category === 'string' && t.category.trim() ? t.category.trim() : 'Uncategorized';
        details.append(name, category);
        var amount = document.createElement('span'); amount.className = 'item-amount'; amount.textContent = formatRupiah(t.amount);
        var button = document.createElement('button'); button.type = 'button'; button.className = 'delete-control';
        button.dataset.id = t.id; button.textContent = 'Delete'; button.setAttribute('aria-label', 'Delete ' + t.item);
        row.append(details, amount, button); fragment.appendChild(row);
      });
      byId('transaction-list').replaceChildren(fragment);
    },
    renderChart: function (list) {
      var container = byId('chart'); container.replaceChildren();
      var segments = App.Distribution.computeDistribution(list);
      var chart = App.Chart.buildPieChartSVG(segments);
      if (!chart) {
        var empty = document.createElement('p'); empty.className = 'empty-chart-message'; empty.textContent = 'No spending data available';
        container.appendChild(empty); return;
      }
      container.appendChild(chart);
      var legend = document.createElement('ul'); legend.className = 'chart-legend';
      segments.forEach(function (s) {
        var li = document.createElement('li'); var swatch = document.createElement('span'); swatch.className = 'legend-swatch';
        swatch.style.backgroundColor = categoryColor(s.category); swatch.setAttribute('aria-hidden', 'true');
        var label = document.createElement('span'); label.textContent = s.category + ': ' + s.percentage.toFixed(1) + '% — ' + formatRupiah(s.total);
        li.append(swatch, label); legend.appendChild(li);
      });
      container.appendChild(legend);
    },
    attachEventListeners: function () {
      byId('transaction-form').addEventListener('submit', function (event) {
        event.preventDefault();
        var input = { item: byId('item-input').value, amount: byId('amount-input').value, category: byId('category-input').value };
        var result = App.Validation.validateTransaction(input); messages(result.errors);
        if (!result.valid) return;
        App.State.addTransaction(input);
        var saved = App.Storage.saveTransactions(App.State.getTransactions());
        App.Controller.renderAll(); byId('transaction-form').reset(); byId('item-input').focus();
        if (!saved.ok) messages(['Your transaction is shown, but could not be saved: ' + saved.error]);
      });
      byId('transaction-list').addEventListener('click', function (event) {
        var button = event.target.closest('button[data-id]');
        if (!button || !byId('transaction-list').contains(button)) return;
        if (!globalThis.confirm('Delete this transaction?')) return;
        var previous = App.State.getTransactions();
        try {
          App.State.deleteTransaction(button.dataset.id);
          var saved = App.Storage.saveTransactions(App.State.getTransactions());
          if (!saved.ok) throw new Error(saved.error);
          messages([]); App.Controller.renderAll();
        } catch (e) {
          App.State.setTransactions(previous); App.Controller.renderAll();
          messages(['Could not delete transaction: ' + e.message]);
        }
      });
    },
    init: function () {
      App.Theme.init();
      App.Budget.init();
      var loaded = App.Storage.loadTransactions();
      App.State.setTransactions(loaded.ok ? loaded.transactions : []);
      var categoryWarning = App.Categories.init(App.State.getTransactions());
      App.Controller.attachEventListeners(); App.Controller.renderAll();
      var warnings = [];
      if (!loaded.ok) warnings.push('Could not load saved transactions: ' + loaded.error);
      if (categoryWarning) warnings.push(categoryWarning);
      messages(warnings);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Browser-only initialization                                         */
  /* ------------------------------------------------------------------ */
  // Only run init() when a browser DOM is available. This guard lets the
  // pure modules load cleanly under Node (vm.runInThisContext) without a
  // DOM, since Controller.init and the event wiring touch `document`.
  if (typeof document !== 'undefined') {
    App.Controller.init();
  }
})();
