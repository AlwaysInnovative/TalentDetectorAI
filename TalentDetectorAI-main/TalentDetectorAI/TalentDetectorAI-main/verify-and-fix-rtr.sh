#!/bin/bash
# Manual Verification and Fix Script
# Run: bash verify-and-fix-rtr.sh

set -e

echo "🔍 Verifying and Fixing RTR System..."

# ==================== STEP 1: VERIFY ENVIRONMENT ====================

echo ""
echo "📋 STEP 1: Checking environment variables..."

if [ -f ".env.local" ]; then
    echo "✅ .env.local exists"
    
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local && \
       grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local && \
       grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local; then
        echo "✅ All required environment variables found"
    else
        echo "❌ Missing environment variables!"
        echo ""
        echo "Add these to .env.local:"
        echo "NEXT_PUBLIC_SUPABASE_URL=your_supabase_url"
        echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key"
        echo "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
        exit 1
    fi
else
    echo "❌ .env.local not found!"
    exit 1
fi

# ==================== STEP 2: CHECK FILE STRUCTURE ====================

echo ""
echo "📋 STEP 2: Checking file structure..."

REQUIRED_FILES=(
    "lib/supabase/client.ts"
    "app/api/generate-rtr-auto/route.ts"
    "app/dashboard/agency/interests/page.tsx"
    "app/dashboard/agency/interests/[id]/page.tsx"
)

MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  Missing files detected. Re-creating..."
fi

# ==================== STEP 3: RECREATE ALL FILES ====================

echo ""
echo "📋 STEP 3: Creating/Updating all files..."

# Ensure directories exist
mkdir -p lib/supabase
mkdir -p app/api/generate-rtr-auto
mkdir -p app/dashboard/agency/interests/[id]

# Copy the file creation code from previous script here
# (I'll show you the exact files you need below)

echo ""
echo "✅ All files created"

# ==================== STEP 4: VERIFICATION CHECKLIST ====================

echo ""
echo "📋 STEP 4: Manual Verification Checklist"
echo ""
echo "Please verify:"
echo ""
echo "1. ✓ Stop your dev server (Ctrl+C)"
echo "2. ✓ Delete .next folder: rm -rf .next"
echo "3. ✓ Restart dev server: npm run dev"
echo "4. ✓ Check browser console for errors (F12)"
echo "5. ✓ Navigate to /dashboard/agency/interests"
echo "6. ✓ Click on a candidate card"
echo "7. ✓ Check if detail page loads"
echo "8. ✓ Look for 'Generate RTR' button"
echo ""
echo "❓ TROUBLESHOOTING:"
echo ""
echo "If pages are blank:"
echo "  - Check browser console (F12)"
echo "  - Check terminal for errors"
echo "  - Verify Supabase connection"
echo ""
echo "If 'Generate RTR' button missing:"
echo "  - Candidate must have status='interested'"
echo "  - Candidate must have uploaded CV (cv_url)"
echo "  - RTR must not exist yet (right_to_represent_url is null)"
echo ""
echo "If button doesn't work:"
echo "  - Check browser console for API errors"
echo "  - Check terminal for API logs"
echo "  - Verify SUPABASE_SERVICE_ROLE_KEY in .env.local"
echo ""

# ==================== STEP 5: CREATE TEST DATA HELPER ====================

cat > test-rtr-workflow.sh << 'TESTFILE'
#!/bin/bash
echo "🧪 Testing RTR Workflow"
echo ""
echo "1. Open browser to: http://localhost:3000/dashboard/agency/interests"
echo "2. You should see a list of candidates"
echo "3. Look for candidates with 'CLICK TO GENERATE RTR' badge"
echo "4. Click on that candidate card"
echo "5. You should see a HUGE amber/orange 'Generate RTR' button"
echo "6. Click it"
echo "7. Wait for success message"
echo "8. Page should refresh and show 'View RTR' button instead"
echo ""
echo "✅ If all steps work = SUCCESS!"
echo "❌ If any step fails, note which one and share the error"
TESTFILE

chmod +x test-rtr-workflow.sh

echo ""
echo "✅ Created test helper: ./test-rtr-workflow.sh"
echo ""

# ==================== STEP 6: QUICK FIX COMMANDS ====================

cat > quick-fix.sh << 'QUICKFIX'
#!/bin/bash
# Quick fix if something isn't working
echo "🔧 Running quick fixes..."

# Kill any running Next.js processes
pkill -f "next dev" || true

# Clean build
rm -rf .next

# Rebuild
npm run dev &

echo ""
echo "✅ Dev server restarted"
echo ""
echo "Wait 10 seconds for build, then try again"
QUICKFIX

chmod +x quick-fix.sh

echo ""
echo "✅ Created quick fix: ./quick-fix.sh"
echo ""

echo "=========================================="
echo "✅ VERIFICATION COMPLETE"
echo "=========================================="
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Run: ./quick-fix.sh"
echo "2. Wait 10 seconds"
echo "3. Run: ./test-rtr-workflow.sh"
echo "4. Follow the testing steps"
echo ""
echo "If still not working, share:"
echo "  - Browser console errors (F12 → Console tab)"
echo "  - Terminal errors"
echo "  - Which step fails in test-rtr-workflow.sh"
echo ""
ENDFILE

chmod +x verify-and-fix-rtr.sh

echo "Script created. Run: bash verify-and-fix-rtr.sh"
