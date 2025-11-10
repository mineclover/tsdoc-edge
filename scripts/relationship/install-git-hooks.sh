#!/bin/bash

# Install Git Hooks for Critical Change Detection
#
# This script installs a pre-commit hook that automatically checks
# if your changes affect any critical symbols before allowing commit.
#
# Usage: ./install-git-hooks.sh [--force]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "")"

if [ -z "$GIT_ROOT" ]; then
  echo "❌ Error: Not in a git repository"
  exit 1
fi

HOOKS_DIR="$GIT_ROOT/.git/hooks"
PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"
FORCE_INSTALL=false

# Parse arguments
if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
  FORCE_INSTALL=true
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Installing TSDoc Edge Git Hooks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Repository: $GIT_ROOT"
echo "Hooks dir:  $HOOKS_DIR"
echo ""

# Check if pre-commit hook already exists
if [ -f "$PRE_COMMIT_HOOK" ] && [ "$FORCE_INSTALL" = false ]; then
  echo "⚠️  Warning: pre-commit hook already exists!"
  echo ""
  echo "Existing hook preview:"
  head -5 "$PRE_COMMIT_HOOK" | sed 's/^/    /'
  echo "    ..."
  echo ""
  echo "Options:"
  echo "  1. Backup and replace:    $0 --force"
  echo "  2. Manually integrate:    cat $SCRIPT_DIR/pre-commit-template.sh"
  echo "  3. Cancel:                Press Ctrl+C"
  echo ""
  read -p "Continue with backup and replace? [y/N] " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
  fi

  # Backup existing hook
  BACKUP="$PRE_COMMIT_HOOK.backup-$(date +%Y%m%d-%H%M%S)"
  cp "$PRE_COMMIT_HOOK" "$BACKUP"
  echo "✓ Backed up existing hook to: $BACKUP"
fi

# Create the pre-commit hook
cat > "$PRE_COMMIT_HOOK" << 'EOF'
#!/bin/bash

# TSDoc Edge Pre-Commit Hook
# Automatically checks if changes affect critical symbols

# Detect tsdoc-edge CLI
if [ -f "$(git rev-parse --show-toplevel)/dist/cli.js" ]; then
  TSDOC_CMD="node $(git rev-parse --show-toplevel)/dist/cli.js"
elif [ -f "$(git rev-parse --show-toplevel)/src/cli.ts" ]; then
  TSDOC_CMD="npx ts-node $(git rev-parse --show-toplevel)/src/cli.ts"
else
  TSDOC_CMD="tsdoc-edge"
fi

# Check if find-critical-changes.sh exists
CRITICAL_CHECKER="$(git rev-parse --show-toplevel)/scripts/relationship/find-critical-changes.sh"

if [ ! -f "$CRITICAL_CHECKER" ]; then
  # Script not found, skip check
  exit 0
fi

# Check if database exists
DB_PATH="$(git rev-parse --show-toplevel)/.tsdoc/tsdoc.db"
if [ ! -f "$DB_PATH" ]; then
  # Database not built yet, skip check
  exit 0
fi

echo ""
echo "🔍 Checking for critical symbol changes..."
echo ""

# Run critical changes check on staged files
"$CRITICAL_CHECKER" --staged 2>/dev/null || {
  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 10 ]; then
    # Critical changes detected
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  CRITICAL CHANGES DETECTED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Your changes affect architecturally critical symbols."
    echo ""
    echo "Before committing, please ensure:"
    echo "  ✓ Comprehensive test coverage"
    echo "  ✓ Code review by senior team member"
    echo "  ✓ Documentation updates"
    echo "  ✓ Impact analysis completed"
    echo ""
    echo "Options:"
    echo "  1. Review changes:     git diff --staged"
    echo "  2. Analyze impact:     $TSDOC_CMD relationship-impact <symbol-id>"
    echo "  3. Force commit:       git commit --no-verify"
    echo "  4. Cancel:             Ctrl+C"
    echo ""

    read -p "Proceed with commit anyway? [y/N] " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Commit cancelled. Use 'git commit --no-verify' to bypass this check."
      exit 1
    fi
  fi
}

exit 0
EOF

chmod +x "$PRE_COMMIT_HOOK"

echo "✅ Pre-commit hook installed successfully!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "What happens now?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Every time you run 'git commit', the hook will:"
echo "  1. Check if your changes affect critical symbols"
echo "  2. Warn you if high-risk changes detected"
echo "  3. Ask for confirmation before allowing commit"
echo ""
echo "Bypass hook when needed:"
echo "  git commit --no-verify"
echo ""
echo "Uninstall hook:"
echo "  rm $PRE_COMMIT_HOOK"
echo ""
echo "Test hook now:"
echo "  # Make a change to a critical file"
echo "  # git add <file>"
echo "  # git commit -m 'test'"
echo ""
