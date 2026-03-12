# Environment Variables Reference

This document provides a complete reference for all environment variables used by the Competition Account Management backend.

## Required Variables

### DATABASE_URL
- **Description:** PostgreSQL database connection string
- **Format:** `postgresql://username:password@host:port/database`
- **Required:** Yes (all environments)
- **Example (Local):** `postgresql://postgres:postgres@localhost:5432/competition_account`
- **Example (Railway):** `postgresql://postgres:pass@containers-us-west-123.railway.app:5432/railway`
- **Example (Heroku):** `postgres://user:pass@ec2-host.compute-1.amazonaws.com:5432/dbname`
- **Notes:** 
  - Cloud providers typically set this automatically
  - SSL is automatically enabled in production
  - Add `?sslmode=require` for explicit SSL requirement

### JWT_SECRET
- **Description:** Secret key for signing JWT authentication tokens
- **Format:** String (minimum 32 characters recommended)
- **Required:** Yes (production), No (development - uses default)
- **Generate:** `openssl rand -base64 32`
- **Example:** `a8f5f167f44f4964e6c998dee827110c`
- **Security:** 
  - NEVER commit this to version control
  - Use different secrets for each environment
  - Rotate periodically for security

### CORS_ORIGINS
- **Description:** Comma-separated list of allowed origins for CORS
- **Format:** `https://domain1.com,https://domain2.com`
- **Required:** Yes (production), No (development - allows all)
- **Example (Development):** `http://localhost:3000,http://localhost:5173`
- **Example (Production):** `https://yourdomain.com,https://www.yourdomain.com`
- **Notes:**
  - Must include protocol (http:// or https://)
  - No trailing slashes
  - Exact match required (including subdomains)

## Optional Variables

### NODE_ENV
- **Description:** Application environment mode
- **Format:** `development` | `production` | `test`
- **Default:** `development`
- **Example:** `production`
- **Effects:**
  - `development`: Verbose errors, CORS allows all, detailed logging
  - `production`: Generic errors, restricted CORS, trust proxy enabled
  - `test`: Test database, minimal logging

### PORT
- **Description:** HTTP server port
- **Format:** Integer (1-65535)
- **Default:** `3000`
- **Example:** `8080`
- **Notes:**
  - Cloud platforms typically set this automatically
  - Railway uses dynamic ports
  - Heroku sets this via $PORT

### MAX_FILE_SIZE
- **Description:** Maximum file upload size in bytes
- **Format:** Integer (bytes)
- **Default:** `10485760` (10 MB)
- **Example:** `52428800` (50 MB)
- **Notes:**
  - Applies to CSV imports and backup uploads
  - Platform limits may override this (Heroku: 30MB)
  - Larger files require more memory

### DB_POOL_MIN
- **Description:** Minimum number of database connections in pool
- **Format:** Integer (1-100)
- **Default:** `2`
- **Example:** `5`
- **Notes:**
  - Connections are kept alive even when idle
  - Higher values = faster response but more resources
  - Adjust based on database plan limits

### DB_POOL_MAX
- **Description:** Maximum number of database connections in pool
- **Format:** Integer (1-100)
- **Default:** `10`
- **Example:** `20`
- **Notes:**
  - Must not exceed database connection limit
  - Railway free tier: ~20 connections
  - Heroku mini: ~20 connections
  - AWS RDS t3.micro: ~100 connections

## Environment-Specific Examples

### Local Development (.env)
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/competition_account
JWT_SECRET=dev-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
MAX_FILE_SIZE=10485760
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Railway Production
```bash
# Set via Railway CLI or dashboard
NODE_ENV=production
DATABASE_URL=<automatically set by Railway>
JWT_SECRET=<generate with: openssl rand -base64 32>
CORS_ORIGINS=https://yourdomain.com
DB_POOL_MAX=10
```

### Heroku Production
```bash
# Set via Heroku CLI or dashboard
NODE_ENV=production
DATABASE_URL=<automatically set by Heroku>
JWT_SECRET=<generate with: openssl rand -base64 32>
CORS_ORIGINS=https://your-app.herokuapp.com
DB_POOL_MAX=10
```

### Docker Compose
```yaml
environment:
  NODE_ENV: development
  PORT: 3000
  DATABASE_URL: postgresql://postgres:postgres@postgres:5432/competition_account
  JWT_SECRET: dev-secret-key-change-in-production
  CORS_ORIGINS: http://localhost:3000,http://localhost:5173
  DB_POOL_MIN: 2
  DB_POOL_MAX: 10
```

### Docker Run
```bash
docker run -d \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e JWT_SECRET=$(openssl rand -base64 32) \
  -e CORS_ORIGINS=https://yourdomain.com \
  -e DB_POOL_MAX=10 \
  -p 3000:3000 \
  competition-account-backend
```

## Validation Rules

The application validates environment variables on startup:

### Always Required
- `DATABASE_URL` must be set in all environments

### Production Requirements
- `JWT_SECRET` must be set and not equal to default value
- `CORS_ORIGINS` must be set (cannot be empty)

### Validation Failures
If validation fails, the application will:
1. Log an error message to console
2. Exit with code 1
3. Not start the server

Example error:
```
ERROR: JWT_SECRET environment variable is required in production
```

## Security Best Practices

### JWT_SECRET
- ✅ Generate using cryptographically secure random generator
- ✅ Minimum 32 characters
- ✅ Different secret for each environment
- ✅ Store in secure secret management (Railway/Heroku config vars)
- ❌ Never commit to git
- ❌ Never share in plain text
- ❌ Never use default value in production

### DATABASE_URL
- ✅ Use SSL connections in production
- ✅ Strong database password (16+ characters)
- ✅ Restrict database access by IP when possible
- ❌ Never commit to git
- ❌ Never expose in logs or error messages

### CORS_ORIGINS
- ✅ Specify exact domains in production
- ✅ Include all legitimate frontend domains
- ✅ Use HTTPS in production
- ❌ Never use `*` in production
- ❌ Never include untrusted domains

## Troubleshooting

### "DATABASE_URL environment variable is required"
**Cause:** DATABASE_URL is not set

**Solution:**
```bash
# Local development
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/competition_account

# Railway
railway variables set DATABASE_URL=<your-connection-string>

# Heroku
heroku config:set DATABASE_URL=<your-connection-string>
```

### "JWT_SECRET environment variable is required in production"
**Cause:** JWT_SECRET is not set or using default value in production

**Solution:**
```bash
# Generate secure secret
openssl rand -base64 32

# Railway
railway variables set JWT_SECRET=<generated-secret>

# Heroku
heroku config:set JWT_SECRET=<generated-secret>
```

### "Unable to connect to database"
**Cause:** Database connection failed

**Solutions:**
1. Verify DATABASE_URL is correct
2. Check database is running
3. Verify network connectivity
4. Check SSL requirements
5. Verify credentials

**Test connection:**
```bash
psql $DATABASE_URL
```

### CORS errors in browser
**Cause:** Frontend domain not in CORS_ORIGINS

**Solution:**
```bash
# Add your frontend domain
railway variables set CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### File upload fails
**Cause:** File exceeds MAX_FILE_SIZE

**Solution:**
```bash
# Increase limit (50MB example)
railway variables set MAX_FILE_SIZE=52428800
```

### "Too many connections" database error
**Cause:** DB_POOL_MAX exceeds database limit

**Solution:**
```bash
# Reduce pool size
railway variables set DB_POOL_MAX=5
```

## Checking Current Values

### Railway
```bash
railway variables
```

### Heroku
```bash
heroku config
```

### Docker
```bash
docker exec container-name env
```

### Local
```bash
cat .env
```

## Updating Values

### Railway
```bash
# Set single variable
railway variables set KEY=value

# Set multiple variables
railway variables set KEY1=value1 KEY2=value2

# Delete variable
railway variables delete KEY
```

### Heroku
```bash
# Set single variable
heroku config:set KEY=value

# Set multiple variables
heroku config:set KEY1=value1 KEY2=value2

# Delete variable
heroku config:unset KEY
```

### Docker Compose
Edit `docker-compose.yml` and restart:
```bash
docker-compose down
docker-compose up -d
```

### Docker Run
Stop container and run with new values:
```bash
docker stop container-name
docker rm container-name
docker run -d -e KEY=value ...
```

## Environment Variable Precedence

Variables are loaded in this order (later overrides earlier):

1. Default values in code
2. `.env` file (local development only)
3. System environment variables
4. Platform-provided variables (Railway, Heroku)
5. Explicitly set variables (highest priority)

## Additional Resources

- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Heroku Config Vars](https://devcenter.heroku.com/articles/config-vars)
- [Docker Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
