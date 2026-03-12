# Railway Deployment - Quick Start Guide

This is a condensed version of the full deployment guide. For complete details, see `RAILWAY_DEPLOYMENT.md`.

## Prerequisites

- Railway account (https://railway.app)
- GitHub repository: `dpdurnan-commits/Aquarius-Competition-Manager`
- OpenSSL installed (for generating JWT secret)

## Deployment Steps

### 1. Prepare Application for Production

Run the deployment preparation script:

**Windows (PowerShell):**
```powershell
.\deploy-to-production.ps1
```

**Mac/Linux (Bash):**
```bash
chmod +x deploy-to-production.sh
./deploy-to-production.sh
```

This script will:
- Copy all frontend files to `backend/public/`
- Build the TypeScript backend
- Verify all configuration files exist
- Show you what environment variables need to be set

### 2. Commit and Push to GitHub

```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 3. Create Railway Project

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select `dpdurnan-commits/Aquarius-Competition-Manager`
4. Railway will detect the Dockerfile automatically

### 4. Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway automatically creates `DATABASE_URL` environment variable

### 5. Configure Environment Variables

In Railway project settings, add these variables:

#### Required Variables

```bash
NODE_ENV=production
PORT=3000
```

#### Generate JWT Secret

Run this command to generate a secure JWT secret:

```bash
openssl rand -base64 32
```

Then add it to Railway:

```bash
JWT_SECRET=<paste-the-generated-value-here>
```

#### CORS Configuration

After Railway deploys, you'll get a URL like `https://aquarius-golf-xxxxx.railway.app`

Set CORS to that URL:

```bash
CORS_ORIGINS=https://aquarius-golf-xxxxx.railway.app
```

**Note:** Replace `aquarius-golf-xxxxx` with your actual Railway domain.

### 6. Deploy

Railway will automatically deploy when you push to GitHub. Monitor the deployment:

1. Go to your Railway project
2. Click on the backend service
3. View the "Deployments" tab
4. Watch the build logs

### 7. Verify Deployment

Once deployed:

1. Visit your Railway URL (e.g., `https://aquarius-golf-xxxxx.railway.app`)
2. You should see the Aquarius Competition Manager interface
3. Test uploading a CSV file
4. Check the Transaction Summary
5. Test Competition Accounts
6. Test Presentation Night features

## Environment Variables Summary

| Variable | Value | How to Get |
|----------|-------|------------|
| `NODE_ENV` | `production` | Fixed value |
| `PORT` | `3000` | Fixed value |
| `DATABASE_URL` | Auto-set | Railway PostgreSQL adds this automatically |
| `JWT_SECRET` | Random string | Run: `openssl rand -base64 32` |
| `CORS_ORIGINS` | Your Railway URL | Copy from Railway after first deployment |

## Troubleshooting

### Build Fails

- Check Railway build logs for specific errors
- Verify all files were committed to Git
- Ensure `backend/Dockerfile` exists

### Database Connection Errors

- Verify PostgreSQL service is running in Railway
- Check that `DATABASE_URL` is set
- Review Railway logs for connection errors

### Frontend Not Loading

- Verify files are in `backend/public/` directory
- Check Railway logs for 404 errors
- Ensure static file serving is enabled (already configured in `server.ts`)

### CORS Errors

- Verify `CORS_ORIGINS` matches your Railway URL exactly
- Include `https://` protocol
- No trailing slash

## Getting Your Railway URL

After deployment:

1. Go to your Railway project
2. Click on the backend service
3. Go to "Settings" tab
4. Look for "Domains" section
5. Your URL will be shown there (e.g., `https://aquarius-golf-xxxxx.railway.app`)

## Updating CORS After First Deployment

After you get your Railway URL:

1. Go to Railway project settings
2. Find the `CORS_ORIGINS` variable
3. Update it with your actual Railway URL
4. Railway will automatically redeploy

## Next Steps

- Follow the complete checklist in `PRODUCTION_CHECKLIST.md`
- Read the full deployment guide in `RAILWAY_DEPLOYMENT.md`
- Set up monitoring and alerts in Railway
- Configure custom domain (optional)

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: https://github.com/dpdurnan-commits/Aquarius-Competition-Manager/issues

---

**Last Updated:** 2026-03-12
