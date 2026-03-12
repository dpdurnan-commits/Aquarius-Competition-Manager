# Troubleshooting Guide

## Common Issues and Solutions

### Frontend Can't Connect to Backend

**Symptoms:**
- Network errors in browser console
- "Failed to fetch" errors
- Transactions not loading

**Solutions:**
1. Verify backend is running:
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok",...}`

2. Check CORS configuration in backend/.env:
   ```
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080
   ```

3. Restart backend server:
   ```bash
   cd backend
   npm run dev
   ```

### Database Connection Failed

**Symptoms:**
- Backend won't start
- "Unable to connect to database" error

**Solutions:**
1. Verify PostgreSQL is running:
   ```bash
   psql -h localhost -U postgres -c "SELECT version();"
   ```

2. Check database exists:
   ```bash
   psql -h localhost -U postgres -l | grep competition_account_test
   ```

3. Create database if missing:
   ```bash
   psql -h localhost -U postgres -c "CREATE DATABASE competition_account_test;"
   ```

4. Verify credentials in backend/.env:
   ```
   DATABASE_URL=postgresql://postgres:Letsdance@localhost:5432/competition_account_test
   ```

### Port Already in Use

**Symptoms:**
- "EADDRINUSE" error
- "Port 3000 is already in use"

**Solutions:**
1. Find process using the port:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # Kill the process
   taskkill /PID <PID> /F
   ```

2. Or use a different port in backend/.env:
   ```
   PORT=3001
   ```

### CSV Import Fails

**Symptoms:**
- "Chronological validation failed" error
- Import rejected

**Solutions:**
1. This is expected behavior if importing older data
2. Clear existing data first:
   ```bash
   curl -X DELETE http://localhost:3000/api/transactions
   ```
3. Then import your CSV

### Frontend Shows Old Data

**Symptoms:**
- Changes not appearing
- Stale data displayed

**Solutions:**
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Check browser console for errors

### Migrations Not Running

**Symptoms:**
- "relation does not exist" errors
- Missing tables

**Solutions:**
1. Check migrations directory exists:
   ```bash
   ls backend/src/db/migrations/
   ```

2. Manually run migrations:
   ```bash
   cd backend
   npm run dev
   ```
   Migrations run automatically on startup in development mode

3. Or connect to database and check:
   ```sql
   SELECT * FROM migrations;
   ```

### TypeScript Compilation Errors

**Symptoms:**
- Backend won't start
- TypeScript errors in terminal

**Solutions:**
1. Clean and rebuild:
   ```bash
   cd backend
   rm -rf dist
   npm run build
   ```

2. Check for missing dependencies:
   ```bash
   npm install
   ```

### API Returns 404

**Symptoms:**
- "Cannot GET /api/..." errors
- Routes not found

**Solutions:**
1. Verify route exists in backend/src/routes/
2. Check route is registered in backend/src/server.ts
3. Restart backend server

### CORS Errors in Browser

**Symptoms:**
- "CORS policy" errors in console
- "Access-Control-Allow-Origin" errors

**Solutions:**
1. Add your frontend URL to CORS_ORIGINS in backend/.env:
   ```
   CORS_ORIGINS=http://localhost:8080
   ```

2. Restart backend server

3. Verify CORS middleware is enabled in backend/src/server.ts

### Health Check Fails

**Symptoms:**
- /health returns 503
- Database health check fails

**Solutions:**
1. Check database connection:
   ```bash
   psql -h localhost -U postgres -d competition_account_test -c "SELECT 1;"
   ```

2. Verify DATABASE_URL in backend/.env

3. Check PostgreSQL service is running

## Debugging Tips

### Enable Verbose Logging

In backend/.env:
```
NODE_ENV=development
```

This enables:
- Detailed error messages
- SQL query logging
- Request/response logging

### Check Backend Logs

Watch the terminal where backend is running for:
- Database queries
- API requests
- Error stack traces

### Check Browser Console

Press F12 in browser and check:
- Console tab for JavaScript errors
- Network tab for API requests
- Application tab for storage

### Test API Directly

Use curl to test endpoints:
```bash
# Health check
curl http://localhost:3000/health

# Get transactions
curl http://localhost:3000/api/transactions

# Import test data
curl -X POST http://localhost:3000/api/transactions/import \
  -H "Content-Type: application/json" \
  -d '[{"date":"2024-01-01","time":"12:00:00","type":"Sale","total":"10.00","till":"Till 1","member":"","player":"","competition":"","price":"10.00","discount":"0.00","subtotal":"10.00","vat":"0.00","sourceRowIndex":1,"isComplete":true}]'
```

### Check Database Directly

Connect with psql:
```bash
psql -h localhost -U postgres -d competition_account_test
```

Useful queries:
```sql
-- Check tables exist
\dt

-- View transactions
SELECT * FROM transactions LIMIT 5;

-- Check migrations
SELECT * FROM migrations;

-- Clear all data
TRUNCATE transactions, competitions, flagged_transactions CASCADE;
```

## Getting Help

If you're still stuck:

1. **Check the logs**: Backend terminal and browser console
2. **Verify services**: Both backend and frontend running
3. **Test API**: Use curl to isolate frontend vs backend issues
4. **Check database**: Verify PostgreSQL is accessible
5. **Review configuration**: Check .env file settings

## Quick Reset

To start fresh:

```bash
# Stop all services (Ctrl+C in terminals)

# Clear database
psql -h localhost -U postgres -d competition_account_test -c "TRUNCATE transactions, competitions, flagged_transactions CASCADE;"

# Restart backend
cd backend
npm run dev

# Restart frontend (in new terminal)
npx http-server -p 8080 -c-1

# Open browser
# http://localhost:8080
```

## Performance Issues

### Slow Queries

1. Check indexes exist:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'transactions';
   ```

2. Verify migration 002_create_indexes.sql ran

### Slow CSV Import

1. Check file size (limit is 10MB)
2. Monitor backend terminal for progress
3. Large imports may take 5-10 seconds

### High Memory Usage

1. Check connection pool settings in backend/.env:
   ```
   DB_POOL_MIN=2
   DB_POOL_MAX=10
   ```

2. Restart backend to reset connections

## Still Having Issues?

Document the following:
1. What you were trying to do
2. Exact error message
3. Backend terminal output
4. Browser console output
5. Steps to reproduce

This will help diagnose the issue quickly.
