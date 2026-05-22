#!/bin/bash

# Webpack Configuration Audit Script
#
# Run this BEFORE attempting Angular migration to identify custom
# webpack configurations that will be lost.
#
# Usage: ./scripts/audit-webpack-config.sh

set -e

echo "🔍 Auditing Webpack Custom Configuration"
echo "========================================="
echo ""

WARNINGS=0
ERRORS=0

# Check for custom webpack config file
echo "📁 Checking for custom webpack configuration..."
if [ -f "custom-webpack.config.js" ]; then
  echo "   ⚠️  FOUND: custom-webpack.config.js"
  WARNINGS=$((WARNINGS + 1))
  echo ""
  echo "   This file will be IGNORED in Angular 17+."
  echo "   Migration plan required before upgrading."
  echo ""
else
  echo "   ✓ No custom-webpack.config.js found"
  echo ""
fi

# Check angular.json for custom builders
echo "📁 Checking angular.json for custom builders..."
if [ -f "angular.json" ]; then
  if grep -q "@angular-builders/custom-webpack" angular.json; then
    echo "   ⚠️  FOUND: @angular-builders/custom-webpack"
    WARNINGS=$((WARNINGS + 1))
    echo ""
    echo "   Builder references:"
    grep -n "@angular-builders/custom-webpack" angular.json
    echo ""
    echo "   These will be replaced during migration."
    echo ""
  else
    echo "   ✓ No custom webpack builders detected"
    echo ""
  fi
else
  echo "   ❌ angular.json not found"
  ERRORS=$((ERRORS + 1))
fi

# Analyze custom webpack config if it exists
if [ -f "custom-webpack.config.js" ]; then
  echo "📋 Analyzing custom webpack configuration..."
  echo ""

  # Check for CA certificate injection
  if grep -q "CA" custom-webpack.config.js; then
    echo "   ⚠️  CA certificate handling detected"
    echo "      Migration required: Move to container-level or runtime config"
    echo ""
  fi

  # Check for DefinePlugin (environment variable injection)
  if grep -q "DefinePlugin" custom-webpack.config.js; then
    echo "   ⚠️  Build-time variable injection detected (webpack.DefinePlugin)"
    echo "      Migration required: Use Angular environment or build scripts"
    echo ""
  fi

  # Check for custom resolve aliases
  if grep -q "resolve.alias" custom-webpack.config.js; then
    echo "   ⚠️  Custom module aliases detected"
    echo "      Migration required: Update tsconfig.json paths"
    echo ""
  fi

  # Check for custom loaders
  if grep -q "module.rules" custom-webpack.config.js || grep -q "loader" custom-webpack.config.js; then
    echo "   ⚠️  Custom loaders detected"
    echo "      Migration required: ESBuild plugins or pre-build scripts"
    echo ""
  fi

  # Check for optimization customizations
  if grep -q "optimization" custom-webpack.config.js; then
    echo "   ⚠️  Build optimization customizations detected"
    echo "      Review: Some may have ESBuild equivalents"
    echo ""
  fi
fi

# Check package.json for webpack-related dependencies
echo "📦 Checking dependencies..."
if [ -f "package.json" ]; then
  if grep -q "@angular-builders/custom-webpack" package.json; then
    echo "   ⚠️  @angular-builders/custom-webpack in dependencies"
    WARNINGS=$((WARNINGS + 1))
  fi

  if grep -q "\"webpack\":" package.json; then
    echo "   ⚠️  Direct webpack dependency detected"
    WARNINGS=$((WARNINGS + 1))
  fi

  if [ $WARNINGS -eq 0 ]; then
    echo "   ✓ No webpack-related dependencies found"
  fi
  echo ""
fi

# Summary
echo "========================================="
echo "📊 AUDIT SUMMARY"
echo "========================================="
echo ""

if [ $ERRORS -gt 0 ]; then
  echo "❌ $ERRORS ERROR(S) - Cannot proceed with audit"
  exit 1
fi

if [ $WARNINGS -gt 0 ]; then
  echo "⚠️  $WARNINGS ISSUE(S) DETECTED"
  echo ""
  echo "RECOMMENDATION:"
  echo "───────────────"
  echo ""
  echo "1. ❌ DO NOT run 'ng update' yet"
  echo ""
  echo "2. 📋 Document all custom webpack functionality:"
  echo "   - What does each customization do?"
  echo "   - Why is it needed?"
  echo "   - What breaks if it's removed?"
  echo ""
  echo "3. 🔍 Research Angular 17 equivalents:"
  echo "   - ESBuild configuration options"
  echo "   - Build scripts and hooks"
  echo "   - Alternative approaches"
  echo ""
  echo "4. ⚙️  Implement equivalent functionality:"
  echo "   - Update tsconfig.json for module resolution"
  echo "   - Create build scripts for injections"
  echo "   - Update Dockerfile for CA certificates"
  echo "   - Modify environment handling"
  echo ""
  echo "5. ✅ Verify equivalence:"
  echo "   - Build with old config (Angular 14)"
  echo "   - Build with new config (Angular 17)"
  echo "   - Compare artifacts"
  echo "   - Test runtime behavior"
  echo ""
  echo "6. ✅ Only then migrate:"
  echo "   - Run 'ng update' after equivalents verified"
  echo "   - Re-test after migration"
  echo ""
  echo "⚠️  CRITICAL WARNING:"
  echo "──────────────────"
  echo ""
  echo "If you migrate without addressing these issues:"
  echo "- Build will succeed (looks fine) ✓"
  echo "- But application will be broken ✗"
  echo "- Certificate errors in production ✗"
  echo "- Undefined configuration values ✗"
  echo "- Silent failures worse than loud failures ✗"
  echo ""
  exit 2
else
  echo "✅ No custom webpack configuration detected"
  echo ""
  echo "Safe to proceed with standard Angular migration."
  echo ""
  exit 0
fi
