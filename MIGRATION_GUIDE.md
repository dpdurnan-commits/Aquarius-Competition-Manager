# Database Migration Guide - Competition Results Management

## Overview

This guide provides step-by-step instructions for migrating the Competition Results Management feature to production. The migration adds three new tables and extends the existing competitions table to support presentation seasons, competition types, and detailed result tracking.

## Migration Files

The following migration files are included in this feature:

1. **003_create_presentation_seasons.sql** - Creates the presentation_seasons table
2. **004_extend_competitions.sql** - Adds season_id and type columns to competitions table
3. **005_create_competition_results.sql** - Creates the competition_results table

## Pre-Migration Checklist

Before running migrations in production, complete these steps:

### 1. Backup Your Database

**Critical:** Always backup your database before running migrations.

```bash
# PostgreSQL backup command
pg_dump -h <host> -U <username> -d <database> -F c -b -v -f backup_$(date +%Y%m%d_%H%M%S).dump

# Example
pg_dump -h localhost -U postgres -d aquarius_golf -F c -b -v -f backup_20250115_120000.dump
```

**Verify the backup:**
```bash
# Check backup file size
ls -lh backup_*.dump

# Test restore to a test database (recommended)
createdb aquarius_golf_test
pg_restore -h localhost -U postgres -d aquarius_golf_test backup_20250115_120000.dump
```

### 2. Review Current Database State

Check your current schema version and existing data:

```sql
-- Check if migrations table exists
SELECT * FROM schema_migrations ORDER BY version;

-- Check existing competitions
SELECT COUNT(*) FROM competitions;

-- Check for any custom indexes or constraints
SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public';
```

### 3. Test in Staging Environment

**Never run migrations directly in production without testing first.**

1. Restore production backup to staging database
2. Run migrations in staging
3. Verify data integrity
4. Test application functionality
5. Document any issues or adjustments needed

### 4. Schedule Maintenance Window

Migrations require brief downtime:
- Estimated time: 5-10 minutes for typical database sizes
- Recommended: Schedule during low-traffic period
- Notify users of planned maintenance

## Migration Steps

### Step 1: Connect to Production Database

```bash
# Set environment variables
export PGHOST=<your-host>
export PGPORT=5432
export PGDATABASE=<your-database>
export PGUSER=<your-username>
export PGPASSWORD=<your-password>

# Or use connection string
export DATABASE_URL="postgresql://user:pass@host:5432/database"

# Test connection
psql -c "SELECT version();"
```

### Step 2: Run Migrations

**Option A: Automatic Migration (Recommended)**

The backend automatically runs migrations on startup:

```bash
# Build the application
npm run build

# Start the server (migrations run automatically)
npm start
```

The server will:
1. Check for pending migrations
2. Run them in order
3. Record completion in schema_migrations table
4. Start the application

**Option B: Manual Migration**

Run migrations manually using psql:

```bash
# Navigate to migrations directory
cd backend/src/db/migrations

# Run each migration in order
psql -f 003_create_presentation_seasons.sql
psql -f 004_extend_competitions.sql
psql -f 005_create_competition_results.sql
```

### Step 3: Verify Migration Success

After migrations complete, verify the changes:

```sql
-- Check schema_migrations table
SELECT * FROM schema_migrations ORDER BY version;
-- Should show: 003, 004, 005

-- Verify presentation_seasons table
\d presentation_seasons
SELECT COUNT(*) FROM presentation_seasons;

-- Verify competitions table extensions
\d competitions
-- Should show: season_id, type columns

-- Verify competition_results table
\d competition_results
SELECT COUNT(*) FROM competition_results;

-- Check indexes
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('presentation_seasons', 'competitions', 'competition_results');
```

### Step 4: Verify Data Integrity

Run these queries to ensure data integrity:

```sql
-- Check for NULL season_ids (expected for existing competitions)
SELECT COUNT(*) FROM competitions WHERE season_id IS NULL;

-- Check competition types (should all be 'singles' by default)
SELECT type, COUNT(*) FROM competitions GROUP BY type;

-- Verify foreign key constraints
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f'
AND conrelid::regclass::text IN ('competitions', 'competition_results');

-- Verify unique constraints
SELECT conname, conrelid::regclass
FROM pg_constraint
WHERE contype = 'u'
AND conrelid::regclass::text IN ('presentation_seasons');
```

### Step 5: Post-Migration Data Setup

After successful migration, set up initial data:

```sql
-- Create initial presentation season
INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
VALUES ('Season: Winter 25-Summer 26', 25, 26, true);

-- Update existing competitions to reference the season (optional)
UPDATE competitions 
SET season_id = (SELECT id FROM presentation_seasons WHERE is_active = true)
WHERE season_id IS NULL;
```

## Rollback Procedures

If migration fails or issues are discovered, follow these rollback steps:

### Immediate Rollback (During Migration)

If migration fails mid-process:

```sql
-- Rollback current transaction (if in transaction)
ROLLBACK;

-- Restore from backup
pg_restore -h localhost -U postgres -d aquarius_golf --clean backup_20250115_120000.dump
```

