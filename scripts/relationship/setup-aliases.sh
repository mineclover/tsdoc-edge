#!/bin/bash

# TSDoc Edge Relationship System - Shell Aliases Setup
# Adds convenient aliases for daily workflow
#
# Usage: source ./setup-aliases.sh
#        OR
#        Add to ~/.bashrc or ~/.zshrc:
#        source /path/to/tsdoc-edge/scripts/relationship/setup-aliases.sh

# Detect tsdoc-edge CLI
if [ -f "$(dirname "$0")/../../dist/cli.js" ]; then
  TSDOC_CMD="node $(dirname "$0")/../../dist/cli.js"
elif [ -f "$(dirname "$0")/../../src/cli.ts" ]; then
  TSDOC_CMD="npx ts-node $(dirname "$0")/../../src/cli.ts"
else
  TSDOC_CMD="tsdoc-edge"
fi

# Core relationship commands
alias rel-check="$TSDOC_CMD relationship-check"
alias rel-impact="$TSDOC_CMD relationship-impact"
alias rel-query="$TSDOC_CMD relationship-query"
alias rel-path="$TSDOC_CMD relationship-path"
alias rel-metrics="$TSDOC_CMD relationship-metrics"
alias rel-clusters="$TSDOC_CMD relationship-clusters"
alias rel-validate="$TSDOC_CMD relationship-validate"
alias rel-export="$TSDOC_CMD relationship-export"
alias rel-help="$TSDOC_CMD relationship-help"

# Quick analysis aliases
alias rel-critical="$TSDOC_CMD relationship-metrics --top 20"
alias rel-bottlenecks="$TSDOC_CMD relationship-metrics --metric betweenness --top 15"
alias rel-stats="$TSDOC_CMD relationship-query --stats"

# Workflow scripts
if [ -f "$(dirname "$0")/check-symbol-safety.sh" ]; then
  alias rel-safe="$(dirname "$0")/check-symbol-safety.sh"
fi

if [ -f "$(dirname "$0")/weekly-report.sh" ]; then
  alias rel-report="$(dirname "$0")/weekly-report.sh .reports"
fi

if [ -f "$(dirname "$0")/find-critical-changes.sh" ]; then
  alias rel-git="$(dirname "$0")/find-critical-changes.sh"
fi

# Quick export aliases
alias rel-to-gephi="$TSDOC_CMD relationship-export --format graphml"
alias rel-to-neo4j="$TSDOC_CMD relationship-export --format cypher"
alias rel-to-dot="$TSDOC_CMD relationship-export --format dot"
alias rel-to-json="$TSDOC_CMD relationship-export --format json"
alias rel-to-csv="$TSDOC_CMD relationship-export --format csv"

# Function: Safety check before modifying a symbol
rel-before() {
  if [ -z "$1" ]; then
    echo "Usage: rel-before <symbol-id>"
    echo "Example: rel-before class-buildcommand"
    return 1
  fi

  echo "🔍 Running safety check for: $1"
  echo ""
  $TSDOC_CMD relationship-check "$1"
}

# Function: Find path between two symbols
rel-connect() {
  if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: rel-connect <from-symbol> <to-symbol>"
    echo "Example: rel-connect class-buildcommand class-databasemanager"
    return 1
  fi

  echo "🔗 Finding paths from $1 to $2"
  echo ""
  $TSDOC_CMD relationship-path "$1" "$2"
}

# Function: Quick impact check with custom depth
rel-blast() {
  if [ -z "$1" ]; then
    echo "Usage: rel-blast <symbol-id> [depth]"
    echo "Example: rel-blast class-buildcommand 5"
    return 1
  fi

  local depth="${2:-3}"
  echo "💥 Impact analysis for: $1 (depth: $depth)"
  echo ""
  $TSDOC_CMD relationship-impact "$1" --depth "$depth"
}

# Function: Generate visualization
rel-viz() {
  local format="${1:-dot}"
  local output="${2:-graph.$format}"

  echo "📊 Exporting to $format format..."
  $TSDOC_CMD relationship-export --format "$format" > "$output"
  echo "✓ Saved to: $output"

  if [ "$format" = "dot" ]; then
    echo ""
    echo "To generate PNG:"
    echo "  dot -Tpng $output -o ${output%.dot}.png"
  fi
}

# Function: Show my aliases
rel-aliases() {
  cat << 'EOF'
TSDoc Edge Relationship System - Aliases

CORE COMMANDS:
  rel-check <symbol>         Combined safety check (impact + metrics + query)
  rel-impact <symbol>        Downstream impact analysis
  rel-query <symbol>         Search relationships
  rel-path <from> <to>       Find connection paths
  rel-metrics                Calculate centrality metrics
  rel-clusters               Find architectural modules
  rel-validate               Check data integrity
  rel-export                 Export to other formats
  rel-help                   Interactive help system

QUICK ANALYSIS:
  rel-critical               Show top 20 critical symbols
  rel-bottlenecks            Show top 15 bottlenecks
  rel-stats                  Overall statistics

WORKFLOW SCRIPTS:
  rel-safe <symbol>          Comprehensive safety check
  rel-report                 Generate weekly report
  rel-git                    Check critical changes in git diff

EXPORT SHORTCUTS:
  rel-to-gephi               Export GraphML for Gephi
  rel-to-neo4j               Export Cypher for Neo4j
  rel-to-dot                 Export DOT for Graphviz
  rel-to-json                Export JSON for analysis
  rel-to-csv                 Export CSV for spreadsheets

HELPER FUNCTIONS:
  rel-before <symbol>        Safety check before modifying
  rel-connect <from> <to>    Find path between symbols
  rel-blast <symbol> [depth] Impact analysis with custom depth
  rel-viz [format] [output]  Generate visualization
  rel-aliases                Show this help

EXAMPLES:
  rel-before class-buildcommand
  rel-connect class-a class-b
  rel-blast class-buildcommand 5
  rel-viz dot architecture.dot
  rel-to-gephi > graph.graphml
  rel-critical
  rel-report

EOF
}

# Print success message
echo "✅ TSDoc Edge Relationship aliases loaded!"
echo ""
echo "Quick start:"
echo "  rel-critical              # Show top critical symbols"
echo "  rel-before <symbol>       # Safety check before modifying"
echo "  rel-aliases               # Show all aliases"
echo ""
