# Competition Account Management - Backend

Backend server for the competition account management system. This Node.js + Express + TypeScript server provides REST API endpoints for managing golf competition transactions, competitions, flagged transactions, and weekly financial summaries.

## Quick Start

### Development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL database credentials

# 3. Start development server (runs migrations automatically)
npm run dev

# Server will be running at http://localhost:3000
# API documentation at http://localhost:3000/api/docs
```

### Production

```bash
# 1. Build the application
npm run build

# 2. Set environment variables (see Environment Variables section)
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export JWT_SECRET="your-secret-key"
export CORS_ORIGINS="https://yourdomain.com"
export NODE_ENV="production"

# 3. Run migrations (first time only)
npm run migrate

# 4. Start the server
npm run start:prod
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Configure your PostgreSQL database connection in `.env`

4. Run the development server:
```bash
npm run dev
```

## Environment Variables

See `.env.example` for all required environment variables.

## Database Migrations

Migrations are automatically run in development mode on server startup.

Migration files are located in `src/db/migrations/` and are executed in alphabetical order.

## Project Structure

```
backend/
├── src/
│   ├── db/
│   │   └── migrations/     # Database migration SQL files
│   ├── middleware/         # Express middleware
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic services
│   ├── types/             # TypeScript type definitions
│   └── index.ts           # Server entry point
├── dist/                  # Compiled JavaScript output
├── package.json
└── tsconfig.json
```

## Scripts

- `npm run dev` - Start development server with hot reload (runs migrations automatically)
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server (requires build first)
- `npm run start:prod` - Start production server with NODE_ENV=production
- `npm run migrate` - Run database migrations (production use)
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:setup` - Set up test database

## API Documentation

Interactive API documentation is available via Swagger UI when the server is running:

**Local Development:** http://localhost:3000/api/docs

The documentation includes:
- Complete endpoint specifications
- Request/response schemas
- Example requests and responses
- Interactive API testing interface

All API endpoints are documented using OpenAPI 3.0 specification.

### API Endpoints Overview

#### Health Check Endpoints
- `GET /health` - Basic health check (returns 200 if server is running)
- `GET /health/db` - Database connectivity check
- `GET /health/ready` - Readiness check (server + database)

#### Transaction Endpoints
- `POST /api/transactions/import` - Import an array of transaction records
- `GET /api/transactions` - Get all transactions (supports pagination)
- `GET /api/transactions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Get transactions by date range
- `GET /api/transactions/latest` - Get latest transaction timestamp
- `DELETE /api/transactions` - Delete all transactions

#### Presentation Season Endpoints
- `POST /api/presentation-seasons` - Create a new presentation season
- `POST /api/presentation-seasons/auto-increment` - Auto-increment from most recent season
- `GET /api/presentation-seasons` - Get all presentation seasons (chronologically ordered)
- `GET /api/presentation-seasons/active` - Get the currently active season
- `PUT /api/presentation-seasons/:id` - Update a presentation season
- `PUT /api/presentation-seasons/:id/activate` - Set a season as active (deactivates others)
- `DELETE /api/presentation-seasons/:id` - Delete a presentation season

#### Competition Endpoints
- `POST /api/competitions` - Create a new competition (requires seasonId and type)
- `GET /api/competitions` - Get all competitions
- `GET /api/competitions?season_id={id}` - Get competitions filtered by presentation season
- `GET /api/competitions/:id` - Get a specific competition by ID
- `PUT /api/competitions/:id` - Update a competition
- `DELETE /api/competitions/:id` - Delete a competition (cascade deletes results)

#### Competition Result Endpoints
- `POST /api/competition-results` - Create a single competition result
- `POST /api/competition-results/batch` - Create multiple results in a transaction
- `GET /api/competition-results?competition_id={id}` - Get results for a competition (ordered by position)
- `GET /api/competition-results/:id` - Get a specific result by ID
- `PUT /api/competition-results/:id` - Update a competition result
- `DELETE /api/competition-results/:id` - Delete a competition result

#### CSV Upload Endpoints
- `POST /api/csv/upload/singles` - Upload and parse singles competition CSV
- `POST /api/csv/upload/doubles` - Upload and parse doubles competition CSV
- `POST /api/csv/confirm` - Confirm and save parsed CSV results
- `GET /api/csv/export/:competitionId` - Export competition results as CSV

#### Swindle Money Endpoints
- `POST /api/swindle-money/match` - Match player name and update swindle money
- `GET /api/swindle-money/search?name={playerName}` - Find potential matches for a player name

#### Flagged Transaction Endpoints
- `POST /api/flagged-transactions` - Flag a transaction as a prize winning
- `GET /api/flagged-transactions` - Get all flagged transactions with details
- `PUT /api/flagged-transactions/:id` - Associate a flagged transaction with a competition
- `DELETE /api/flagged-transactions/:id` - Remove a flagged transaction

