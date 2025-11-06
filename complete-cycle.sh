#!/bin/bash
# complete-cycle.sh - 전체 피드백 사이클 실행
# TSDoc Edge CLI Feedback Cycle Automation

set -e  # Exit on error

TSDOC_CLI="node dist/cli.js"

echo "================================================================================"
echo "TSDoc Edge - Complete Feedback Cycle"
echo "================================================================================"
echo ""

# Phase 1: Build
echo "=== Phase 1: Build & Parse ==="
$TSDOC_CLI build src
echo ""

# Phase 2: Analysis
echo "=== Phase 2: Analysis ==="
echo "--- Health Check ---"
$TSDOC_CLI health src
echo ""
echo "--- Statistics ---"
$TSDOC_CLI stats src
echo ""

# Phase 3: Issue Detection
echo "=== Phase 3: Issue Detection ==="
echo "--- Undocumented Symbols (top 10) ---"
$TSDOC_CLI undocumented 2>&1 | head -25
echo ""

# Phase 5: Document Management
echo "=== Phase 5: Document Management ==="
echo "--- Index Documents ---"
$TSDOC_CLI index-docs managed
echo ""
echo "--- Validate Documents ---"
$TSDOC_CLI validate-docs
echo ""
echo "--- Update Backlinks ---"
$TSDOC_CLI update-backlinks
echo ""
echo "--- Validate Specifications ---"
$TSDOC_CLI validate-spec managed
echo ""

# Summary
echo "================================================================================"
echo "Cycle Complete ✅"
echo "================================================================================"
echo ""
echo "Next steps:"
echo "  1. Review undocumented symbols"
echo "  2. Improve incomplete specifications"
echo "  3. Run 'tsdoc-edge suggest' for detailed recommendations"
echo ""
