# Deployment Checklist

This checklist ensures all necessary steps are completed before deploying the Competition Results Management feature to production.

## Pre-Deployment Preparation

### 1. Environment Variables

Verify all required environment variables are configured:

- [ ] `DATABASE_URL` - PostgreSQL connection string with SSL enabled
- [ ] `JWT_SECRET` - Secure random string (32+ characters, generated with `openssl rand -base64 32`)
- [ ] `CORS_ORIGINS` - Production frontend domain(s) (comma-separated, with https://)
- [ ] `NODE_ENV` - Set to `production`
- [ ] `PORT` - Set by platform or defaults to 3000

Optional environment variables (verify defaults are acceptable):

- [ ] `MAX_FILE_SIZE` - Default: 10485760 (10MB)
- [ ] `DB_POOL_MIN` - Default: 2
- [ ] `DB_POOL_MAX` - Default: 10 (adjust based on database plan limits)

**Validation Commands:**
```bash
# Railway
railway variables

# Heroku
heroku config

# Docker
docker exec container-name env
```

### 2. Database Migrations

Ensure all migrations are ready to run:

- [ ] Migration 001: Initial schema (transactions, competitions, etc.)
- [ ] Migration 002: Create indexes for performance
- [ ] Migration 003: Create presentation_seasons table
- [ ] Migration 004: Extend competitions table (add season_id, type)
- [ ] Migration 005: Create competition_results table

**Migration Files Location:** `backend/src/db/migrations/`

**Rollback Files Available:**
- [ ] `003_create_presentation_seasons.rollback.sql`
- [ ] `004_extend_competitions.rollback.sql`
- [ ] `005_create_competition_results.rollback.sql`

**Migration Execution:**
- Migrations run automatically on server startup
- Verify migration tracking table exists: `schema_migrations`
- Test migrations in staging environment first

### 3. Dependencies

Verify all dependencies are installed and up to date:

- [ ] Backend dependencies installed (`npm install` in backend/)
- [ ] TypeScript compiled successfully (`npm run build`)
- [ ] No security vulnerabilities (`npm audit`)
- [ ] Production dependencies only (devDependencies excluded in production build)

**Key Dependencies:**
- express: ^4.18.2
- pg: ^8.11.3
- papaparse: ^5.5.3
- multer: ^1.4.5-lts.1
- helmet: ^7.1.0
- express-rate-limit: ^8.2.1

### 4. Database Backup

Create backup before deployment:

- [ ] Export existing data using `/api/export/all` endpoint
- [ ] Store backup in secure location
- [ ] Verify backup can be restored
- [ ] Document backup timestamp and location

**Backup Commands:**
```bash
# Export application data
curl https://your-api.com/api/export/all > backup-$(date +%Y%m%d-%H%M%S).json

# Database backup (Railway)
railway db backup

# Database backup (Heroku)
heroku pg:backups:capture
heroku pg:backups:download

# Database backup (AWS RDS)
# Create snapshot via AWS Console or CLI
```

## Testing Requirements

### 5. Backend Tests

Run all backend tests and verify they pass:

- [ ] Unit tests: `npm test` (all services, routes, middleware)
- [ ] Integration tests: E2E workflows, API endpoints
- [ ] Property-based tests: CSV parsing, name matching, season validation
- [ ] Security tests: SQL injection, XSS, CSRF protection
- [ ] Performance tests: 40 competitions, 5000 results

**Test Execution:**
```bash
cd backend
npm test
```

**Expected Results:**
- All tests pass
- No failing assertions
- Coverage > 80% (recommended)

### 6. Frontend Tests

Run all frontend tests and verify they pass:

- [ ] Unit tests: Component tests (seasonSelector, competitionList, resultsTable, csvUploader)
- [ ] Integration tests: CompetitionAccountsView, app integration
- [ ] Property-based tests: Season format validation, filter correctness

**Test Execution:**
```bash
npm test
```

### 7. Manual Testing Checklist

Perform manual testing of critical workflows:

**Presentation Season Management:**
- [ ] Create new season with valid format
- [ ] Create season with invalid format (should fail)
- [ ] Auto-increment season from most recent
- [ ] Set active season (deactivates others)
- [ ] View all seasons in chronological order

**Competition Management:**
- [ ] Create singles competition with season association
- [ ] Create doubles competition with season association
- [ ] Filter competitions by season
- [ ] View competition details
- [ ] Delete competition (verify cascade delete of results)

**CSV Upload:**
- [ ] Upload valid singles CSV (50 rows)
- [ ] Upload valid doubles CSV with "/" separator
- [ ] Upload CSV with missing columns (should fail with error)
- [ ] Upload CSV with division headers (should skip)
- [ ] Upload CSV with empty names (should skip)
- [ ] Verify results appear in table after upload

**Manual Result Entry:**
- [ ] Add manual result for singles competition
- [ ] Add manual result for doubles competition
- [ ] Edit existing result
- [ ] Delete result
- [ ] Verify validation errors for invalid data

**Swindle Money Integration:**
- [ ] Flag transaction as winnings in Transformed Records
- [ ] Verify swindle money auto-populates in most recent unpaid result
- [ ] Test name matching with exact match
- [ ] Test name matching with initial + surname (e.g., "A. REID" → "Alastair REID")
- [ ] Test no match scenario (should log warning, not fail)

**CSV Export:**
- [ ] Export singles competition results to CSV
- [ ] Export doubles competition results to CSV
- [ ] Verify exported CSV matches original format
- [ ] Verify round-trip: upload → export → upload produces same results

### 8. Performance Validation

Verify performance meets requirements:

- [ ] Load 40 competitions: renders within 4 seconds
- [ ] Upload 50-row CSV: completes within 1 second
- [ ] Filter competitions by season: updates within 1000ms
- [ ] Auto-populate swindle money: completes within 250ms
- [ ] Database supports 500 competitions + 50,000 results without degradation

**Performance Testing:**
```bash
# Run performance tests
cd backend
npm test -- performance.test.ts
```

## Security Checklist

### 9. Security Validation

Verify all security measures are in place:

- [ ] `JWT_SECRET` is not default value
- [ ] `JWT_SECRET` is 32+ characters
- [ ] `CORS_ORIGINS` is set to specific domains (not `*`)
- [ ] Database uses SSL connections in production
- [ ] Database credentials are secure (16+ characters)
- [ ] Helmet middleware enabled (security headers)
- [ ] Rate limiting configured on API endpoints
- [ ] Input sanitization enabled (express-validator)
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (input sanitization)
- [ ] CSRF protection (if using cookies)
- [ ] File upload validation (CSV only, max size enforced)
- [ ] Error messages don't expose sensitive information
- [ ] HTTPS enforced in production
- [ ] Application runs as non-root user (Docker)

**Security Test Commands:**
```bash
# Run security tests
cd backend
npm test -- security.test.ts

# Check for vulnerabilities
npm audit
npm audit fix
```

### 10. Database Security

Verify database security configuration:

- [ ] Database user has minimum required permissions
- [ ] Database accessible only from application servers
- [ ] SSL/TLS enabled for database connections
- [ ] Database backups configured and tested
- [ ] Database connection pool limits set appropriately
- [ ] Database firewall rules configured (if applicable)

## Deployment Steps

### 11. Build and Deploy

Execute deployment based on platform:

**Railway:**
```bash
# Verify environment variables
railway variables

# Deploy
railway up

# Monitor logs
railway logs
```

**Heroku:**
```bash
# Verify environment variables
heroku config

# Deploy
git push heroku main

# Run migrations (automatic on startup)
# Monitor logs
heroku logs --tail

# Scale dynos if needed
heroku ps:scale web=1
```

**Docker:**
```bash
# Build image
docker build -t competition-account-backend .

# Test locally
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=<your-db-url> \
  -e JWT_SECRET=<your-secret> \
  -e CORS_ORIGINS=<your-domain> \
  -e NODE_ENV=production \
  --name competition-backend \
  competition-account-backend

# Push to registry
docker push your-registry/competition-account-backend:latest

# Deploy to production
# (Platform-specific: AWS ECS, Kubernetes, etc.)
```

**AWS ECS:**
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker build -t competition-account-backend .
docker tag competition-account-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/competition-account-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/competition-account-backend:latest

# Update ECS service
aws ecs update-service --cluster <cluster-name> --service <service-name> --force-new-deployment
```

### 12. Post-Deployment Verification

Verify deployment was successful:

- [ ] Application is running (check platform dashboard)
- [ ] Health check endpoint responds: `GET /health`
- [ ] Database health check responds: `GET /health/db`
- [ ] Readiness check responds: `GET /health/ready`
- [ ] Migrations completed successfully (check logs)
- [ ] No errors in application logs
- [ ] API endpoints respond correctly
- [ ] Frontend can connect to backend
- [ ] CORS configured correctly (no browser errors)

**Health Check Commands:**
```bash
# Basic health check
curl https://your-api.com/health

# Database health check
curl https://your-api.com/health/db

# Readiness check
curl https://your-api.com/health/ready

# Test API endpoint
curl https://your-api.com/api/presentation-seasons
```

### 13. Smoke Tests

Run smoke tests on production:

- [ ] Create test presentation season
- [ ] Create test competition
- [ ] Upload test CSV (small file)
- [ ] View competition results
- [ ] Delete test data
- [ ] Verify no errors in logs

**Smoke Test Script:**
```bash
# Set API URL
API_URL="https://your-api.com"

# Create test season
curl -X POST $API_URL/api/presentation-seasons \
  -H "Content-Type: application/json" \
  -d '{"name":"Season: Winter 99-Summer 00"}'

# Create test competition
curl -X POST $API_URL/api/competitions \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Competition","date":"2024-01-01","type":"singles","season_id":1}'

# Clean up
curl -X DELETE $API_URL/api/competitions/1
curl -X DELETE $API_URL/api/presentation-seasons/1
```

## Monitoring and Logging

### 14. Monitoring Setup

Configure monitoring and alerting:

- [ ] Application logs accessible (platform dashboard or CloudWatch)
- [ ] Error tracking configured (Sentry, Rollbar, etc.)
- [ ] Database monitoring enabled (connection count, query performance)
- [ ] Health check monitoring configured
- [ ] Uptime monitoring configured (Pingdom, UptimeRobot, etc.)
- [ ] Alert notifications configured (email, Slack, PagerDuty)

**Monitoring Endpoints:**
- `/health` - Basic server health
- `/health/db` - Database connectivity
- `/health/ready` - Full system readiness

**Key Metrics to Monitor:**
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Database connection pool usage
- Memory usage
- CPU usage
- Request rate

### 15. Log Verification

Verify logging is working correctly:

- [ ] Application logs visible in platform dashboard
- [ ] Log level appropriate for production (INFO or WARN)
- [ ] No sensitive data in logs (passwords, tokens, PII)
- [ ] Error logs include stack traces
- [ ] Request logs include method, path, status, duration
- [ ] Database query logs available (if needed for debugging)

**Log Access Commands:**
```bash
# Railway
railway logs

# Heroku
heroku logs --tail

# AWS CloudWatch
aws logs tail /aws/ecs/<cluster>/<service> --follow

# Docker
docker logs -f container-name
```

## Rollback Plan

### 16. Rollback Preparation

Prepare rollback plan in case of issues:

- [ ] Previous version tagged in git
- [ ] Database backup created and verified
- [ ] Rollback SQL scripts available for new migrations
- [ ] Rollback procedure documented
- [ ] Team notified of deployment and rollback plan

**Rollback Procedure:**

1. **Application Rollback:**
   ```bash
   # Railway
   railway rollback
   
   # Heroku
   heroku releases:rollback
   
   # Docker/AWS
   # Deploy previous image tag
   ```

2. **Database Rollback (if needed):**
   ```bash
   # Connect to database
   psql $DATABASE_URL
   
   # Run rollback scripts in reverse order
   \i backend/src/db/migrations/005_create_competition_results.rollback.sql
   \i backend/src/db/migrations/004_extend_competitions.rollback.sql
   \i backend/src/db/migrations/003_create_presentation_seasons.rollback.sql
   ```

3. **Verify Rollback:**
   - [ ] Application running on previous version
   - [ ] Database schema reverted
   - [ ] Health checks passing
   - [ ] No errors in logs

## Documentation

### 17. Documentation Updates

Ensure all documentation is up to date:

- [ ] API documentation updated (Swagger/OpenAPI)
- [ ] User guide updated with new features
- [ ] Migration guide created
- [ ] Deployment guide updated
- [ ] Environment variables documented
- [ ] Troubleshooting guide updated
- [ ] Release notes created

**Documentation Files:**
- `backend/README.md` - API documentation
- `backend/DEPLOYMENT.md` - Deployment guide
- `backend/ENV_VARIABLES.md` - Environment variables reference
- `MIGRATION_GUIDE.md` - Database migration guide
- `USER_GUIDE.md` - User documentation
- `DEPLOYMENT_CHECKLIST.md` - This file

## Communication

### 18. Stakeholder Communication

Communicate deployment to stakeholders:

- [ ] Deployment scheduled and communicated to users
- [ ] Maintenance window announced (if needed)
- [ ] Release notes shared with stakeholders
- [ ] Training materials provided (if needed)
- [ ] Support team briefed on new features
- [ ] Feedback mechanism established

**Communication Channels:**
- Email announcement
- In-app notification
- Documentation updates
- Training session (if needed)

## Post-Deployment

### 19. Post-Deployment Monitoring

Monitor application after deployment:

- [ ] Monitor error rates for 24 hours
- [ ] Monitor performance metrics for 24 hours
- [ ] Monitor database performance
- [ ] Review user feedback
- [ ] Address any issues promptly

**Monitoring Schedule:**
- First hour: Continuous monitoring
- First 24 hours: Check every 2-4 hours
- First week: Daily checks
- Ongoing: Weekly reviews

### 20. Final Verification

Complete final verification:

- [ ] All features working as expected
- [ ] No critical errors in logs
- [ ] Performance meets requirements
- [ ] Users can access new features
- [ ] Data integrity verified
- [ ] Backups running successfully
- [ ] Monitoring and alerting working

## Sign-Off

### Deployment Approval

- [ ] Technical lead approval
- [ ] QA approval
- [ ] Product owner approval
- [ ] Security review completed
- [ ] Deployment checklist completed

**Deployment Details:**
- Deployment Date: _______________
- Deployed By: _______________
- Version/Tag: _______________
- Environment: _______________

**Sign-Off:**
- Technical Lead: _______________ Date: _______________
- QA Lead: _______________ Date: _______________
- Product Owner: _______________ Date: _______________

---

## Quick Reference

### Essential Commands

**Health Checks:**
```bash
curl https://your-api.com/health
curl https://your-api.com/health/db
curl https://your-api.com/health/ready
```

**View Logs:**
```bash
railway logs              # Railway
heroku logs --tail        # Heroku
docker logs -f <name>     # Docker
```

**Environment Variables:**
```bash
railway variables         # Railway
heroku config             # Heroku
docker exec <name> env    # Docker
```

**Database Backup:**
```bash
railway db backup                    # Railway
heroku pg:backups:capture            # Heroku
curl /api/export/all > backup.json   # Application data
```

### Support Contacts

- Platform Support: [Platform documentation links]
- Database Support: [Database provider support]
- Application Support: [Development team contact]
- Emergency Contact: [On-call engineer]

### Useful Links

- [Railway Documentation](https://docs.railway.app/)
- [Heroku Documentation](https://devcenter.heroku.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [Project Repository](https://github.com/your-org/your-repo)

---

**Last Updated:** [Date]
**Version:** 1.0.0
**Maintained By:** [Team Name]