#### Summary Endpoints
- `GET /api/summaries/weekly` - Calculate weekly financial summaries for all data
- `GET /api/summaries/weekly?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Calculate weekly summaries for date range

#### Import/Export Endpoints
- `POST /api/import/csv` - Upload and import a CSV file
- `GET /api/export/transactions` - Export all transactions as JSON
- `GET /api/export/competitions` - Export all competitions as JSON
- `GET /api/export/all` - Export complete database (transactions, competitions, flagged transactions)
- `POST /api/import/backup` - Restore from a backup file

### Example API Usage

#### Import Transactions
```bash
curl -X POST http://localhost:3000/api/transactions/import \
  -H "Content-Type: application/json" \
  -d '[
    {
      "date": "2024-01-15",
      "time": "10:00:00",
      "till": "Till 1",
      "type": "Sale",
      "member": "John Smith",
      "price": "5.00",
      "discount": "0.00",
      "subtotal": "5.00",
      "vat": "0.00",
      "total": "5.00",
      "sourceRowIndex": 1,
      "isComplete": true
    }
  ]'
```

#### Upload CSV File
```bash
curl -X POST http://localhost:3000/api/import/csv \
  -F "file=@transactions.csv"
```

#### Get Weekly Summaries
```bash
curl http://localhost:3000/api/summaries/weekly?startDate=2024-01-01&endDate=2024-12-31
```

#### Create Presentation Season
```bash
curl -X POST http://localhost:3000/api/presentation-seasons \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Season: Winter 25-Summer 26"
  }'
```

#### Auto-Increment Season
```bash
curl -X POST http://localhost:3000/api/presentation-seasons/auto-increment
```

#### Create Competition
```bash
curl -X POST http://localhost:3000/api/competitions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly Medal",
    "date": "2024-01-20",
    "type": "singles",
    "season_id": 1,
    "description": "Weekly stroke play competition",
    "prizeStructure": "1st: £50, 2nd: £30, 3rd: £20"
  }'
```

#### Upload Singles CSV
```bash
curl -X POST http://localhost:3000/api/csv/upload/singles \
  -F "file=@singles_results.csv" \
  -F "competition_id=1"
```

#### Upload Doubles CSV
```bash
curl -X POST http://localhost:3000/api/csv/upload/doubles \
  -F "file=@doubles_results.csv" \
  -F "competition_id=2"
```

#### Create Competition Result
```bash
curl -X POST http://localhost:3000/api/competition-results \
  -H "Content-Type: application/json" \
  -d '{
    "competition_id": 1,
    "finishing_position": 1,
    "player_name": "John SMITH",
    "gross_score": 85,
    "handicap": 12,
    "nett_score": 73,
    "entry_paid": true
  }'
```

#### Match Swindle Money
```bash
curl -X POST http://localhost:3000/api/swindle-money/match \
  -H "Content-Type: application/json" \
  -d '{
    "player_name": "John SMITH",
    "amount": 50.00
  }'
```

### Migration from IndexedDB

If you're migrating from the client-side IndexedDB version:

1. **Export your existing data:**
   - Open the browser console on your current application
   - Run the export utility to download your data as JSON
   - Save the exported file

2. **Set up the backend server:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   npm run dev
   ```

3. **Import your data:**
   - Use the `/api/import/backup` endpoint to restore your exported data
   - Or manually import transactions via `/api/transactions/import`

4. **Update frontend:**
   - Replace `Database_Manager` calls with `API_Client` calls
   - Update the base URL to point to your backend server
   - Test all functionality

5. **Verify migration:**
   - Check transaction counts match
   - Verify weekly summaries are identical
   - Test competition and flagging workflows

### Data Format Notes

**Transaction Record Format:**
```json
{
  "date": "YYYY-MM-DD",
  "time": "HH:MM:SS",
  "till": "string",
  "type": "string",
  "member": "string",
  "player": "string",
  "competition": "string",
  "price": "decimal string",
  "discount": "decimal string",
  "subtotal": "decimal string",
  "vat": "decimal string",
  "total": "decimal string",
  "sourceRowIndex": number,
  "isComplete": boolean
}
```

**Competition Record Format:**
```json
{
  "name": "string",
  "date": "YYYY-MM-DD",
  "type": "singles | doubles",
  "season_id": number,
  "description": "string (optional)",
  "prizeStructure": "string (optional)"
}
```

**Presentation Season Format:**
```json
{
  "name": "Season: Winter YY-Summer YY"
}
```

**Competition Result Format:**
```json
{
  "competition_id": number,
  "finishing_position": number,
  "player_name": "string",
  "gross_score": number (optional, singles only),
  "handicap": number (optional, singles only),
  "nett_score": number (optional),
  "entry_paid": boolean,
  "swindle_money_paid": number (optional)
}
```

