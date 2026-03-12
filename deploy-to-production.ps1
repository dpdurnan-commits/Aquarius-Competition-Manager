# Production Deployment Script for Railway (PowerShell)
# This script prepares the application for production deployment

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Production Deployment Preparation" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Copy frontend files to backend/public
Write-Host "Step 1: Copying frontend files to backend/public..." -ForegroundColor Yellow

# Create public directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "backend/public" | Out-Null

# Copy HTML file
Copy-Item "index.html" "backend/public/" -Force
Write-Host "  ✓ Copied index.html" -ForegroundColor Green

# Copy CSS file
Copy-Item "styles.css" "backend/public/" -Force
Write-Host "  ✓ Copied styles.css" -ForegroundColor Green

# Copy all JavaScript files (excluding test files)
Get-ChildItem -Path "." -Filter "*.js" | Where-Object {
    $_.Name -notmatch '\.test\.js$' -and
    $_.Name -notmatch '\.pbt\.test\.js$' -and
    $_.Name -notmatch '\.integration\.test\.js$' -and
    $_.Name -notmatch '\.e2e\.test\.js$'
} | ForEach-Object {
    Copy-Item $_.FullName "backend/public/" -Force
    Write-Host "  ✓ Copied $($_.Name)" -ForegroundColor Green
}

Write-Host "  ✓ Frontend files copied successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Verify backend configuration
Write-Host "Step 2: Verifying backend configuration..." -ForegroundColor Yellow

# Check if Dockerfile exists
if (Test-Path "backend/Dockerfile") {
    Write-Host "  ✓ Dockerfile found" -ForegroundColor Green
} else {
    Write-Host "  ✗ Dockerfile not found!" -ForegroundColor Red
    exit 1
}

# Check if railway.json exists
if (Test-Path "backend/railway.json") {
    Write-Host "  ✓ railway.json found" -ForegroundColor Green
} else {
    Write-Host "  ✗ railway.json not found!" -ForegroundColor Red
    exit 1
}

# Check if Procfile exists
if (Test-Path "backend/Procfile") {
    Write-Host "  ✓ Procfile found" -ForegroundColor Green
} else {
    Write-Host "  ✗ Procfile not found!" -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ Backend configuration verified" -ForegroundColor Green
Write-Host ""

# Step 3: Build TypeScript
Write-Host "Step 3: Building TypeScript..." -ForegroundColor Yellow
Push-Location backend
try {
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ TypeScript build successful" -ForegroundColor Green
    } else {
        Write-Host "  ✗ TypeScript build failed!" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}
Write-Host ""

# Step 4: Verify environment variables template
Write-Host "Step 4: Verifying environment variables template..." -ForegroundColor Yellow
if (Test-Path "backend/.env.production.example") {
    Write-Host "  ✓ .env.production.example found" -ForegroundColor Green
    Write-Host ""
    Write-Host "  IMPORTANT: Configure these environment variables in Railway:" -ForegroundColor Cyan
    Write-Host "  --------------------------------------------------------" -ForegroundColor Cyan
    Get-Content "backend/.env.production.example" | Where-Object { $_ -notmatch '^#' -and $_ -notmatch '^\s*$' }
    Write-Host "  --------------------------------------------------------" -ForegroundColor Cyan
} else {
    Write-Host "  ✗ .env.production.example not found!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Check documentation
Write-Host "Step 5: Checking deployment documentation..." -ForegroundColor Yellow
if (Test-Path "RAILWAY_DEPLOYMENT.md") {
    Write-Host "  ✓ RAILWAY_DEPLOYMENT.md found" -ForegroundColor Green
} else {
    Write-Host "  ✗ RAILWAY_DEPLOYMENT.md not found!" -ForegroundColor Red
}

if (Test-Path "PRODUCTION_CHECKLIST.md") {
    Write-Host "  ✓ PRODUCTION_CHECKLIST.md found" -ForegroundColor Green
} else {
    Write-Host "  ✗ PRODUCTION_CHECKLIST.md not found!" -ForegroundColor Red
}
Write-Host ""

# Step 6: Git status check
Write-Host "Step 6: Checking git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ([string]::IsNullOrWhiteSpace($gitStatus)) {
    Write-Host "  ✓ No uncommitted changes" -ForegroundColor Green
} else {
    Write-Host "  ⚠ You have uncommitted changes. Consider committing them before deployment." -ForegroundColor Yellow
    git status --short
}
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Deployment Preparation Complete!" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Commit and push your changes to GitHub:" -ForegroundColor White
Write-Host "   git add ." -ForegroundColor Gray
Write-Host "   git commit -m 'Prepare for production deployment'" -ForegroundColor Gray
Write-Host "   git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Configure Railway environment variables (see above)" -ForegroundColor White
Write-Host ""
Write-Host "3. Railway will automatically deploy when you push to GitHub" -ForegroundColor White
Write-Host ""
Write-Host "4. Follow the checklist in PRODUCTION_CHECKLIST.md" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see RAILWAY_DEPLOYMENT.md" -ForegroundColor Cyan
Write-Host ""
