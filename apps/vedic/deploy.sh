#!/bin/bash
# Deploy Vedic Panchang App to BangleApps
# Run from: /Users/gajanand.surve/Downloads/Watchface/BangleApps

set -e

echo "========================================"
echo "VEDIC PANCHANG APP - DEPLOYMENT"
echo "========================================"
echo ""

# Check we're in BangleApps directory
if [ ! -d "apps" ] || [ ! -f "apps.json" ]; then
    echo "❌ ERROR: Not in BangleApps directory!"
    echo "   Please run from: /Users/gajanand.surve/Downloads/Watchface/BangleApps"
    exit 1
fi

echo "✅ In BangleApps directory"
echo ""

# Remove old panchang apps
echo "🗑️  Removing old panchang/panchangclock apps..."
rm -rf apps/panchang/
rm -rf apps/panchangclock/
echo "✅ Old apps removed"
echo ""

# Create vedic app folder
echo "📁 Creating vedic app folder..."
mkdir -p apps/vedic
echo "✅ Folder created"
echo ""

# Copy vedic app files (assumes vedic_app_fresh is extracted here)
echo "📦 Copying vedic app files..."

# Check if vedic_app_fresh folder exists
if [ ! -d "vedic_app_fresh" ]; then
    echo "❌ ERROR: vedic_app_fresh folder not found!"
    echo "   Please extract vedic-app-complete.zip first"
    echo "   Should be at: /Users/gajanand.surve/Downloads/Watchface/BangleApps/vedic_app_fresh"
    exit 1
fi

cp vedic_app_fresh/* apps/vedic/
echo "✅ Files copied"
echo ""

# List files
echo "📋 Vedic app contains:"
ls -lh apps/vedic/
echo ""

# Regenerate apps.json
echo "🔄 Regenerating apps.json..."
bash bin/create_apps_json.sh
echo "✅ apps.json regenerated"
echo ""

# Verify vedic is in apps.json
echo "🔍 Verifying vedic app in apps.json..."
if grep -q '"id": "vedic"' apps.json; then
    echo "✅ Found vedic app in apps.json"
    
    # Check if supports field exists
    if cat apps.json | grep -A 15 '"id": "vedic"' | grep -q '"supports"'; then
        echo "✅ 'supports' field present"
    else
        echo "❌ 'supports' field MISSING!"
        exit 1
    fi
else
    echo "❌ Vedic app NOT in apps.json!"
    exit 1
fi
echo ""

# Git operations
echo "📊 Git status:"
git status --short
echo ""

echo "➕ Staging changes..."
git add apps/vedic/
git add --sparse apps.json
git add -A  # Add deletions too
echo "✅ Files staged"
echo ""

echo "💾 Committing..."
git commit -m "Add Vedic Panchang Clock - Clean repack

- Removed old panchang/panchangclock apps
- Added new vedic app with proper structure
- Includes supports field for BANGLEJS2
- Battery optimized watchface
- Data: Dec 2025 + Full 2026 for Hyderabad
- Features: Time, Date, Masa, Tithi, Ekadashi, Vishnu name"

echo "✅ Committed"
echo ""

echo "🚀 Pushing to GitHub..."
git push origin master
echo "✅ Pushed!"
echo ""

echo "========================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Wait 3-5 minutes for GitHub Pages to rebuild"
echo "2. Visit: https://gajasurve.github.io/BangleApps/"
echo "3. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Win)"
echo "4. Search for 'Vedic' or 'Panchang'"
echo "5. Click 'Upload' to install on watch"
echo ""
echo "App details:"
echo "  - ID: vedic"
echo "  - Name: Vedic Panchang Clock"
echo "  - Type: clock"
echo "  - Supports: BANGLEJS2 ✅"
echo "  - Data files: vedic-data.json (75KB), vedic-names.json"
echo ""
echo "Jai Shri Vishnu! 🙏"
echo ""
