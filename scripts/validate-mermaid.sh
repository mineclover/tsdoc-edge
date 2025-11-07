#!/bin/bash
# Mermaid diagram validation script

echo "🔍 Validating Mermaid diagrams..."
echo ""

DIAGRAMS_DIR=".tsdoc/diagrams"
FAILED=0
TOTAL=0

for file in "$DIAGRAMS_DIR"/*.mmd; do
    if [ -f "$file" ]; then
        TOTAL=$((TOTAL + 1))
        filename=$(basename "$file")

        # Try to compile with mmdc
        if npx -y mmdc -i "$file" -o /tmp/test.svg 2>/dev/null; then
            echo "✅ $filename"
        else
            echo "❌ $filename - Parse error"
            FAILED=$((FAILED + 1))
        fi
    fi
done

echo ""
echo "📊 Results: $((TOTAL - FAILED))/$TOTAL diagrams valid"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
