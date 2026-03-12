# Deployment Guide

This guide covers deploying the Competition Account Management backend to various cloud platforms.

## Prerequisites

- PostgreSQL database (provided by cloud platform or external service)
- Node.js 20+ (handled by cloud platforms)
- Environment variables configured (see below)

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret key for JWT signing (32+ characters) | Generate with `openssl rand -base64 32` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `https://yourdomain.com,https://www.yourdomain.com` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port (usually auto-set by platform) | `3000` |

## Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MAX_FILE_SIZE` | Max upload size in bytes | `10485760` (10MB) |
| `DB_POOL_MIN` | Min database connections | `2` |
| `DB_POOL_MAX` | Max database connections | `10` |

---

## Railway Deployment

Railway provides automatic deployments with PostgreSQL database included.

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login and Initialize

```bash
railway login
cd backend
railway init
```

### Step 3: Add PostgreSQL Database

```bash
railway add --database postgresql
```

Railway automatically sets the `DATABASE_URL` environment variable.

### Step 4: Set Environment Variables

```bash
# Generate secure JWT secret
railway variables set JWT_SECRET=$(openssl rand -base64 32)

# Set your frontend domain
railway variables set CORS_ORIGINS=https://yourdomain.com

# Set production mode
railway variables set NODE_ENV=production
```

### Step 5: Deploy

```bash
railway up
```

Railway will:
- Detect the Dockerfile
- Build the container image
- Deploy to their infrastructure
- Provide a public HTTPS URL
- Run database migrations automatically on startup

### Step 6: Custom Domain (Optional)

1. Go to Railway dashboard
2. Select your project
3. Go to Settings → Domains
4. Add your custom domain
5. Update DNS records as instructed
6. Update `CORS_ORIGINS` to include your custom domain

### Monitoring

View logs in real-time:
```bash
railway logs
```

---

## Heroku Deployment

Heroku provides a mature platform with PostgreSQL addon.

### Step 1: Install Heroku CLI

```bash
npm install -g heroku
```

### Step 2: Login and Create App

```bash
heroku login
cd backend
heroku create your-app-name
```

### Step 3: Add PostgreSQL Addon

```bash
heroku addons:create heroku-postgresql:mini
```

Heroku automatically sets the `DATABASE_URL` environment variable.

### Step 4: Set Environment Variables

```bash
# Generate secure JWT secret
heroku config:set JWT_SECRET=$(openssl rand -base64 32)

# Set your frontend domain
heroku config:set CORS_ORIGINS=https://your-app-name.herokuapp.com

# Set production mode
heroku config:set NODE_ENV=production
```

### Step 5: Deploy

```bash
git push heroku main
```

Heroku will:
- Detect Node.js application
- Install dependencies
- Run `npm run build`
- Start the app using the Procfile
- Run migrations automatically on startup

### Step 6: Scale Dynos

```bash
# Ensure at least one web dyno is running
heroku ps:scale web=1
```

### Monitoring

View logs:
```bash
heroku logs --tail
```

Check app status:
```bash
heroku ps
```

---

## Docker Deployment

Deploy using Docker to any platform that supports containers.

### Local Testing

Test the production build locally:

```bash
# Build image
docker build -t competition-account-backend .

# Run with environment variables
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e JWT_SECRET=your-secret-key \
  -e CORS_ORIGINS=https://yourdomain.com \
  -e NODE_ENV=production \
  --name competition-backend \
  competition-account-backend

# View logs
docker logs -f competition-backend

# Stop container
docker stop competition-backend
docker rm competition-backend
```

### Docker Compose (Development)

Run the full stack locally:

```bash
# Start all services (backend + PostgreSQL)
docker-compose up

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

---

## AWS Deployment

### Option 1: AWS Elastic Beanstalk

Elastic Beanstalk provides managed Docker deployment with RDS PostgreSQL.

#### Step 1: Install EB CLI

```bash
pip install awsebcli
```

#### Step 2: Initialize Application

```bash
cd backend
eb init -p docker competition-account-backend --region us-east-1
```

#### Step 3: Create Environment with RDS

```bash
eb create production \
  --database.engine postgres \
  --database.username dbadmin \
  --database.password YourSecurePassword123
```

#### Step 4: Set Environment Variables

```bash
eb setenv \
  JWT_SECRET=$(openssl rand -base64 32) \
  CORS_ORIGINS=https://yourdomain.com \
  NODE_ENV=production
```

#### Step 5: Deploy

```bash
eb deploy
```

#### Monitoring

```bash
eb logs
eb status
eb health
```

### Option 2: AWS ECS (Fargate)

For more control, use ECS with Fargate for serverless containers.

#### Step 1: Create ECR Repository

```bash
aws ecr create-repository --repository-name competition-account-backend
```

#### Step 2: Build and Push Image

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t competition-account-backend .

# Tag image
docker tag competition-account-backend:latest \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/competition-account-backend:latest

# Push image
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/competition-account-backend:latest
```

#### Step 3: Create RDS PostgreSQL Database

1. Go to AWS RDS Console
2. Create PostgreSQL database
3. Note the connection details
4. Configure security groups to allow ECS access

