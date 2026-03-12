#!/bin/bash

# Production Deployment Script for Railway
# This script prepares the application for production deployment

set -e  # Exit on error

echo "========================================="
echo "Production Deployment Preparation"
echo "========================================="
echo ""

# Step 1: Copy frontend files to backend/public
echo "Step 1: Copying frontend files to backend/public..."

# Create public directory if it doesn't exist
mkdir -p backend/public

# Copy HTML file
cp index.html backend/public/

# Copy CSS file
cp styles.css backend/public/

# Copy all JavaScript files (excluding test files and node_modules)
for file in *.js; do
    if [[ ! "$file" =~ \.test\.js$ ]] && [[ ! "$file" =~ \.pbt\.test\.js$ ]] && [[ ! "$file" =~ \.integration\.test\.js$ ]] && [[ ! "$file" =~ \.e2e\.test\.js$ ]]; then
        cp "$file" backend/public/
        echo "  ✓ Copied $file"
    fi
done

echo "  ✓ Frontend files copied successfully"
echo ""

# Step 2: Verify backend configuration
echo "Step 2: Verifying backend configuration..."

# Check if Dockerfile exists
if [ -f "backend/Dockerfile" ]; then
    echo "  ✓ Dockerfile found"
else
    echo "  ✗ Dockerfile not found!"
    exit 1
fi

# Check if railway.json exists
if [ -f "backend/railway.json" ]; then
    echo "  ✓ railway.json found"
else
    echo "  ✗ railway.json not found!"
    exit 1
fi

# Check if Procfile exists
if [ -f "backend/Procfile" ]; then
    echo "  ✓ Procfile found"
else
    echo "  ✗ Procfile not found!"
    exit 1
fi

echo "  ✓ Backend configuration verified"
echo ""

# Step 3: Build TypeScript
echo "Step 3: Building TypeScript..."
cd backend
npm run build
if [ $? -eq 0 ]; then
    echo "  ✓ TypeScript build successful"
else
    echo "  ✗ TypeScript build failed!"
    exit 1
fi
cd ..
echo ""

# Step 4: Verify environment variables template
echo "Step 4: Verifying environment variables template..."
if [ -f "backend/.env.production.example" ]; then
    echo "  ✓ .env.production.example found"
    echo ""
    echo "  IMPORTANT: Configure these environment variables in Railway:"
    echo "  --------------------------------------------------------"
    cat backend/.env.production.example | grep -v "^#" | grep -v "^$"
    echo "  --------------------------------------------------------"
else
    echo "  ✗ .env.production.example not found!"
    exit 1
fi
echo ""

# Step 5: Check documentation
echo "Step 5: Checking deployment documentation..."
if [ -f "RAILWAY_DEPLOYMENT.md" ]; then
    echo "  ✓ RAILWAY_DEPLOYMENT.md found"
else
    echo "  ✗ RAILWAY_DEPLOYMENT.md not found!"
fi

if [ -f "PRODUCTION_CHECKLIST.md" ]; then
    echo "  ✓ PRODUCTION_CHECKLIST.md found"
else
    echo "  ✗ PRODUCTION_CHECKLIST.md not found!"
fi
echo ""

# Step 6: Git status check
echo "Step 6: Checking git status..."
if git diff --quiet && git diff --cached --quiet; then
    echo "  ✓ No uncommitted changes"
else
    echo "  ⚠ You have uncommitted changes. Consider committing them before deployment."
    git status --short
fi
echo ""

echo "========================================="
echo "Deployment Preparation Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Commit and push your changes to GitHub:"
echo "   git add ."
echo "   git commit -m 'Prepare for production deployment'"
echo "   git push origin main"
echo ""
echo "2. Configure Railway environment variables (see above)"
echo ""
echo "3. Railway will automatically deploy when you push to GitHub"
echo ""
echo "4. Follow the checklist in PRODUCTION_CHECKLIST.md"
echo ""
echo "For detailed instructions, see RAILWAY_DEPLOYMENT.md"
echo ""
