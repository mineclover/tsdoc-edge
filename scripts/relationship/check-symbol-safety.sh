#!/bin/bash

# Relationship Safety Checker
# Usage: ./check-symbol-safety.sh <symbol-id>
#
# Quick safety check before modifying a symbol
# Combines multiple analyses for comprehensive view

set -e

# Detect tsdoc-edge CLI
if [ -f "$(dirname "$0")/../../dist/cli.js" ]; then
  TSDOC_CMD="node $(dirname "$0")/../../dist/cli.js"
elif [ -f "$(dirname "$0")/../../src/cli.ts" ]; then
  TSDOC_CMD="npx ts-node $(dirname "$0")/../../src/cli.ts"
else
  TSDOC_CMD="tsdoc-edge"
fi

if [ -z "$1" ]; then
  echo "❌ Error: Symbol ID required"
  echo ""
  echo "Usage: $0 <symbol-id>"
  echo ""
  echo "Examples:"
  echo "  $0 class-buildcommand"
  echo "  $0 function-findmarkdownfiles"
  exit 1
fi

SYMBOL_ID="$1"
DEPTH="${2:-3}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Safety Check: $SYMBOL_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Impact Analysis
echo "📊 Step 1: Impact Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
$TSDOC_CMD relationship-impact "$SYMBOL_ID" --depth "$DEPTH"
echo ""

# 2. Check if critical
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Step 2: Criticality Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Checking if symbol is in top 20 critical symbols..."
echo ""

# Run metrics and grep for our symbol
METRICS_OUTPUT=$($TSDOC_CMD relationship-metrics --top 20 2>/dev/null || echo "")

if echo "$METRICS_OUTPUT" | grep -q "$SYMBOL_ID"; then
  echo "⚠️  WARNING: This symbol is in TOP 20 most critical!"
  echo ""
  echo "$METRICS_OUTPUT" | grep -A 3 "$SYMBOL_ID"
  echo ""
  IS_CRITICAL=true
else
  echo "✅ This symbol is NOT in top 20 critical symbols"
  echo "   Normal connectivity level"
  echo ""
  IS_CRITICAL=false
fi

# 3. Connection Overview
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 Step 3: Connection Overview"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
$TSDOC_CMD relationship-query "$SYMBOL_ID" --limit 10
echo ""

# 4. Final Recommendations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Recommendations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$IS_CRITICAL" = true ]; then
  echo "⚠️  HIGH RISK CHANGE"
  echo ""
  echo "This symbol is architecturally critical. Required actions:"
  echo "  ✓ Write comprehensive tests before changing"
  echo "  ✓ Review with senior team member"
  echo "  ✓ Consider feature flag for gradual rollout"
  echo "  ✓ Update all related documentation"
  echo "  ✓ Monitor closely after deployment"
  echo "  ✓ Plan rollback strategy"
  echo ""
  echo "Commands to help:"
  echo "  tsdoc-edge relationship-impact $SYMBOL_ID --depth 5"
  echo "  tsdoc-edge relationship-path $SYMBOL_ID <other-symbol>"
  echo ""
else
  echo "✅ NORMAL RISK CHANGE"
  echo ""
  echo "This symbol has normal connectivity. Standard workflow:"
  echo "  ✓ Follow standard testing practices"
  echo "  ✓ Standard code review process"
  echo "  ✓ Deploy with normal confidence"
  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Safety check complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
