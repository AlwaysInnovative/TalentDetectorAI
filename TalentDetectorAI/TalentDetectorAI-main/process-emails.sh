#!/bin/bash
# Process pending emails
# Run: bash process-emails.sh

CRON_SECRET=${CRON_SECRET:-"your-secret-from-env"}
API_URL=${API_URL:-"http://localhost:3000"}

echo "📧 Processing pending emails..."
echo ""

response=$(curl -s -X POST "${API_URL}/api/send-emails?secret=${CRON_SECRET}")

echo "Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

echo ""
echo "✅ Done!"
echo ""
echo "To auto-process emails, set up a cron job:"
echo "*/5 * * * * cd /path/to/project && bash process-emails.sh"
