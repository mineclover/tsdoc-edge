#!/bin/bash

# Find Critical Changes in Git Diff
# Analyzes changed files to identify high-risk modifications
#
# Usage:
#   ./find-critical-changes.sh [commit-range]
#   ./find-critical-changes.sh --staged
#
# Examples:
#   ./find-critical-changes.sh              # Uncommitted changes
#   ./find-critical-changes.sh --staged     # Only staged changes (for git hook)
#   ./find-critical-changes.sh HEAD~1       # Last commit
#   ./find-critical-changes.sh main..HEAD   # Changes since main

set -e

# Detect tsdoc-edge CLI
if [ -f "$(dirname "$0")/../../dist/cli.js" ]; then
  TSDOC_CMD="node $(dirname "$0")/../../dist/cli.js"
elif [ -f "$(dirname "$0")/../../src/cli.ts" ]; then
  TSDOC_CMD="npx ts-node $(dirname "$0")/../../src/cli.ts"
else
  TSDOC_CMD="tsdoc-edge"
fi

STAGED_ONLY=false
COMMIT_RANGE="${1:-}"

# Check for --staged flag
if [ "$1" = "--staged" ]; then
  STAGED_ONLY=true
  COMMIT_RANGE=""
fi

TEMP_FILE=$(mktemp)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Analyzing Changed Files for Critical Symbols"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get changed files
if [ "$STAGED_ONLY" = true ]; then
  echo "📝 Analyzing: Staged changes only"
  ALL_FILES=$(git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' || echo "")
elif [ -z "$COMMIT_RANGE" ]; then
  echo "📝 Analyzing: Uncommitted changes"
  CHANGED_FILES=$(git diff --name-only 2>/dev/null || echo "")
  STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || echo "")
  ALL_FILES=$(echo -e "$CHANGED_FILES\n$STAGED_FILES" | sort -u | grep -E '\.(ts|tsx|js|jsx)$' || echo "")
else
  echo "📝 Analyzing: $COMMIT_RANGE"
  ALL_FILES=$(git diff --name-only "$COMMIT_RANGE" | grep -E '\.(ts|tsx|js|jsx)$' || echo "")
fi

if [ -z "$ALL_FILES" ]; then
  echo "✅ No TypeScript/JavaScript files changed"
  echo ""
  exit 0
fi

echo "Files changed:"
echo "$ALL_FILES" | sed 's/^/  • /'
echo ""

# Get top critical symbols
echo "🎯 Loading critical symbols list..."
CRITICAL_SYMBOLS=$($TSDOC_CMD relationship-metrics --top 30 2>/dev/null | \
  grep -E "^\s+[0-9]+\." | \
  awk '{print $2}' || echo "")

if [ -z "$CRITICAL_SYMBOLS" ]; then
  echo "⚠️  Could not load critical symbols"
  echo "   Make sure database is built: tsdoc-edge build src"
  exit 1
fi

echo "✓ Loaded $(echo "$CRITICAL_SYMBOLS" | wc -l) critical symbols"
echo ""

# Check each changed file
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚨 Risk Assessment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

CRITICAL_FILES=()
HIGH_RISK_FILES=()

# Query database for symbols in changed files
for file in $ALL_FILES; do
  # Convert file path to symbol pattern
  # src/commands/BuildCommand.ts -> class-buildcommand, method-buildcommand-*

  file_base=$(basename "$file" .ts)
  file_base=$(basename "$file_base" .tsx)
  file_base=$(basename "$file_base" .js)
  file_base=$(basename "$file_base" .jsx)

  # Convert to kebab-case pattern
  pattern=$(echo "$file_base" | sed 's/\([A-Z]\)/-\L\1/g' | sed 's/^-//')

  # Check if any critical symbol matches this file
  matches=$(echo "$CRITICAL_SYMBOLS" | grep -i "$pattern" || echo "")

  if [ -n "$matches" ]; then
    CRITICAL_FILES+=("$file")
    echo "⚠️  CRITICAL: $file"
    echo "   Matches critical symbols:"
    echo "$matches" | sed 's/^/     • /'
    echo ""

    # Get impact for first match
    first_match=$(echo "$matches" | head -1)
    echo "   Impact analysis:"
    $TSDOC_CMD relationship-impact "$first_match" --depth 2 2>/dev/null | \
      grep -E "(affected|Risk:|Depth)" | sed 's/^/     /' || echo "     Could not analyze"
    echo ""
  fi
done

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

total_files=$(echo "$ALL_FILES" | wc -l)
critical_count=${#CRITICAL_FILES[@]}

echo "Total files changed: $total_files"
echo "Critical files: $critical_count"
echo ""

if [ $critical_count -gt 0 ]; then
  echo "⚠️  HIGH RISK CHANGES DETECTED!"
  echo ""
  echo "Critical files modified:"
  for file in "${CRITICAL_FILES[@]}"; do
    echo "  • $file"
  done
  echo ""
  echo "Recommendations:"
  echo "  ✓ Review changes extra carefully"
  echo "  ✓ Ensure comprehensive test coverage"
  echo "  ✓ Consider feature flags"
  echo "  ✓ Plan rollback strategy"
  echo "  ✓ Monitor closely after deployment"
  echo ""
  echo "Detailed analysis:"
  for file in "${CRITICAL_FILES[@]}"; do
    file_base=$(basename "$file" .ts)
    pattern=$(echo "$file_base" | sed 's/\([A-Z]\)/-\L\1/g' | sed 's/^-//')
    symbol=$(echo "$CRITICAL_SYMBOLS" | grep -i "$pattern" | head -1)
    if [ -n "$symbol" ]; then
      echo "  tsdoc-edge relationship-impact $symbol"
    fi
  done
  echo ""

  # Exit with warning code
  exit 10
else
  echo "✅ No critical symbols modified"
  echo "   Standard review process sufficient"
  echo ""
fi

rm -f "$TEMP_FILE"
