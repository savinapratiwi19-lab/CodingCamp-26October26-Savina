# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that lets users track personal expenses. A user adds a transaction (item name, amount, and category), reviews a scrollable list of recorded transactions, monitors a total balance shown at the top, and views a pie chart of spending distribution by category. All data is persisted in the browser's Local Storage, so no backend server is required. The application is built with plain HTML, CSS, and vanilla JavaScript, and runs in modern browsers as a standalone web app or browser extension.

## Glossary

- **Visualizer**: The Expense & Budget Visualizer web application
- **Transaction**: A single expense entry consisting of an item name, an amount, and a category
- **Category**: A classification of expense; one of Food, Transport, or Fun
- **Input Form**: The form component used to enter a new transaction
- **Transaction List**: The scrollable UI component that displays all recorded transactions
- **Total Balance**: The sum of all transaction amounts, displayed at the top of the interface
- **Pie Chart**: A circular statistical graphic displaying spending distribution across categories
- **Local Storage**: The browser Web Storage API used for client-side data persistence

## Requirements

### Requirement 1: Transaction Entry

**User Story:** As a user, I want to add a new expense transaction with an item name, amount, and category, so that I can record my spending.

#### Acceptance Criteria

1. THE Visualizer SHALL display an Input Form with fields for Item Name (maximum 100 characters), Amount, and Category.
2. THE Input Form SHALL provide Category options of Food, Transport, and Fun.
3. WHEN the Input Form is submitted with all fields filled, Item Name between 1 and 100 characters, Category selected, and Amount as a positive number not exceeding 999,999,999.99 with at most 2 decimal places, THE Visualizer SHALL add a Transaction to the Transaction List.
4. IF the Input Form is submitted with any field empty, THEN THE Visualizer SHALL reject the submission, display a validation message indicating which field(s) are empty, and retain the entered values.
5. IF the Input Form is submitted with an Amount that is not a positive number not exceeding 999,999,999.99 with at most 2 decimal places, THEN THE Visualizer SHALL reject the submission, display a validation message indicating that the Amount is invalid, and retain the entered values.
6. WHEN a Transaction is added, THE Visualizer SHALL clear the Input Form fields.
7. IF the Input Form is submitted with an Item Name exceeding 100 characters, THEN THE Visualizer SHALL reject the submission, display a validation message indicating that the Item Name is too long, and retain the entered values.

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to view all my recorded transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Visualizer SHALL display a scrollable Transaction List containing all recorded Transactions in the order they were recorded.
2. THE Transaction List SHALL display the item name, amount, and category for each Transaction.
3. WHEN a Transaction is added, THE Visualizer SHALL append the Transaction to the Transaction List without reloading the page.
4. IF no Transactions exist, THEN THE Visualizer SHALL display an empty Transaction List.

### Requirement 3: Transaction Deletion

**User Story:** As a user, I want to delete a transaction from the list, so that I can correct mistakes or remove unwanted entries.

#### Acceptance Criteria

1. THE Visualizer SHALL display a delete control for each Transaction in the Transaction List.
2. WHEN the delete control for a Transaction is activated, THE Visualizer SHALL display a confirmation prompt asking the user to confirm the deletion.
3. WHEN the user confirms the deletion, THE Visualizer SHALL remove the Transaction from the Transaction List.
4. IF the user cancels the confirmation, THEN THE Visualizer SHALL retain the Transaction in the Transaction List.
5. IF an error occurs during deletion, THEN THE Visualizer SHALL display an error message and retain the Transaction in the Transaction List.

### Requirement 4: Total Balance

**User Story:** As a user, I want to see my total balance at the top of the interface, so that I can quickly understand my overall spending.

#### Acceptance Criteria

1. THE Visualizer SHALL display the Total Balance, defined as the arithmetic sum of all Transaction amounts, at the top of the interface with 2 decimal places.
2. WHEN a Transaction is added or deleted, THE Visualizer SHALL recompute and update the Total Balance within 1 second.
3. IF no Transactions exist, THEN THE Visualizer SHALL display the Total Balance as zero.

### Requirement 5: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can visualize how my expenses are distributed.

#### Acceptance Criteria

1. WHEN the user views the Spending Distribution Chart, THE Visualizer SHALL display a Pie Chart in which each segment represents one Category, labeled with the Category name and its percentage of total spending, rounded to one decimal place.
2. WHEN a Transaction is added or deleted, THE Visualizer SHALL update the Pie Chart within 1 second to reflect the current distribution across all recorded Transactions.
3. IF no Transactions exist, THEN THE Visualizer SHALL display an empty-state message in place of the Pie Chart indicating that no spending data is available.
4. IF a Transaction has no assigned Category, THEN THE Visualizer SHALL group it under an "Uncategorized" segment in the Pie Chart.

### Requirement 6: Data Persistence

**User Story:** As a user, I want my transactions saved in the browser, so that my data persists when I close and reopen the application.

#### Acceptance Criteria

1. WHEN a Transaction is added or deleted, THE Visualizer SHALL persist the current set of Transactions to Local Storage.
2. WHEN the Visualizer is loaded, THE Visualizer SHALL load Transactions from Local Storage and populate the Transaction List, Total Balance, and Pie Chart.
3. WHEN the Visualizer is reloaded after persisting Transactions to Local Storage, THE Visualizer SHALL restore the same Transactions, matching each by item name, amount, and category.
4. IF persisting to Local Storage fails, THEN THE Visualizer SHALL retain the current Transactions in the Transaction List and display an error message.
5. WHEN the Visualizer is loaded with no Transactions in Local Storage, THE Visualizer SHALL display an empty Transaction List, a zero Total Balance, and an empty-state Pie Chart.
6. IF loading from Local Storage fails, THEN THE Visualizer SHALL display an empty Transaction List, a zero Total Balance, and an empty-state Pie Chart.

### Requirement 7: Technology Stack and Project Structure

**User Story:** As a developer, I want the application built with a simple, framework-free stack and a clean folder structure, so that it is easy to maintain and can run as a standalone web app or browser extension.

#### Acceptance Criteria

1. THE Visualizer SHALL be implemented using HTML for structure, CSS for styling, and vanilla JavaScript for behavior, without any front-end framework or external JavaScript library.
2. THE Visualizer SHALL include exactly one CSS file located in a `css/` directory.
3. THE Visualizer SHALL include exactly one JavaScript file located in a `js/` directory.
4. THE Visualizer SHALL operate without a backend server.
5. WHERE the Visualizer is loaded as a browser extension, THE Visualizer SHALL display the Input Form, Total Balance, Transaction List, and Pie Chart.

### Requirement 8: Browser Compatibility and Performance

**User Story:** As a user, I want the application to load quickly and work across modern browsers, so that I can use it reliably regardless of browser choice.

#### Acceptance Criteria

1. THE Visualizer SHALL display the interface and allow Transactions to be added and deleted without errors in Chrome, Firefox, Edge, and Safari.
2. WHEN the Visualizer is loaded, THE Visualizer SHALL display the interface within 1 second.
3. WHEN a Transaction is added or deleted, THE Visualizer SHALL update the interface within 100 milliseconds to reflect the change.

### Requirement 9: Interface Clarity

**User Story:** As a user, I want a clean and minimal interface, so that the application is easy to understand and use.

#### Acceptance Criteria

1. THE Visualizer SHALL present a single-page interface containing only the Input Form, Total Balance, Transaction List, and Pie Chart.
2. THE Visualizer SHALL apply the same typographic treatment to all headings and the same typographic treatment to all body content, rendering headings at a larger font size than body content so that headings are visually distinguishable from body content.
