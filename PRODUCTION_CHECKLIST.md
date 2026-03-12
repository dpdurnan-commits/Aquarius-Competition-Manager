# Production Deployment Checklist

Use this checklist before deploying to Railway or any production environment.

## Pre-Deployment

### Preparation Script
- [ ] Run deployment preparation script:
  - Windows: `.\deploy-to-production.ps1`
  - Mac/Linux: `./deploy-to-production.sh`
- [ ] Verify all frontend files copied to `backend/public/`
- [ ] Verify TypeScript build successful
- [ ] Review environment variables list

### Code Review
- [ ] All features tested locally
- [ ] No console.log statements in production code (or wrapped in NODE_ENV checks)
- [ ] No hardcoded credentials or secrets
- [ ] All environment variables documented
- [ ] Error handling implemented for all API endpoints
- [ ] Input validation on all user inputs

### Security
- [ ] Generate secure JWT_SECRET (use `openssl rand -base64 32`)
- [ ] Set CORS_ORIGINS to specific domains (not *)
- [ ] Review and update .gitignore to exclude sensitive files
- [ ] Ensure .env files are not committed to Git
- [ ] Database credentials stored in environment variables only
- [ ] Rate limiting configured appropriately
- [ ] Helmet security headers enabled

### Database
- [ ] All migrations tested locally
- [ ] Backup strategy in place
- [ ] Database indexes created for performance
- [ ] Connection pooling configured
- [ ] SSL/TLS enabled for database connections

### Frontend
- [ ] API URL detection working (localhost vs production)
- [ ] All assets optimized (images, CSS, JS)
- [ ] Cache busting implemented (version parameters)
- [ ] Error messages user-friendly
- [ ] Loading states implemented
- [ ] Mobile responsive design tested

## Railway Setup

### Project Configuration
- [ ] GitHub repository connected to Railway
- [ ] PostgreSQL database added to project
- [ ] Environment variables configured (see below)
- [ ] Build command set: `npm run build`
- [ ] Start command set: `npm start`
- [ ] Health check path set: `/health`

### Required Environment Variables
```
NODE_ENV=production
PORT=3000
DATABASE_URL=(auto-set by Railway PostgreSQL)
JWT_SECRET=(generate with openssl rand -base64 32)
CORS_ORIGINS=https://your-app-name.railway.app
```

### Optional Environment Variables
```
MAX_FILE_SIZE=10485760
DB_POOL_MIN=2
DB_POOL_MAX=10
```

## Deployment

### Initial Deployment
- [ ] Push code to GitHub main branch
- [ ] Railway automatically builds and deploys
- [ ] Monitor build logs for errors
- [ ] Wait for deployment to complete
- [ ] Note the Railway URL

### Database Setup
- [ ] Migrations run automatically on first deployment
- [ ] Verify tables created correctly
- [ ] Check database logs for errors
- [ ] Test database connectivity

### Verification
- [ ] Visit Railway URL and verify app loads
- [ ] Test CSV upload functionality
- [ ] Verify transaction summary displays
- [ ] Test competition accounts feature
- [ ] Test presentation night winnings distribution
- [ ] Test competition costs manager
- [ ] Check browser console for errors
- [ ] Test on mobile devices
- [ ] Verify CORS working correctly

## Post-Deployment

### Monitoring
- [ ] Set up Railway alerts for errors
- [ ] Monitor resource usage (CPU, Memory, Network)
- [ ] Check application logs regularly
- [ ] Monitor database performance
- [ ] Track API response times

### Documentation
- [ ] Update README with production URL
- [ ] Document any production-specific configuration
- [ ] Create user guide for end users
- [ ] Document backup and recovery procedures

### Maintenance
- [ ] Schedule regular database backups
- [ ] Plan for dependency updates
- [ ] Monitor security advisories
- [ ] Set up automated testing pipeline
- [ ] Plan for scaling if needed

## Rollback Plan

If deployment fails:

1. **Check Logs**: Review Railway deployment logs for specific errors
2. **Revert Code**: Roll back to previous working commit
3. **Database**: Restore from backup if migrations failed
4. **Notify Users**: If downtime occurred, communicate with users
5. **Post-Mortem**: Document what went wrong and how to prevent it

## Common Issues and Solutions

### Build Failures
- Check TypeScript compilation errors
- Verify all dependencies are in package.json
- Ensure Node version compatibility

### Database Connection Issues
- Verify DATABASE_URL is set correctly
- Check PostgreSQL service is running
- Review connection pool settings
- Ensure SSL is configured if required

### CORS Errors
- Verify CORS_ORIGINS matches your frontend domain
- Check protocol (http vs https)
- Ensure no trailing slashes in URLs

### Performance Issues
- Review database query performance
- Check connection pool settings
- Monitor memory usage
- Consider caching strategies

## Support Contacts

- Railway Support: https://railway.app/help
- GitHub Issues: https://github.com/dpdurnan-commits/Aquarius-Competition-Manager/issues
- Documentation: See RAILWAY_DEPLOYMENT.md

## Version History

| Version | Date | Changes | Deployed By |
|---------|------|---------|-------------|
| 1.0.0   | 2026-03-12 | Initial production release | - |

---

**Last Updated**: 2026-03-12
**Next Review**: Before next major deployment
