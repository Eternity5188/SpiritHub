#!/bin/bash
#
# One-command deployment script (manual trigger for non-main branches)
# Usage: ./scripts/deploy.sh [VERSION]
#
# If VERSION not specified, uses current git commit SHA.

set -e

DEPLOY_HOST="${PROD_HOST:?Set PROD_HOST before running deploy.sh}"
DEPLOY_USER="${PROD_USER:?Set PROD_USER before running deploy.sh}"
DEPLOY_PORT="${PROD_PORT:-22}"
DEPLOY_PATH="${PROD_DEPLOY_PATH:?Set PROD_DEPLOY_PATH before running deploy.sh}"

VERSION="${1:-$(git rev-parse --short HEAD)_$(date +%Y%m%d_%H%M%S)}"

echo "📦 Deploying SpiritHub Frontend"
echo "Version: $VERSION"
echo "Target: $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PORT"
echo ""

# Check if dist exists
if [ ! -d "dist" ]; then
  echo "❌ dist/ not found. Run: npm run build"
  exit 1
fi

echo "📤 Uploading dist to production..."
scp -r -P $DEPLOY_PORT dist/* $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/releases/$VERSION/

echo "🔗 Switching symlink..."
ssh -p $DEPLOY_PORT $DEPLOY_USER@$DEPLOY_HOST << DEPLOY_SCRIPT
set -e
DEPLOY_PATH="$DEPLOY_PATH"
VERSION="$VERSION"

cd "\$DEPLOY_PATH"

# Backup current
if [ -L "current" ]; then
  PREV=\$(readlink current)
  echo "Previous version: \$PREV"
fi

# Switch
ln -sfn "releases/\$VERSION" current.tmp
mv -Tf current.tmp current

# Health check
echo "🏥 Health check..."
sleep 2
HTTP_CODE=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost/index.html || echo "000")

if [ "\$HTTP_CODE" = "200" ] || [ "\$HTTP_CODE" = "304" ]; then
  echo "✅ Health check passed (HTTP \$HTTP_CODE)"
else
  echo "❌ Health check failed (HTTP \$HTTP_CODE)"
  exit 1
fi

# Cleanup
cd "\$DEPLOY_PATH/releases"
ls -t -d */ | tail -n +6 | xargs -r rm -rf
echo "Cleanup completed"

DEPLOY_SCRIPT

echo ""
echo "✅ Deployment successful!"
echo "Version: $VERSION"
