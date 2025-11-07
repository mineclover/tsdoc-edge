#!/bin/bash

for file in call-graph-analysis circular-detection-dfs common-issues-solutions confidence-scoring diagram-index implementation-roadmap quality-dashboard relationship-taxonomy system-metrics type-matching-algorithm; do
    echo "=== $file.mmd ==="
    npx mmdc -i ".tsdoc/diagrams/$file.mmd" -o /tmp/test.svg 2>&1 | grep -A2 "Parse error" | head -3
done
