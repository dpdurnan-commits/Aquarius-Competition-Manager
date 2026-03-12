# Database Reset Guide

## Resetting Your Local Database

If you need to start fresh with a clean database (useful when testing new features or after schema changes), you can reset your local database.

### Quick Reset

```bash
cd backend
npm run db:reset
```

This will:
1. Drop all tables in your local database
2. Re-run all migrations from scratch
3. Give you a fresh, empty database with the latest schema

### Safety Features

The reset script includes multiple safety checks:
- ✅ Only works with local databases
- ✅ Blocks production environments
- ✅ Blocks cloud databases (Railway, Heroku, AWS)
- ✅ Requires DATABASE_URL in .env

### What Gets Deleted

⚠️ **WARNING**: This deletes ALL data including:
- All transactions
- All competitions
- All competition results
- All flagged transactions
- All presentation seasons
- Everything else in your database

### When to Use This

Use `npm run db:reset` when you want to:
- Test new features with clean data
- Fix migration issues
- Start over after experimenting
- Clear out test data that accumulated during development

### Alternative: Test Database

For running tests without affecting your development data, use the test database:

```bash
npm run test:setup  # Sets up test database
npm test            # Runs tests against test database
```

The test database is separate and won't interfere with your development data.

### Manual Reset (Alternative Method)

If you prefer to do it manually:

```bash
# Connect to your database
psql -d competition_account

# Drop all tables
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Exit psql
\q

# Run migrations
npm run migrate
```

### Troubleshooting

**Error: DATABASE_URL not found**
- Make sure you have a `.env` file in the backend directory
- Copy from `.env.example` if needed

**Error: Cannot connect to database**
- Make sure PostgreSQL is running
- Check your DATABASE_URL is correct
- Verify database exists: `psql -l`

**Error: Permission denied**
- Make sure your database user has DROP TABLE permissions
- You may need to use a superuser account for local development
