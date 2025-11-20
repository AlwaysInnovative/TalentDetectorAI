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
