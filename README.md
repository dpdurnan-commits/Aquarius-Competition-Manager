# Aquarius Competition Manager

A full-stack application for managing golf competition accounts, tracking transactions, and monitoring competition winnings. Built with TypeScript backend and vanilla JavaScript frontend.

## 🚀 Quick Links

- **[Production Deployment Guide](RAILWAY_QUICK_START.md)** - Deploy to Railway in minutes
- **[Complete Deployment Documentation](RAILWAY_DEPLOYMENT.md)** - Detailed deployment instructions
- **[Production Checklist](PRODUCTION_CHECKLIST.md)** - Pre-deployment verification
- **[Deployment Summary](DEPLOYMENT_SUMMARY.md)** - Configuration overview

## Features

### Core Functionality
- **CSV Import**: Import transaction data from CSV files with automatic validation
- **Transaction Management**: View and manage all competition-related transactions
- **Weekly Summaries**: Automatic calculation of weekly financial summaries
- **Competition Purse Tracking**: Monitor the competition purse balance over time
- **Competition Pot Tracking**: Track the competition pot with accurate winnings calculations

### Competition Management
- **Competition Creation**: Create and manage singles and doubles competitions
- **Presentation Seasons**: Organize competitions into presentation seasons
- **Results Import**: Import competition results via CSV
- **Swindle Money Tracking**: Track and reconcile swindle money payments

### Competition Accounts
- **Entry Fee Tracking**: Monitor entry fees for all competitions
- **Winnings Reconciliation**: Match winnings to competition results
- **Payment Status**: Track paid/unpaid status for entries and winnings
- **Player Balances**: View account balances for each player

### Presentation Night Winnings Distribution
- **Winnings Assignment**: Assign cash amounts to competition winners
- **Competition Costs**: Record general competition expenses (engravings, equipment, etc.)
- **Cost History**: View and filter competition costs by date
- **Competition Pot**: Automatic calculation including all costs and distributions
- **Form Persistence**: Uncommitted entries saved in browser storage

### Competition Winnings Tracking
- **Transaction Flagging**: Mark "Topup (Competitions)" transactions as prize winnings
- **Competition Association**: Link flagged transactions to specific competitions
- **Weekly Drill-Down**: Click any week to view and flag individual transactions
- **Retrospective Flagging**: Flag historical transactions with automatic recalculation
- **Visual Indicators**: Clear visual feedback for flagged transactions

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Security**: Helmet, CORS, Rate Limiting
- **Testing**: Jest + Supertest
- **Property-Based Testing**: fast-check

### Frontend
- **Language**: Vanilla JavaScript (ES6+)
- **API Client**: Fetch API with retry logic
- **Testing**: Jest + jsdom
- **Property-Based Testing**: fast-check

### Deployment
- **Platform**: Railway (Docker-based)
- **Database**: Railway PostgreSQL
- **Static Files**: Served from backend

## Getting Started

### Local Development

#### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL >= 14
- Modern web browser

#### Installation

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (for testing)
cd ..
npm install
```

#### Configuration

1. Copy environment file:
```bash
cd backend
cp .env.example .env
```

2. Update `.env` with your local PostgreSQL credentials

#### Running Locally

```bash
# Start backend server
cd backend
npm run dev

# Backend runs on http://localhost:3000
# Frontend is served from http://localhost:3000
```

#### Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd ..
npm test
```

## Production Deployment

### Deploy to Railway

1. **Prepare Application**:
   ```powershell
   # Windows
   .\deploy-to-production.ps1
   
   # Mac/Linux
   ./deploy-to-production.sh
   ```

2. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for production"
   git push origin main
   ```

3. **Deploy on Railway**:
   - Create new project from GitHub repo
   - Add PostgreSQL database
   - Configure environment variables
   - Railway auto-deploys

For detailed instructions, see [RAILWAY_QUICK_START.md](RAILWAY_QUICK_START.md)

### Environment Variables

Required for production:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=<auto-set-by-railway>
JWT_SECRET=<generate-with-openssl>
CORS_ORIGINS=<your-railway-url>
```

See [backend/.env.production.example](backend/.env.production.example) for complete list.

## Project Structure

```
.
├── backend/                 # Backend application
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── db/            # Database migrations
│   │   └── types/         # TypeScript types
│   ├── public/            # Frontend static files (production)
│   ├── Dockerfile         # Docker configuration
│   └── railway.json       # Railway configuration
├── *.js                   # Frontend JavaScript files
├── *.css                  # Frontend styles
├── index.html            # Frontend HTML
└── deploy-to-production.* # Deployment scripts
```

## API Documentation

When running locally, API documentation is available at:
- Swagger UI: http://localhost:3000/api/docs
- OpenAPI JSON: http://localhost:3000/api/docs/openapi.json

## Database Schema

The application uses PostgreSQL with the following main tables:
- `transactions` - All transaction records
- `competitions` - Competition definitions
- `competition_results` - Competition results and player data
- `presentation_seasons` - Presentation season groupings
- `presentation_night_distributions` - Winnings distributions
- `competition_costs` - General competition expenses
- `flagged_transactions` - Prize winning transactions

Migrations are located in `backend/src/db/migrations/`

## Development

### Running Tests

```bash
# Backend unit tests
cd backend
npm test

# Backend integration tests
npm run test:integration

# Frontend tests
cd ..
npm test

# All tests
npm run test:all
```

### Database Management

```bash
# Reset local database
cd backend
npm run db:reset

# Verify schema
npm run db:verify
```

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
