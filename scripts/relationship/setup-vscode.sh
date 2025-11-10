#!/bin/bash

# Setup VS Code Integration for TSDoc Edge
#
# Copies VS Code task templates to your local .vscode directory
# Usage: ./setup-vscode.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMPLATE_DIR="$PROJECT_ROOT/.vscode-template"
VSCODE_DIR="$PROJECT_ROOT/.vscode"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Setting up VS Code Integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "❌ Error: Template directory not found: $TEMPLATE_DIR"
  exit 1
fi

# Create .vscode directory if it doesn't exist
if [ ! -d "$VSCODE_DIR" ]; then
  mkdir -p "$VSCODE_DIR"
  echo "✓ Created .vscode directory"
fi

# Check if tasks.json already exists
if [ -f "$VSCODE_DIR/tasks.json" ]; then
  echo "⚠️  Warning: tasks.json already exists"
  echo ""
  read -p "Backup and replace? [y/N] " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled. You can manually copy files from .vscode-template/"
    exit 0
  fi

  # Backup existing file
  BACKUP="$VSCODE_DIR/tasks.json.backup-$(date +%Y%m%d-%H%M%S)"
  cp "$VSCODE_DIR/tasks.json" "$BACKUP"
  echo "✓ Backed up existing tasks.json to: $(basename $BACKUP)"
fi

# Copy tasks.json
cp "$TEMPLATE_DIR/tasks.json" "$VSCODE_DIR/"
echo "✓ Copied tasks.json"

# Copy README
if [ -f "$TEMPLATE_DIR/README.md" ]; then
  cp "$TEMPLATE_DIR/README.md" "$VSCODE_DIR/"
  echo "✓ Copied README.md"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VS Code Integration Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "What's available now:"
echo "  • 14 Relationship analysis tasks"
echo "  • 3 General TSDoc tasks"
echo "  • Quick access via Ctrl+Shift+P → 'Tasks: Run Task'"
echo ""
echo "Try it:"
echo "  1. Open VS Code"
echo "  2. Press Ctrl+Shift+P"
echo "  3. Type 'Tasks: Run Task'"
echo "  4. Select 'Relationship: Show Critical Symbols'"
echo ""
echo "See .vscode/README.md for full documentation"
echo ""