#### Step 4: Create ECS Cluster and Task Definition

1. Create ECS cluster (Fargate)
2. Create task definition with:
   - Container image from ECR
   - Environment variables (JWT_SECRET, CORS_ORIGINS, NODE_ENV)
   - DATABASE_URL from RDS
   - Port mapping: 3000
3. Create service with Application Load Balancer
4. Configure health checks to use `/health/ready`

#### Step 5: Configure HTTPS

1. Request ACM certificate for your domain
2. Add HTTPS listener to ALB
3. Redirect HTTP to HTTPS

---

## Database Migrations

### Automatic Migrations

In development mode, migrations run automatically on server startup.

In production, migrations also run automatically on first startup. For subsequent deployments:

**Railway/Heroku:**
- Migrations run automatically on each deployment
- No manual intervention needed

**Docker/AWS:**
- Migrations run on container startup
- Restart the service to apply new migrations

### Manual Migration Execution

If you need to run migrations manually:

```bash
# Set DATABASE_URL
export DATABASE_URL=postgresql://user:pass@host:5432/db

# Build and run
npm run build
node dist/index.js
```

The server will run migrations and then start normally.

### Migration Files

Migrations are located in `src/db/migrations/` and executed in alphabetical order:
- `001_initial_schema.sql` - Creates tables
- `002_add_indexes.sql` - Adds performance indexes

### Creating New Migrations

1. Create a new SQL file in `src/db/migrations/`
2. Use sequential numbering: `003_your_migration.sql`
3. Write idempotent SQL (use `IF NOT EXISTS` where possible)
4. Test locally before deploying

---

## Static File Serving

The backend serves static files from the `public/` directory.

### Deploying Frontend

1. Build your frontend application:
```bash
cd frontend
npm run build
```

2. Copy build output to backend public directory:
```bash
cp -r dist/* ../backend/public/
```

3. Deploy backend (frontend files included):
```bash
# Railway
railway up

# Heroku
git add backend/public
git commit -m "Update frontend"
git push heroku main

# Docker
docker build -t competition-account-backend .
docker push your-registry/competition-account-backend
```

### Separate Frontend Hosting

Alternatively, host the frontend separately (Vercel, Netlify, S3):

1. Deploy backend to Railway/Heroku/AWS
2. Note the backend API URL
3. Configure frontend to use the API URL
4. Add frontend domain to `CORS_ORIGINS`
5. Deploy frontend to hosting platform

---

## HTTPS Configuration

All cloud platforms provide automatic HTTPS:

**Railway:**
- Automatic HTTPS for `*.railway.app` domains
- Automatic HTTPS for custom domains
- Free SSL certificates

**Heroku:**
- Automatic HTTPS for `*.herokuapp.com` domains
- Automatic HTTPS for custom domains (paid plans)
- Free SSL certificates

**AWS:**
- Use ACM (AWS Certificate Manager) for free SSL certificates
- Configure ALB/CloudFront with HTTPS listener
- Redirect HTTP to HTTPS

The backend is configured to work behind HTTPS proxies:
- Trusts `X-Forwarded-Proto` header in production
- Sets secure cookies in production
- Enforces HSTS headers

---

## Health Checks

Configure your platform to use these endpoints:

| Endpoint | Purpose | Use For |
|----------|---------|---------|
| `/health` | Basic server check | Liveness probe |
| `/health/db` | Database connectivity | Database monitoring |
| `/health/ready` | Full system readiness | Readiness probe |

**Railway:** Automatically uses `/health`

**Heroku:** Configure in `app.json`:
```json
{
  "healthcheck": {
    "path": "/health/ready"
  }
}
```

**AWS ECS:** Configure in task definition:
```json
{
  "healthCheck": {
    "command": ["CMD-SHELL", "curl -f http://localhost:3000/health/ready || exit 1"],
    "interval": 30,
    "timeout": 5,
    "retries": 3
  }
}
```

---

## Monitoring and Logging

### Application Logs

**Railway:**
```bash
railway logs
```

**Heroku:**
```bash
heroku logs --tail
```

**AWS:**
- CloudWatch Logs (automatic with ECS)
- View in AWS Console or CLI

### Database Monitoring

**Railway:**
- View metrics in Railway dashboard
- Connection count, query performance

**Heroku:**
```bash
heroku pg:info
heroku pg:diagnose
```

**AWS RDS:**
- CloudWatch metrics
- Performance Insights
- Enhanced Monitoring

### Error Tracking

Consider integrating error tracking services:
- Sentry
- Rollbar
- Bugsnag

Add to your application:
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

---

## Troubleshooting

### Database Connection Errors

**Symptom:** `Unable to connect to database`

**Solutions:**
1. Verify `DATABASE_URL` is set correctly
2. Check database is running and accessible
3. Verify SSL configuration (cloud databases require SSL)
4. Check firewall/security group rules
5. Verify database credentials

**Test connection:**
```bash
# Using psql
psql $DATABASE_URL

# Using node
node -e "const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});p.query('SELECT NOW()').then(r=>console.log(r.rows)).catch(e=>console.error(e)).finally(()=>p.end())"
```

