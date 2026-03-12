# Competition Account Management System

A browser-based application for managing golf competition accounts, tracking transactions, and monitoring competition winnings.

## Features

### Core Functionality
- **CSV Import**: Import transaction data from CSV files with automatic validation
- **Transaction Management**: View and manage all competition-related transactions
- **Weekly Summaries**: Automatic calculation of weekly financial summaries
- **Competition Purse Tracking**: Monitor the competition purse balance over time
- **Competition Pot Tracking**: Track the competition pot with accurate winnings calculations

### Competition Winnings Tracking (New)
- **Competition Management**: Create, edit, and delete named competitions
- **Transaction Flagging**: Mark "Topup (Competitions)" transactions as prize winnings
- **Competition Association**: Link flagged transactions to specific competitions
- **Weekly Drill-Down**: Click any week to view and flag individual transactions
- **Retrospective Flagging**: Flag historical transactions with automatic recalculation
- **Visual Indicators**: Clear visual feedback for flagged transactions and competition associations

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Storage**: IndexedDB for client-side data persistence
- **Testing**: Jest + jsdom for unit and integration tests
- **Property-Based Testing**: fast-check for correctness validation
- **Build**: Webpack for bundling

## Getting Started

### Prerequisites

- Node.js >= 14.0.0
- Modern web browser with IndexedDB support

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run property-based tests
npm test -- integration.pbt.test.js
```

### Usage

1. Open `index.html` in a modern web browser
2. Click "Choose File" to select a CSV file
3. Click "Import CSV" to load transaction data
4. View transactions in the "Transformed Records" section
5. View weekly summaries in the "Transaction Summary" table

## Competition Winnings Tracking

### Managing Competitions

1. Click the "Manage Competitions" button in the header
2. Enter a competition name and click "Add Competition"
3. Edit or delete competitions using the action buttons
4. Note: Competitions with flagged transactions cannot be deleted

### Flagging Transactions as Winnings

**From the Transformed Records View:**
1. Locate a "Topup (Competitions)" transaction
2. Click the "Flag as Winnings" button
3. Select the competition from the modal
4. The transaction is now flagged and the weekly summary updates automatically

**From the Weekly Drill-Down View:**
1. Click any row in the "Transaction Summary" table
2. A modal opens showing all transactions for that week
3. Flag transactions using the same process as above
4. Both the drill-down view and weekly summary update automatically

### Editing or Removing Flags

1. Click the "Edit Flag" button on a flagged transaction
2. Choose a different competition or click "Remove Flag"
3. The weekly summary recalculates automatically

### Understanding the Weekly Summary

The "Aquarius Golf-Competition Transaction Summary" table shows:

**Competition Purse Columns:**
- Starting Purse: Balance at the beginning of the week
- Application Top-Up: Money added via application
- Till Top-Up: Money added via till
- Competition Entries: Entry fees collected
- Competition Refunds: Refunds issued
- Final Purse: Ending balance for the week

**Competition Pot Columns:**
- Starting Pot: Prize money available at the start
- Competition Winnings Paid: Total flagged winnings for the week
- Competition Costs: Expenses (placeholder)
- Final Pot: Remaining prize money

## CSV File Format

The system expects CSV files with the following columns:

```
Date,Time,Till,Type,Member,Player,Competition,Price,Discount,Subtotal,VAT,Total
```

### Example Row:
```
26-08-2025,18:19,Till 1,Topup (Competitions),Alastair REID,,October Medal,50.00,0.00,50.00,0.00,50.00
```

### Transaction Types:
- `Topup (Competitions)`: Competition account top-ups (can be flagged as winnings)
- `Topup (Application)`: Application-based top-ups
- `Competition Entry`: Entry fees
- `Competition Refund`: Refunds issued

## Data Storage

All data is stored locally in your browser using IndexedDB:

- **Database Name**: `CompetitionAccountDB`
- **Version**: 2
- **Object Stores**:
  - `summarised_period_transactions`: Transaction records with flagging fields
  - `competitions`: Competition definitions

### Data Persistence

- Data persists across browser sessions
- Data is specific to the browser and domain
- Clearing browser data will delete all stored information
- No data is sent to external servers

## Testing

### Unit Tests

Test individual components in isolation:

```bash
# Run all unit tests
npm test

# Run specific component tests
npm test -- databaseManager.test.js
npm test -- competitionManager.test.js
npm test -- transactionFlagger.test.js
```

### Integration Tests

Test complete workflows:

```bash
# Run integration tests
npm test -- integration.test.js
npm test -- integration.e2e.test.js
```

### Property-Based Tests

Validate correctness properties:

```bash
# Run property-based tests
npm test -- integration.pbt.test.js
npm test -- winnings-tracking.pbt.test.js
```

## Architecture

### Components

- **Database Manager**: IndexedDB operations and schema management
- **CSV Parser**: Parse and validate CSV files
- **Field Extractor**: Extract and transform transaction fields
- **Chronological Validator**: Ensure transactions are in chronological order
- **Weekly Summarizer**: Calculate weekly financial summaries
- **Transaction Summary View**: Display weekly summary table
- **Competition Manager**: CRUD operations for competitions
- **Transaction Flagger**: Flag transactions as winnings
- **Weekly Drill-Down View**: Display and flag transactions for a specific week
- **Competition Manager UI**: User interface for managing competitions

### Data Flow

```
CSV File → Parser → Transformer → Field Extractor → 
Chronological Validator → Database Manager → IndexedDB →
Weekly Summarizer → Transaction Summary View
```

### Flagging Flow

```
User clicks flag → Competition Selection → Transaction Flagger →
Database Update → Weekly Summarizer Recalculation →
UI Refresh
```

## Troubleshooting

### Import Fails

- **Check CSV format**: Ensure all required columns are present
- **Check date format**: Dates should be in DD-MM-YYYY format
- **Check chronological order**: Transactions must be in date/time order

### Flagging Fails

- **Only "Topup (Competitions)" can be flagged**: Other transaction types cannot be marked as winnings
- **Competition must exist**: Create competitions before flagging transactions
- **Database errors**: Check browser console for detailed error messages

### Weekly Summary Incorrect

- **Recalculation**: Flag or unflag any transaction to trigger recalculation
- **Clear and reimport**: Delete all data and reimport CSV if issues persist

### Competition Cannot Be Deleted

- **Check for flagged transactions**: Unflag all transactions associated with the competition first
- **Error message shows count**: The deletion error displays how many transactions are linked

## Browser Compatibility

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported (version 14+)
- Internet Explorer: ❌ Not supported

## Performance

- Handles 1000+ transactions efficiently
- Weekly summary recalculation: < 200ms for 50 weeks
- Transaction flagging: < 100ms
- Drill-down view load: < 150ms for 100 transactions

## Security

- All data stored locally in browser
- No external API calls
- No user authentication required
- Data isolated per browser/domain

## Future Enhancements

- Export flagged transactions to CSV
- Competition statistics and reports
- Multi-year support
- Competition cost tracking
- Bulk flagging operations
- Search and filter transactions

## License

Private project for golf club competition management.

## Support

For questions or issues, contact the development team.
