# Railway Setup - Step-by-Step Instructions

## ✅ Step 1: Preparation Complete!

Your code has been pushed to GitHub and is ready for deployment.

**Repository**: `dpdurnan-commits/Aquarius-Competition-Manager`
**Branch**: `main`

---

## 🚀 Step 2: Create Railway Project

1. **Go to Railway**: Open https://railway.app/new in your browser

2. **Sign in**: If you haven't already, sign in with your GitHub account

3. **Deploy from GitHub**:
   - Click "Deploy from GitHub repo"
   - You may need to authorize Railway to access your GitHub repositories
   - Select the repository: `dpdurnan-commits/Aquarius-Competition-Manager`
   - Railway will automatically detect the Dockerfile in the `backend` directory

4. **Wait for initial detection**: Railway will scan your repository

---

## 🗄️ Step 3: Add PostgreSQL Database

1. **In your Railway project dashboard**, click the "+ New" button

2. **Select Database**:
   - Click "Database"
   - Select "Add PostgreSQL"

3. **Railway will create the database**:
   - Wait for the PostgreSQL service to finish deploying (shows as "Active")
   - The database is now ready but NOT automatically linked

4. **Get the DATABASE_URL**:
   - Click on the **PostgreSQL service** (the database icon in your project)
   - Go to the "Connect" tab
   - Look for "DATABASE_URL" 
   - **Copy the full connection string** (it looks like: `postgresql://postgres:password@host:port/railway`)
   - Keep this copied - you'll need it in the next step

---

## 🔗 Step 3.5: Link Database to Backend Service

**IMPORTANT**: Railway does NOT automatically link the database to your backend. You must do this manually:

1. **Click on your backend service** (the one with your code, NOT the PostgreSQL service)

2. **Go to the "Variables" tab**

3. **Add the DATABASE_URL variable**:
   - Click "+ New Variable" button
   - Variable name: `DATABASE_URL`
   - Variable value: **Paste the full connection string you copied from Step 3.4**
   - Example: `postgresql://postgres:drUfGczTigKHQIutBOyVbjvOgAFyOdnd@trolley.proxy.rlwy.net:40828/railway`
   - Click "Add" or press Enter

4. **Railway will automatically redeploy** your backend with the database connection

**Note**: Use the FULL URL including `postgresql://`, username, password, host, port, and database name. Do NOT remove any part of it.

---

## ⚙️ Step 4: Configure Environment Variables

