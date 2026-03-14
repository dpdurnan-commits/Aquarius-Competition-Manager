# Production Deployment Guide

## Pre-Deployment Checklist

### ✅ Code Quality
- [x] All features working correctly
- [x] Navigation between views fixed
- [x] Distribution costs displaying properly
- [x] Weekly transaction drill-down working
- [x] Competition management functional
- [x] No console errors in browser

### ✅ Database
- [x] All migrations present and tested
- [x] Database schema up to date
- [x] Test data cleared from production database

### ✅ Security
- [x] Environment variables properly configured
- [x] Sensitive data excluded from git
- [x] CORS configured for production domain
- [x] Rate limiting enabled

### ✅ Performance
- [x] No memory leaks in long-running sessions
- [x] Database queries optimized
- [x] Frontend assets minified (if applicable)

## Deployment Steps

### 1. Prepare Repository

```bash
# Clean up temporary files
git status
git add .
git commit -m "feat: Complete Competition Accounts refresh and distribution costs fix

- Fixed distribution costs not appearing in Competition Accounts view
- Added comprehensive UI refresh when switching between views
- Removed CompetitionManagerUI modal to fix navigation confusion
- Added automatic refresh after distribution creation
- Improved weekly transaction drill-down (inline only, no modals)
- Added Competition Management view for competition/results management
- Clear separation between Competition Accounts (financial) and Manage Competitions (results)
- All UI elements properly reset when switching views"

git push origin main
```

### 2. Environment Configuration

Ensure these environment variables are set in production:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=<provided-by-railway>
CORS_ORIGINS=<your-production-domain>
```

### 3. Database Setup

The application will automatically run migrations on startup. Ensure your production database is empty or backed up before first deployment.

### 4. Deploy to Railway

1. **Connect Repository**:
   - Go to Railway dashboard
   - Create new project from GitHub
   - Select your repository

2. **Add Database**:
   - Add PostgreSQL service
   - Railway will automatically set DATABASE_URL

3. **Configure Environment**:
   - Set NODE_ENV=production
   - Set any other required variables

4. **Deploy**:
   - Railway automatically deploys on git push
   - Monitor deployment logs for any issues

### 5. Post-Deployment Verification

1. **Health Check**:
   ```bash
   curl https://your-app.railway.app/api/health
   ```

2. **Database Check**:
   ```bash
   curl https://your-app.railway.app/api/health/db
   ```

3. **Frontend Check**:
   - Visit your production URL
   - Test all navigation buttons
   - Upload a test CSV file
   - Create a test distribution
   - Verify costs appear in Competition Accounts view

## Key Features to Test

### Competition Accounts View
- [ ] CSV upload works
- [ ] Transaction table displays correctly
- [ ] Weekly summaries load
- [ ] Distribution costs appear after creation
- [ ] Weekly drill-down shows transactions inline
- [ ] Transaction flagging works
- [ ] View refreshes properly when switching from other views

### Manage Competitions View
- [ ] Competition creation/deletion works
- [ ] Results management functional
- [ ] CSV import/export works
- [ ] Season management works

### Presentation Night View
- [ ] Distribution creation works
- [ ] Costs are recorded correctly
- [ ] Competition Accounts view updates automatically

## Rollback Plan

If issues occur:

1. **Immediate**: Revert to previous Railway deployment
2. **Code Issues**: 
   ```bash
   git revert <commit-hash>
   git push origin main
   ```
3. **Database Issues**: Restore from backup if available

## Monitoring

After deployment, monitor:
- Application logs in Railway dashboard
- Database performance
- User feedback
- Error rates

## Support

For deployment issues:
1. Check Railway deployment logs
2. Verify environment variables
3. Test database connectivity
4. Check CORS configuration for your domain