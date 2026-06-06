#!/usr/bin/env bash
# deploy-app.sh — Build and deploy a "Make Me A..." app to Cloudflare Pages
# 
# Usage: ./deploy-app.sh --title "Japan Trip Countdown" --template countdown --vars "TARGET_DATE=2026-07-15T00:00:00Z"
#
# Deploys instantly to Cloudflare Pages free tier.
# Returns the URL.

set -euo pipefail

TEMPLATE="countdown"
VARS=""
TITLE="My App"
SUBTITLE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --template) TEMPLATE="$2"; shift 2 ;;
    --title) TITLE="$2"; shift 2 ;;
    --subtitle) SUBTITLE="$2"; shift 2 ;;
    --vars) VARS="$2"; shift 2 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g' | head -c 40)
BUILD_DIR="/tmp/make-app-$SLUG"
PROJECT="make-${SLUG}"

echo "═══ Building: $TITLE ($SLUG) ═══"

# Copy template
mkdir -p "$BUILD_DIR"
cp -r "$(dirname $0)/../templates/$TEMPLATE/"* "$BUILD_DIR/"

# Apply variables
if [ -n "$VARS" ]; then
  for pair in $(echo "$VARS" | tr ',' ' '); do
    KEY="${pair%%=*}"
    VAL="${pair#*=}"
    if [[ "$KEY" == "TARGET_DATE" ]]; then
      TARGET_DATE="$VAL"
    fi
  done
fi

# Default variables
TARGET_DATE="${TARGET_DATE:-2026-12-31T00:00:00Z}"
BG_COLOR="${BG_COLOR:-#0f172a}"
TEXT_COLOR="${TEXT_COLOR:-#f8fafc}"
SUBTITLE="${SUBTITLE:-$TITLE}"

# Fill template
cd "$BUILD_DIR"
for f in index.html; do
  sed -i "s|{{TITLE}}|$TITLE|g" "$f"
  sed -i "s|{{SUBTITLE}}|$SUBTITLE|g" "$f"
  sed -i "s|{{TARGET_DATE}}|$TARGET_DATE|g" "$f"
  sed -i "s|{{BG_COLOR}}|$BG_COLOR|g" "$f"
  sed -i "s|{{TEXT_COLOR}}|$TEXT_COLOR|g" "$f"
  sed -i "s|{{LABEL}}|Created with Make Me A...|g" "$f"
done

echo "   Template filled"

# Check if wrangler can use API token
CLOUDFLARE_EMAIL="${CLOUDFLARE_EMAIL:-casey.digennaro@gmail.com}"
ACCOUNT_ID="049ff5e84ecf636b53b162cbb580aae6"
API_KEY="${CLOUDFLARE_API_KEY:-}"

if [ -z "$API_KEY" ]; then
  echo "   ⚠️  No CLOUDFLARE_API_KEY set. App built but not deployed."
  echo "   📁 Files at: $BUILD_DIR"
  exit 0
fi

# Deploy via Cloudflare API (Pages)
echo "   Deploying to Cloudflare Pages..."
DEPLOY_RESULT=$(curl -s -X POST \
  -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
  -H "X-Auth-Key: $API_KEY" \
  -F "metadata={\"body\":\"built from template\"};type=application/json" \
  -F "index.html=@$BUILD_DIR/index.html;type=text/html" \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT/deployments" 2>/dev/null)

URL=$(echo "$DEPLOY_RESULT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if d.get('success'):
    sub = d['result'].get('url','')
    # Subdomain format: <hash>.<project>.pages.dev
    deploy_id = d['result'].get('id','')
    print(f'https://$PROJECT.pages.dev')
else:
    # Create project if it doesn't exist
    print('NEED_PROJECT_CREATION')
" 2>/dev/null)

if [ "$URL" = "NEED_PROJECT_CREATION" ]; then
  # Create the Pages project
  echo "   Creating Pages project..."
  curl -s -X POST \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects" \
    -d "{\"name\":\"$PROJECT\",\"production_branch\":\"main\"}" > /dev/null 2>&1
  
  # Retry deployment
  DEPLOY_RESULT=$(curl -s -X POST \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $API_KEY" \
    -F "metadata={\"body\":\"built from template\"};type=application/json" \
    -F "index.html=@$BUILD_DIR/index.html;type=text/html" \
    "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT/deployments" 2>/dev/null)
  
  URL=$(echo "$DEPLOY_RESULT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'https://$PROJECT.pages.dev' if d.get('success') else 'deploy_failed')
" 2>/dev/null)
fi

echo ""
echo "═══ DONE ═══"
echo "🌐 $TITLE"
echo "📍 $URL"
echo "📁 Source: $BUILD_DIR"