1. **Click on your backend service** (if you're not already there from Step 3.5)

2. **Go to the "Variables" tab**

3. **Verify DATABASE_URL is set** (you added this in Step 3.5)

4. **Add these additional environment variables** (click "+ New Variable" for each):

### Required Variables:

**NODE_ENV:**
```
NODE_ENV=production
```

**PORT:**
```
PORT=3000
```

**JWT_SECRET:**
```
JWT_SECRET=jNDOvt8PLSTK9ye3941Mmkxrk7J+DIcLjR9TL3DHOuI=
```

**Note**: The JWT_SECRET above has been generated for you. You can use it or generate a new one.

### CORS_ORIGINS (Add after first deployment):

**IMPORTANT**: You'll add this AFTER your first deployment when you get your Railway URL.

For now, skip this variable. We'll add it in Step 6.

---

## 🔨 Step 5: Deploy

1. **Railway will automatically start deploying** after you add the environment variables

2. **Monitor the deployment**:
   - Click on the "Deployments" tab
   - Watch the build logs
   - Look for "Build successful" message

3. **Wait for deployment to complete** (usually 2-5 minutes)

4. **Get your Railway URL**:
   - Go to the "Settings" tab
   - Scroll to "Domains" section
   - You'll see a URL like: `https://aquarius-competition-manager-production-xxxx.up.railway.app`
   - **Copy this URL** - you'll need it for the next step

---

## 🌐 Step 6: Update CORS Configuration

Now that you have your Railway URL, you need to add it to the CORS configuration:

1. **Go back to the "Variables" tab**

2. **Add a new variable**:
   ```
   CORS_ORIGINS=https://aquarius-competition-manager-production-xxxx.up.railway.app
   ```
   **Replace the URL above with YOUR actual Railway URL from Step 5**

3. **Railway will automatically redeploy** with the new CORS setting

4. **Wait for the redeployment to complete** (1-2 minutes)

---

## ✅ Step 7: Verify Deployment

1. **Visit your Railway URL** (the one from Step 5)

2. **You should see**: The Aquarius Competition Manager interface

3. **Test the application**:
   - Try uploading a CSV file
   - Check the Transaction Summary
   - Test Competition Accounts
   - Test Presentation Night features

4. **Check for errors**:
   - Open browser DevTools (F12)
   - Look at the Console tab
   - There should be no CORS errors or other errors

---

## 🎉 Success!

If everything works, your application is now live on Railway!

**Your Production URL**: `https://aquarius-competition-manager-production-xxxx.up.railway.app`

---

## 📊 Step 8: Monitor Your Application

1. **View Logs**:
   - In Railway, click on your backend service
   - Go to the "Observability" tab
   - View real-time logs

2. **Monitor Resources**:
   - Check CPU and Memory usage
   - Railway shows these metrics in the dashboard

3. **Set up Alerts** (Optional):
   - Go to project settings
   - Configure alerts for errors or downtime

---

## 🔧 Troubleshooting

### Build Fails

**Check**:
- View the build logs in Railway
- Look for specific error messages
- Verify all files were pushed to GitHub

**Solution**:
- Fix any errors in your code
- Commit and push changes
- Railway will automatically redeploy

### Database Connection Errors

**Check**:
- Verify PostgreSQL service is running
- Check that `DATABASE_URL` is set
- View logs for connection errors

**Solution**:
- Restart the PostgreSQL service
- Check Railway service status

### Frontend Not Loading

**Check**:
- Verify files are in `backend/public/` directory
- Check Railway logs for 404 errors
- Verify the URL is correct

**Solution**:
- Ensure all frontend files were committed
- Check that `index.html` exists in `backend/public/`

### CORS Errors

**Check**:
- Open browser DevTools (F12)
- Look for CORS errors in Console
- Verify `CORS_ORIGINS` matches your Railway URL exactly

**Solution**:
- Update `CORS_ORIGINS` with the correct Railway URL
- Include `https://` protocol
- No trailing slash
- Railway will automatically redeploy

### Application Crashes

**Check**:
- View Railway logs for error messages
- Check for missing environment variables
- Verify database is connected

**Solution**:
- Fix any code errors
- Add missing environment variables
- Restart the service

---

## 📝 Environment Variables Summary

Here's a complete list of what should be set in Railway:

| Variable | Value | Source |
|----------|-------|--------|
| `NODE_ENV` | `production` | Manual |
| `PORT` | `3000` | Manual |
| `DATABASE_URL` | `postgresql://...` | Auto-set by Railway |
| `JWT_SECRET` | `jNDOvt8PLSTK9ye3941Mmkxrk7J+DIcLjR9TL3DHOuI=` | Generated above |
| `CORS_ORIGINS` | `https://your-railway-url.railway.app` | Your Railway URL |

---

## 🔄 Making Updates

When you want to update your application:

1. **Make changes locally**
2. **Test locally**
3. **Commit changes**: `git commit -m "Your message"`
4. **Push to GitHub**: `git push origin main`
5. **Railway automatically deploys** the new version

---

## 💰 Railway Pricing

- **Starter Plan**: $5/month - Good for development
- **Pro Plan**: $20/month - Recommended for production
- **Free Trial**: Railway offers a trial period

You can monitor your usage in the Railway dashboard.

---

## 📚 Additional Resources

- **Railway Documentation**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Your GitHub Repo**: https://github.com/dpdurnan-commits/Aquarius-Competition-Manager

---

## ✨ Next Steps

After successful deployment:

1. **Share the URL** with your users
2. **Set up regular backups** (Railway PostgreSQL includes automatic backups)
3. **Monitor usage** and performance
4. **Consider a custom domain** (optional)

---

**Need Help?** Check the troubleshooting section above or refer to the detailed guides:
- `RAILWAY_DEPLOYMENT.md` - Complete deployment guide
- `PRODUCTION_CHECKLIST.md` - Pre-deployment checklist
- `DEPLOYMENT_SUMMARY.md` - Configuration overview

---

**Last Updated**: 2026-03-12
**Status**: Ready for Railway Deployment ✅