**Singles CSV Format:**
```csv
Pos,Name,Gross,Hcp,Nett
1,John SMITH,85,12,73
2,Jane DOE,88,15,73
3,Bob JONES,90,16,74
```

Required columns: `Pos`, `Name`, `Gross`, `Hcp`, `Nett`

**Doubles CSV Format:**
```csv
Pos,Name,Nett
1,John SMITH / Jane DOE,73
2,Bob JONES / Alice BROWN,74
```

Required columns: `Pos`, `Name`, `Nett`
- Names must be separated by " / " (space-slash-space)
- Each row creates two result records (one per player)

**CSV Parsing Rules:**
- Rows with empty names are skipped
- Rows matching "Division [0-9]+" are skipped (division headers)
- All field values are trimmed of whitespace
- Maximum file size: 5MB
- Maximum rows: 1000 per upload

**Weekly Summary Format:**
```json
{
  "fromDate": "YYYY-MM-DD",
  "toDate": "YYYY-MM-DD",
  "startingPurse": number,
  "purseApplicationTopUp": number,
  "purseTillTopUp": number,
  "competitionEntries": number,
  "competitionRefunds": number,
  "finalPurse": number,
  "startingPot": number,
  "winningsPaid": number,
  "competitionCosts": number,
  "finalPot": number
}
```

## Error Codes and Messages

The API uses standard HTTP status codes and returns detailed error information:

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource successfully created |
| 400 | Bad Request | Validation error, invalid input |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource or constraint violation |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Database connection error |

### Error Response Format

All errors return a JSON object with the following structure:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "field": "fieldName (optional)",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

#### Validation Errors (400)

| Code | Message | Cause |
|------|---------|-------|
| `INVALID_SEASON_FORMAT` | Season name must match format "Season: Winter YY-Summer YY" | Invalid presentation season format |
| `INVALID_TYPE` | Competition type must be 'singles' or 'doubles' | Invalid competition type |
| `MISSING_REQUIRED_FIELD` | Required field '{field}' is missing | Missing required field in request |
| `INVALID_POSITION` | Finishing position must be a positive integer | Invalid finishing position value |
| `INVALID_REFERENCE` | Referenced resource does not exist | Foreign key constraint violation |
| `INVALID_CSV_FORMAT` | CSV file is missing required columns | CSV missing required columns |
| `INVALID_DOUBLES_FORMAT` | Doubles name must contain "/" separator | Doubles CSV name field missing "/" |

#### CSV Parsing Errors (400)

| Code | Message | Cause |
|------|---------|-------|
| `CSV_MISSING_COLUMNS` | Missing required columns: {columns} | CSV file missing required columns |
| `CSV_INVALID_DATA` | Invalid data in row {row}, field '{field}' | Invalid data type in CSV row |
| `CSV_FILE_TOO_LARGE` | File size exceeds maximum of 5MB | Uploaded file too large |
| `CSV_TOO_MANY_ROWS` | CSV contains more than 1000 rows | Too many rows in CSV file |

#### Not Found Errors (404)

| Code | Message | Cause |
|------|---------|-------|
| `SEASON_NOT_FOUND` | Presentation season with id {id} not found | Season ID doesn't exist |
| `COMPETITION_NOT_FOUND` | Competition with id {id} not found | Competition ID doesn't exist |
| `RESULT_NOT_FOUND` | Competition result with id {id} not found | Result ID doesn't exist |

#### Database Errors (503)

| Code | Message | Cause |
|------|---------|-------|
| `DATABASE_ERROR` | A database error occurred | Database connection or query error |
| `TRANSACTION_FAILED` | Transaction failed and was rolled back | Database transaction error |

### Swindle Money Warnings (200)

When matching swindle money to competition results, the API may return a success response with a warning:

```json
{
  "success": true,
  "matched": false,
  "message": "Warning: No matching competition result found for player 'John SMITH'",
  "code": "NO_MATCH_WARNING"
}
```

This indicates the transaction was processed but no matching result was found for auto-population.

## Cloud Deployment

### Environment Variables

The following environment variables are required for production deployment:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `JWT_SECRET` | Secret key for JWT signing | Yes | - |
| `CORS_ORIGINS` | Comma-separated allowed origins | Yes | - |
| `NODE_ENV` | Environment (production/development) | No | development |
| `PORT` | Server port | No | 3000 |
| `MAX_FILE_SIZE` | Max upload size in bytes | No | 10485760 |
| `DB_POOL_MIN` | Min connection pool size | No | 2 |
| `DB_POOL_MAX` | Max connection pool size | No | 10 |

### Railway Deployment

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Initialize project:
```bash
cd backend
railway init
```

4. Add PostgreSQL database:
```bash
railway add --database postgresql
```

