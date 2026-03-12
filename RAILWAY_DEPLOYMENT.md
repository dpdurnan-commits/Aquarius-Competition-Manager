# Railway Deployment Guide

This guide will help you deploy the Aquarius Golf Competition Manager to Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. Your GitHub repository connected to Railway
3. A PostgreSQL database (Railway provides this)

## Step 1: Create a New Project on Railway

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your repository: `dpdurnan-commits/Aquarius-Competition-Manager`
4. Railway will detect the backend automatically

## Step 2: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create a `DATABASE_URL` environment variable

## Step 3: Configure Environment Variables

In your Railway project settings, add these environment variables:

### Required Variables

```
NODE_ENV=production
PORT=3000
```

### Database (Automatically provided by Railway)
```
DATABASE_URL=(automatically set by Railway PostgreSQL)
```

### CORS Configuration
```
CORS_ORIGINS=https://your-frontend-domain.railway.app
```

If you're serving the frontend from the same domain, use:
```
CORS_ORIGINS=https://your-app-name.railway.app
```

### JWT Secret (Generate a secure random string)
```
JWT_SECRET=<generate-with-openssl-rand-base64-32>
```

To generate a secure JWT secret, run:
```bash
openssl rand -base64 32
```

## Step 4: Deploy Backend

1. Railway will automatically deploy when you push to GitHub
2. Wait for the build to complete
3. Check the deployment logs for any errors
4. Note your backend URL (e.g., `https://your-backend.railway.app`)

## Step 5: Configure Frontend

### Option A: Serve Frontend from Backend (Recommended)

The backend is already configured to serve the frontend static files from the `public` directory.

1. Copy all frontend files to `backend/public/`:
   ```bash
   cp index.html styles.css *.js backend/public/
   ```

2. Update `index.html` to use relative paths (already configured)

3. The frontend will be available at your Railway backend URL

### Option B: Separate Frontend Deployment

If you want to deploy the frontend separately:

1. Create a new Railway service for the frontend
2. Use a static site configuration
3. Update the frontend's API URL in `apiClient.js` (already auto-detects)

## Step 6: Run Database Migrations

Railway will automatically run migrations on deployment if configured in `package.json`.

To manually run migrations:

1. Go to your Railway project
2. Open the backend service
3. Click on "Settings" → "Deploy"
4. Add a deploy command:
   ```
   npm run migrate && npm start
   ```

Or use Railway CLI:
```bash
railway run npm run migrate
```

## Step 7: Verify Deployment

1. Visit your Railway URL
2. Check that the application loads
3. Test uploading a CSV file
4. Verify database connectivity
5. Test all features (Transaction Summary, Competition Accounts, Presentation Night)

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | development | Set to `production` |
| `PORT` | No | 3000 | Port for the server |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string (auto-set by Railway) |
| `JWT_SECRET` | Yes | - | Secret key for JWT tokens |
| `CORS_ORIGINS` | Yes | - | Comma-separated list of allowed origins |
| `MAX_FILE_SIZE` | No | 10485760 | Max upload size in bytes (10MB) |
| `DB_POOL_MIN` | No | 2 | Minimum database connections |
| `DB_POOL_MAX` | No | 10 | Maximum database connections |

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Check that `DATABASE_URL` is set correctly
2. Verify PostgreSQL service is running
3. Check connection pool settings
4. Review Railway logs for specific errors

### CORS Errors

If you see CORS errors in the browser console:

1. Verify `CORS_ORIGINS` includes your frontend domain
2. Make sure the protocol (https) matches
3. Check for trailing slashes in URLs

### Migration Failures

If migrations fail:

1. Check Railway logs for specific error messages
2. Verify database permissions
3. Try running migrations manually via Railway CLI
4. Check that all migration files are committed to Git

### Frontend Not Loading

If the frontend doesn't load:

1. Verify files are in `backend/public/` directory
2. Check that `index.html` exists
3. Review server logs for 404 errors
4. Verify static file serving is enabled in `server.ts`

## Monitoring

Railway provides built-in monitoring:

1. View logs in real-time
2. Monitor resource usage (CPU, Memory, Network)
3. Set up alerts for errors
4. Track deployment history

## Scaling

Railway automatically scales based on your plan:

- **Starter Plan**: Suitable for development and small teams
- **Pro Plan**: Better performance and higher limits
- **Team Plan**: Multiple environments and team collaboration

## Backup Strategy

1. Railway PostgreSQL includes automatic backups
2. Export data regularly using the export feature
3. Keep CSV backups of transaction data
4. Version control all code changes in Git

## Security Checklist

- [ ] Change default JWT_SECRET to a secure random string
- [ ] Set CORS_ORIGINS to specific domains (not *)
- [ ] Enable HTTPS (Railway provides this automatically)
- [ ] Review and limit database permissions
- [ ] Keep dependencies updated
- [ ] Monitor logs for suspicious activity
- [ ] Use environment variables for all secrets
- [ ] Enable Railway's security features

## Cost Optimization

1. Use appropriate database plan for your data size
2. Monitor resource usage regularly
3. Optimize queries for performance
4. Use connection pooling efficiently
5. Consider caching for frequently accessed data

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: https://github.com/dpdurnan-commits/Aquarius-Competition-Manager/issues