### Post-Migration Rollback

If issues are discovered after migration completes:

```bash
# Stop the application
# (prevents new data from being written)

# Restore from backup
pg_restore -h localhost -U postgres -d aquarius_golf --clean backup_20250115_120000.dump

# Verify restoration
psql -c "SELECT COUNT(*) FROM competitions;"
psql -c "SELECT * FROM schema_migrations ORDER BY version;"

# Restart application with old version
```

### Partial Rollback (Specific Tables)

To rollback only the new tables while keeping existing data:

```sql
-- Drop new tables (in reverse order)
DROP TABLE IF EXISTS competition_results CASCADE;
ALTER TABLE competitions DROP COLUMN IF EXISTS season_id;
ALTER TABLE competitions DROP COLUMN IF EXISTS type;
DROP TABLE IF EXISTS presentation_seasons CASCADE;

-- Remove migration records
DELETE FROM schema_migrations WHERE version IN ('003', '004', '005');
```

## Testing Procedures

### Pre-Production Testing

Test these scenarios in staging before production migration:

#### 1. Basic CRUD Operations

```sql
-- Create presentation season
INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
VALUES ('Season: Winter 25-Summer 26', 25, 26, true);

-- Create competition
INSERT INTO competitions (name, date, type, season_id)
VALUES ('Test Medal', '2025-01-15', 'singles', 1);

-- Create competition result
INSERT INTO competition_results (
  competition_id, finishing_position, player_name, 
  gross_score, handicap, nett_score
)
VALUES (1, 1, 'John SMITH', 85, 12, 73);

-- Verify data
SELECT * FROM presentation_seasons;
SELECT * FROM competitions;
SELECT * FROM competition_results;
```

#### 2. Foreign Key Constraints

```sql
-- Test: Cannot create competition with invalid season_id
INSERT INTO competitions (name, date, type, season_id)
VALUES ('Invalid Competition', '2025-01-15', 'singles', 9999);
-- Should fail with foreign key constraint error

-- Test: Cannot create result with invalid competition_id
INSERT INTO competition_results (competition_id, finishing_position, player_name)
VALUES (9999, 1, 'Test Player');
-- Should fail with foreign key constraint error
```

#### 3. Cascade Deletes

```sql
-- Test: Deleting competition cascades to results
INSERT INTO competitions (name, date, type, season_id)
VALUES ('Test Competition', '2025-01-15', 'singles', 1)
RETURNING id;

INSERT INTO competition_results (competition_id, finishing_position, player_name)
VALUES (LAST_INSERT_ID, 1, 'Test Player');

DELETE FROM competitions WHERE name = 'Test Competition';

-- Verify result was deleted
SELECT COUNT(*) FROM competition_results WHERE competition_id = LAST_INSERT_ID;
-- Should return 0
```

#### 4. Active Season Uniqueness

```sql
-- Test: Only one active season allowed
INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
VALUES ('Season: Winter 26-Summer 27', 26, 27, true);
-- Should fail with unique constraint error

-- Or should deactivate previous season (depending on implementation)
SELECT name, is_active FROM presentation_seasons;
-- Should show only one is_active = true
```

#### 5. Performance Testing

```sql
-- Test query performance with indexes
EXPLAIN ANALYZE
SELECT cr.* FROM competition_results cr
JOIN competitions c ON cr.competition_id = c.id
WHERE c.season_id = 1
ORDER BY cr.finishing_position;

-- Should use indexes, not sequential scans
```

### Post-Migration Testing

After production migration, test these scenarios:

1. **Application Startup**
   - Verify application starts without errors
   - Check logs for migration success messages
   - Verify API endpoints respond

2. **API Endpoints**
   ```bash
   # Test presentation seasons endpoint
   curl http://localhost:3000/api/presentation-seasons
   
   # Test competitions endpoint
   curl http://localhost:3000/api/competitions
   
   # Test competition results endpoint
   curl http://localhost:3000/api/competition-results?competition_id=1
   ```

3. **Frontend Functionality**
   - Open Competition Accounts view
   - Create a presentation season
   - Create a competition
   - Upload CSV results
   - Verify data displays correctly

4. **Data Integrity**
   - Verify existing competitions still display
   - Check that flagged transactions still work
   - Verify weekly summaries calculate correctly

## Troubleshooting

### Common Migration Issues

#### Issue: Migration fails with "relation already exists"

**Cause:** Migration was partially run before.

**Solution:**
```sql
-- Check what exists
\dt presentation_seasons
\dt competition_results
\d competitions

-- Drop existing objects and re-run
DROP TABLE IF EXISTS competition_results CASCADE;
DROP TABLE IF EXISTS presentation_seasons CASCADE;
ALTER TABLE competitions DROP COLUMN IF EXISTS season_id;
ALTER TABLE competitions DROP COLUMN IF EXISTS type;

-- Re-run migrations
```

#### Issue: Foreign key constraint violation

**Cause:** Existing data references non-existent records.