5. Set environment variables:
```bash
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set CORS_ORIGINS=https://yourdomain.com
railway variables set NODE_ENV=production
```

6. Deploy:
```bash
railway up
```

Railway will automatically:
- Detect the Dockerfile and build the container
- Set `DATABASE_URL` from the PostgreSQL addon
- Run database migrations on startup
- Provide HTTPS endpoints

### Heroku Deployment

1. Install Heroku CLI:
```bash
npm install -g heroku
```

2. Login to Heroku:
```bash
heroku login
```

3. Create app:
```bash
cd backend
heroku create your-app-name
```

4. Add PostgreSQL addon:
```bash
heroku addons:create heroku-postgresql:mini
```

5. Set environment variables:
```bash
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set CORS_ORIGINS=https://your-app-name.herokuapp.com
heroku config:set NODE_ENV=production
```

6. Deploy:
```bash
git push heroku main
```

Heroku will automatically:
- Detect Node.js and install dependencies
- Run `npm run build` to compile TypeScript
- Set `DATABASE_URL` from the PostgreSQL addon
- Run the app using the Procfile

### Docker Deployment

#### Local Development with Docker Compose

Run the entire stack (backend + PostgreSQL) locally:

```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

Access the application at http://localhost:3000

#### Production Docker Build

Build and run the production Docker image:

```bash
# Build image
docker build -t competition-account-backend .

# Run container
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e JWT_SECRET=your-secret \
  -e CORS_ORIGINS=https://yourdomain.com \
  -e NODE_ENV=production \
  --name competition-backend \
  competition-account-backend

# View logs
docker logs -f competition-backend

# Stop container
docker stop competition-backend
```

### AWS Deployment

#### Using AWS Elastic Beanstalk

1. Install EB CLI:
```bash
pip install awsebcli
```

2. Initialize EB application:
```bash
cd backend
eb init -p docker competition-account-backend
```

3. Create environment with RDS:
```bash
eb create production --database.engine postgres --database.username dbuser
```

4. Set environment variables:
```bash
eb setenv JWT_SECRET=$(openssl rand -base64 32) \
  CORS_ORIGINS=https://yourdomain.com \
  NODE_ENV=production
```

5. Deploy:
```bash
eb deploy
```

#### Using AWS ECS (Fargate)

1. Build and push Docker image to ECR
2. Create ECS cluster and task definition
3. Configure RDS PostgreSQL database
4. Set environment variables in task definition
5. Create service with load balancer
6. Configure HTTPS with ACM certificate

### Database Migrations

Database migrations run automatically on server startup in development mode.

For production deployments:
- Migrations run automatically on first startup
- Subsequent migrations require manual execution or deployment restart
- Always backup your database before running migrations

To run migrations manually:
```bash
# Set DATABASE_URL environment variable
export DATABASE_URL=postgresql://user:pass@host:5432/db

# Run migrations
npm run build
node dist/index.js
```

### Static File Serving

The backend serves static frontend files from the `public/` directory.

To deploy the frontend:
1. Build your frontend application
2. Copy the build output to `backend/public/`
3. Deploy the backend (static files will be served automatically)

Example:
```bash
# Build frontend
cd frontend
npm run build

# Copy to backend public directory
cp -r dist/* ../backend/public/

# Deploy backend
cd ../backend
railway up  # or heroku deploy, etc.
```

### HTTPS Configuration

All cloud providers (Railway, Heroku, AWS) provide automatic HTTPS:
- Railway: Automatic HTTPS with custom domains
- Heroku: Automatic HTTPS for *.herokuapp.com and custom domains
- AWS: Use ACM certificates with ALB/CloudFront

The backend is configured to work behind HTTPS proxies and will:
- Trust proxy headers (X-Forwarded-Proto)
- Enforce secure cookies in production
- Set appropriate security headers

### Health Checks

The application provides health check endpoints for monitoring:

- `GET /health` - Basic health check (returns 200 if server is running)
- `GET /health/db` - Database connectivity check
- `GET /health/ready` - Readiness check (server + database)

Configure your cloud provider to use `/health/ready` for health checks.

### Troubleshooting

**Database Connection Issues:**
- Verify `DATABASE_URL` is set correctly
- Check database allows connections from your deployment IP
- Ensure SSL mode is configured (most cloud databases require SSL)

**Migration Failures:**
- Check database user has CREATE TABLE permissions
- Review migration logs in application output
- Manually connect to database and verify schema

**CORS Errors:**
- Verify `CORS_ORIGINS` includes your frontend domain
- Check protocol (http vs https) matches exactly
- Ensure no trailing slashes in origin URLs

**File Upload Issues:**
- Check `MAX_FILE_SIZE` environment variable
- Verify cloud provider allows file uploads (some have limits)
- Review application logs for specific error messages
