#!/bin/bash
#
# Instant rollback script for production deployment
# Usage: ./scripts/rollback.sh [VERSION]
#
# If VERSION not specified, rolls back to previous version.
# Requires SSH access to production server (via secrets).

set -e

DEPLOY_HOST="${PROD_HOST:?Set PROD_HOST before running rollback.sh}"
DEPLOY_USER="${PROD_USER:?Set PROD_USER before running rollback.sh}"
DEPLOY_PORT="${PROD_PORT:-22}"
DEPLOY_PATH="${PROD_DEPLOY_PATH:?Set PROD_DEPLOY_PATH before running rollback.sh}"
TARGET_VERSION="${1:-previous}"

echo "🔄 Rolling back deployment..."
echo "Host: $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PORT"
echo "Path: $DEPLOY_PATH"
echo "Target: $TARGET_VERSION"

ssh -p $DEPLOY_PORT $DEPLOY_USER@$DEPLOY_HOST << ROLLBACK_SCRIPT
set -e

DEPLOY_PATH="$DEPLOY_PATH"
TARGET_VERSION="$TARGET_VERSION"

cd "\$DEPLOY_PATH"

# Get current and previous versions
CURRENT=$(readlink current || echo "unknown")
RELEASES_DIR="releases"

if [ "\$TARGET_VERSION" = "previous" ]; then
  # Get second-latest version
  PREV_VERSION=$(ls -t -d \$RELEASES_DIR/*/ 2>/dev/null | head -n 2 | tail -n 1 | xargs basename)
  if [ -z "\$PREV_VERSION" ]; then
    echo "❌ No previous version found!"
    exit 1
  fi
  TARGET_VERSION="\$PREV_VERSION"
fi

if [ ! -d "\$RELEASES_DIR/\$TARGET_VERSION" ]; then
  echo "❌ Version not found: \$TARGET_VERSION"
  ls -la \$RELEASES_DIR/
  exit 1
fi

# Perform rollback
echo "📦 Current version: \$CURRENT"
echo "🎯 Rolling back to: \$TARGET_VERSION"

ln -sfn "releases/\$TARGET_VERSION" current.tmp
mv -Tf current.tmp current

# Health check
echo "🏥 Running health check..."
sleep 2
HTTP_CODE=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost/index.html || echo "000")

if [ "\$HTTP_CODE" = "200" ] || [ "\$HTTP_CODE" = "304" ]; then
  echo "✅ Rollback successful!"
  echo "✅ Health check passed (HTTP \$HTTP_CODE)"
else
  echo "❌ Health check failed (HTTP \$HTTP_CODE)"
  echo "🚨 Attempting recovery..."
  if [ -n "\$CURRENT" ]; then
    ln -sfn "\$CURRENT" current
    echo "🔄 Restored to: \$CURRENT"
  fi
  exit 1
fi

ROLLBACK_SCRIPT

echo "✅ Rollback completed successfully!"