**Solution:**
```sql
-- Find orphaned records
SELECT * FROM competitions WHERE season_id IS NOT NULL 
AND season_id NOT IN (SELECT id FROM presentation_seasons);

-- Fix by setting to NULL or creating missing season
UPDATE competitions SET season_id = NULL WHERE season_id NOT IN (SELECT id FROM presentation_seasons);
```

#### Issue: Unique constraint violation on active season

**Cause:** Multiple seasons marked as active.

**Solution:**
```sql
-- Find multiple active seasons
SELECT * FROM presentation_seasons WHERE is_active = true;

-- Keep only one active
UPDATE presentation_seasons SET is_active = false;
UPDATE presentation_seasons SET is_active = true WHERE id = <desired_id>;
```

#### Issue: Index creation fails

**Cause:** Insufficient disk space or permissions.

**Solution:**
```sql
-- Check disk space
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Check permissions
SELECT has_table_privilege('competitions', 'INSERT');

-- Manually create missing indexes
CREATE INDEX idx_competitions_season_id ON competitions(season_id);
```

#### Issue: Migration timeout

**Cause:** Large database or slow server.

**Solution:**
```sql
-- Increase statement timeout
SET statement_timeout = '10min';

-- Run migrations with increased timeout
psql -v ON_ERROR_STOP=1 -f migration.sql
```

## Monitoring and Validation

### Post-Migration Monitoring

Monitor these metrics after migration:

1. **Query Performance**
   ```sql
   -- Check slow queries
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   WHERE query LIKE '%competition%'
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

2. **Table Sizes**
   ```sql
   -- Monitor table growth
   SELECT 
     tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename IN ('presentation_seasons', 'competitions', 'competition_results')
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

3. **Index Usage**
   ```sql
   -- Verify indexes are being used
   SELECT 
     schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes
   WHERE tablename IN ('presentation_seasons', 'competitions', 'competition_results')
   ORDER BY idx_scan DESC;
   ```

4. **Error Logs**
   ```bash
   # Check application logs
   tail -f /var/log/application.log | grep -i error
   
   # Check PostgreSQL logs
   tail -f /var/log/postgresql/postgresql-*.log | grep -i error
   ```

### Data Validation Queries

Run these queries periodically to ensure data integrity:

```sql
-- Verify referential integrity
SELECT 'Orphaned competitions' AS issue, COUNT(*) AS count
FROM competitions 
WHERE season_id IS NOT NULL 
AND season_id NOT IN (SELECT id FROM presentation_seasons)
UNION ALL
SELECT 'Orphaned results', COUNT(*)
FROM competition_results
WHERE competition_id NOT IN (SELECT id FROM competitions)
UNION ALL
SELECT 'Multiple active seasons', COUNT(*) - 1
FROM presentation_seasons
WHERE is_active = true;

-- Verify constraints
SELECT 'Invalid positions' AS issue, COUNT(*) AS count
FROM competition_results
WHERE finishing_position <= 0
UNION ALL
SELECT 'Negative swindle money', COUNT(*)
FROM competition_results
WHERE swindle_money_paid < 0
UNION ALL
SELECT 'Invalid competition types', COUNT(*)
FROM competitions
WHERE type NOT IN ('singles', 'doubles');
```

## Support and Escalation

### Getting Help

If you encounter issues during migration:

1. **Check this guide** - Review troubleshooting section
2. **Check application logs** - Look for specific error messages
3. **Check database logs** - PostgreSQL logs may have details
4. **Restore from backup** - If critical issues, restore and retry
5. **Contact support** - Provide logs and error messages

### Required Information for Support

When requesting help, provide:

- Database version: `SELECT version();`
- Migration files used
- Error messages (full text)
- Application logs
- Database logs
- Steps taken before error occurred
- Current database state (table list, row counts)

## Appendix

### Migration File Contents

#### 003_create_presentation_seasons.sql

Creates the presentation_seasons table with:
- Unique season names
- Year validation (start_year <= end_year)
- Active season uniqueness constraint
- Chronological ordering index

#### 004_extend_competitions.sql

Extends competitions table with:
- season_id foreign key to presentation_seasons
- type column ('singles' or 'doubles')
- Default type='singles' for backward compatibility
- Indexes for filtering and performance

#### 005_create_competition_results.sql

Creates competition_results table with:
- Foreign key to competitions (cascade delete)
- Position, name, scores, payment tracking
- Indexes for queries and name matching
- Constraints for data validation

### Useful SQL Commands

```sql
-- View all tables
\dt

-- View table structure
\d table_name

-- View indexes
\di

-- View constraints
\d+ table_name

-- View foreign keys
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint WHERE contype = 'f';

-- View table sizes
SELECT pg_size_pretty(pg_total_relation_size('table_name'));

-- Vacuum and analyze (after large data changes)
VACUUM ANALYZE;
```

## Conclusion

Following this guide ensures a safe and successful migration of the Competition Results Management feature. Always test in staging first, maintain backups, and monitor the system after migration.

For questions or issues, refer to the troubleshooting section or contact your database administrator.