### Migration Failures

**Symptom:** Server fails to start with migration errors

**Solutions:**
1. Check database user has CREATE TABLE permissions
2. Review migration SQL for syntax errors
3. Check if migration was partially applied
4. Manually connect and verify schema

**Reset migrations (development only):**
```sql
DROP TABLE migrations;
-- Then restart server to rerun all migrations
```

### CORS Errors

**Symptom:** Browser shows CORS policy errors

**Solutions:**
1. Verify `CORS_ORIGINS` includes your frontend domain
2. Check protocol matches exactly (http vs https)
3. Remove trailing slashes from origins
4. Check domain spelling

**Test CORS:**
```bash
curl -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS \
  https://your-api.com/api/transactions
```

### File Upload Errors

**Symptom:** CSV upload fails or times out

**Solutions:**
1. Check `MAX_FILE_SIZE` environment variable
2. Verify platform allows file uploads
3. Check file size limits (Heroku: 30MB, Railway: 100MB)
4. Review application logs for specific errors

### Memory Issues

**Symptom:** Application crashes with out of memory errors

**Solutions:**
1. Increase dyno/container memory
2. Reduce `DB_POOL_MAX` to free memory
3. Optimize queries to reduce memory usage
4. Add pagination to large result sets

**Railway:** Upgrade to higher memory plan

**Heroku:** Upgrade dyno type
```bash
heroku ps:type web=standard-1x
```

**AWS:** Increase task memory in task definition

### Performance Issues

**Symptom:** Slow API responses

**Solutions:**
1. Add database indexes (already included in migrations)
2. Enable connection pooling (already configured)
3. Use pagination for large datasets
4. Monitor database query performance
5. Scale up database resources

**Check slow queries:**
```sql
-- PostgreSQL slow query log
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Security Checklist

Before deploying to production:

- [ ] `JWT_SECRET` is set to a secure random value (32+ characters)
- [ ] `NODE_ENV` is set to `production`
- [ ] `CORS_ORIGINS` is set to specific domains (not `*`)
- [ ] Database uses SSL connections
- [ ] Database credentials are secure
- [ ] Application runs as non-root user (Docker)
- [ ] Security headers are enabled (helmet middleware)
- [ ] Rate limiting is configured
- [ ] Input sanitization is enabled
- [ ] Error messages don't expose sensitive information
- [ ] HTTPS is enforced
- [ ] Database backups are configured
- [ ] Monitoring and alerting are set up

---

## Backup and Recovery

### Database Backups

**Railway:**
- Automatic daily backups (Pro plan)
- Manual backups via dashboard

**Heroku:**
```bash
# Create backup
heroku pg:backups:capture

# Download backup
heroku pg:backups:download

# Restore backup
heroku pg:backups:restore BACKUP_ID
```

**AWS RDS:**
- Automatic daily backups (configurable retention)
- Manual snapshots via console
- Point-in-time recovery

### Application Backups

Use the export endpoints to backup application data:

```bash
# Export all data
curl https://your-api.com/api/export/all > backup.json

# Restore from backup
curl -X POST https://your-api.com/api/import/backup \
  -H "Content-Type: application/json" \
  -d @backup.json
```

---

## Scaling

### Horizontal Scaling

**Railway:**
- Automatic scaling based on load
- Configure in dashboard

**Heroku:**
```bash
# Scale to multiple dynos
heroku ps:scale web=3
```

**AWS ECS:**
- Configure auto-scaling in service definition
- Scale based on CPU/memory/request count

### Database Scaling

**Railway:**
- Upgrade database plan in dashboard

**Heroku:**
```bash
# Upgrade database plan
heroku addons:upgrade heroku-postgresql:standard-0
```

**AWS RDS:**
- Vertical scaling: Change instance type
- Read replicas: Add read-only replicas
- Connection pooling: Use RDS Proxy

### Connection Pool Tuning

Adjust based on your database plan:

```bash
# For small databases (10 connections max)
railway variables set DB_POOL_MAX=5

# For larger databases (100 connections max)
railway variables set DB_POOL_MAX=20
```

---

## Cost Optimization

### Railway
- Free tier: $5 credit/month
- Pro plan: $20/month + usage
- Database: ~$5-10/month

### Heroku
- Free tier: Deprecated
- Basic: $7/month (dyno) + $5/month (database)
- Standard: $25/month (dyno) + $50/month (database)

### AWS
- ECS Fargate: ~$15-30/month (0.25 vCPU, 0.5 GB)
- RDS: ~$15-50/month (db.t3.micro to db.t3.small)
- Data transfer: ~$1-5/month

### Cost Reduction Tips
1. Use smaller instance sizes for low traffic
2. Enable auto-scaling to scale down during low usage
3. Use connection pooling to reduce database load
4. Implement caching for frequently accessed data
5. Optimize database queries and indexes

---

## Support

For deployment issues:
- Check platform status pages
- Review application logs
- Consult platform documentation
- Contact platform support

For application issues:
- Check health endpoints
- Review application logs
- Verify environment variables
- Test database connectivity
