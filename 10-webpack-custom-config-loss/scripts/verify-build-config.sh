#!/bin/bash

# Build Configuration Verification Script
#
# This script verifies that critical build-time configurations are present
# in the compiled application bundle. Use this to detect when custom webpack
# configuration has been lost during migration.
#
# Usage: ./scripts/verify-build-config.sh [dist-directory]

set -e

DIST_DIR="${1:-dist/webpack-custom-config-demo}"
ERRORS=0

echo "🔍 Verifying build configuration in: $DIST_DIR"
echo ""

# Check if dist directory exists
if [ ! -d "$DIST_DIR" ]; then
  echo "❌ ERROR: Distribution directory not found: $DIST_DIR"
  echo "   Run 'npm run build' first"
  exit 1
fi

# Function to check for pattern in dist files
check_pattern() {
  local pattern="$1"
  local description="$2"
  local required="${3:-true}"

  echo -n "Checking: $description... "

  if grep -r "$pattern" "$DIST_DIR" > /dev/null 2>&1; then
    echo "✓ FOUND"
    return 0
  else
    if [ "$required" = "true" ]; then
      echo "❌ MISSING (REQUIRED)"
      ERRORS=$((ERRORS + 1))
      return 1
    else
      echo "⚠ MISSING (optional)"
      return 0
    fi
  fi
}

# Function to check for NOT pattern (should be removed in production)
check_not_pattern() {
  local pattern="$1"
  local description="$2"

  echo -n "Checking: $description should be removed... "

  if grep -r "$pattern" "$DIST_DIR" > /dev/null 2>&1; then
    echo "❌ FOUND (should be removed)"
    ERRORS=$((ERRORS + 1))
    return 1
  else
    echo "✓ REMOVED"
    return 0
  fi
}

echo "📋 Required Build-Time Injections:"
echo "-----------------------------------"

# 1. Check for CA Certificate
check_pattern "BEGIN CERTIFICATE" "Corporate CA certificate embedded" true

# 2. Check for build-time environment variables
# Note: These will be compiled as string literals, not "process.env.X"
check_pattern "AUTH_SERVICE_URL" "Auth service URL configured" true
check_pattern "DATA_SERVICE_URL" "Data service URL configured" true

# 3. Check for build metadata
check_pattern "BUILD_NUMBER" "Build number present" false
check_pattern "GIT_COMMIT" "Git commit present" false

# 4. Check that process.env references were replaced (not left as-is)
echo ""
echo "📋 Process.env Resolution:"
echo "--------------------------"
check_not_pattern "process\.env\.ANALYTICS_API_KEY" "API key should be replaced, not literal 'process.env'" true
check_not_pattern "process\.env\.AUTH_SERVICE_URL" "Service URL should be replaced, not literal 'process.env'" true

# 5. Check for CA cert marker
echo ""
echo "📋 Configuration Markers:"
echo "-------------------------"
check_pattern "CA_CERT_EMBEDDED" "CA cert embedded marker" true

# 6. Bundle size check (optional)
echo ""
echo "📋 Bundle Analysis:"
echo "-------------------"

MAIN_JS=$(find "$DIST_DIR" -name "main*.js" | head -1)
if [ -f "$MAIN_JS" ]; then
  SIZE=$(wc -c < "$MAIN_JS")
  SIZE_KB=$((SIZE / 1024))
  echo "Main bundle size: ${SIZE_KB}KB"

  # CA cert adds ~2-3KB. If bundle is tiny, cert probably missing
  if [ $SIZE_KB -lt 50 ]; then
    echo "⚠ WARNING: Bundle size seems small - CA cert might be missing"
  fi
fi

# 7. Check for source maps (should exist in dev, removed in prod)
if [ -f "$DIST_DIR/main.js.map" ]; then
  echo "Source maps: ✓ Present (development build)"
else
  echo "Source maps: ✓ Removed (production build)"
fi

echo ""
echo "========================================"

if [ $ERRORS -eq 0 ]; then
  echo "✅ BUILD CONFIGURATION VERIFIED"
  echo ""
  echo "All required build-time configurations are present."
  echo "The application should work correctly in production."
  exit 0
else
  echo "❌ BUILD CONFIGURATION INVALID"
  echo ""
  echo "Found $ERRORS error(s)."
  echo ""
  echo "This indicates that custom webpack configuration was not applied."
  echo "The build succeeded but critical functionality is missing."
  echo ""
  echo "ACTIONS REQUIRED:"
  echo "1. Check if custom-webpack.config.js is being executed"
  echo "2. Verify angular.json uses correct builder"
  echo "3. Review migration steps for lost configuration"
  echo "4. DO NOT DEPLOY TO PRODUCTION"
  echo ""
  exit 1
fi
