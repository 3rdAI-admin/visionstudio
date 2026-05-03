#!/bin/bash
# sync-commands.sh - Sync canonical commands to all IDE directories
#
# This script maintains a single source of truth for slash commands
# and distributes them to Claude, Cursor, and VS Code with appropriate
# frontmatter and naming conventions.
#
# Usage:
#   ./sync-commands.sh          # Sync all commands
#   ./sync-commands.sh --dry-run # Show what would be changed
#   ./sync-commands.sh --check   # Check for drift (CI mode)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CANONICAL_DIR="$SCRIPT_DIR/.commands"
CLAUDE_DIR="$SCRIPT_DIR/.claude/commands"
CURSOR_DIR="$SCRIPT_DIR/.cursor/prompts"
VSCODE_DIR="$SCRIPT_DIR/.github/prompts"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DRY_RUN=false
CHECK_MODE=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        --check)
            CHECK_MODE=true
            ;;
    esac
done

# Ensure canonical directory exists
if [ ! -d "$CANONICAL_DIR" ]; then
    echo -e "${RED}Error: Canonical commands directory not found: $CANONICAL_DIR${NC}"
    echo "Create .commands/ directory with canonical command files first."
    exit 1
fi

# Count files (excluding README.md)
CANONICAL_COUNT=$(find "$CANONICAL_DIR" -name "*.md" -type f ! -name "README.md" | wc -l | tr -d ' ')
if [ "$CANONICAL_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}Warning: No .md files found in $CANONICAL_DIR${NC}"
    echo "Add canonical command files to .commands/ directory."
    exit 0
fi

echo -e "${BLUE}Syncing $CANONICAL_COUNT commands from .commands/ to IDE directories...${NC}"
echo ""

SYNCED=0
SKIPPED=0
DRIFTED=0

# Get description from frontmatter or first heading
get_description() {
    local file="$1"
    # Try to get from frontmatter
    if head -1 "$file" | grep -q "^---$"; then
        desc=$(sed -n '/^---$/,/^---$/p' "$file" | grep "^description:" | sed 's/^description: *//' | tr -d '"' | tr -d "'")
        if [ -n "$desc" ]; then
            echo "$desc"
            return
        fi
    fi
    # Fall back to first heading
    grep -m1 "^# " "$file" | sed 's/^# //'
}

# Sync a single command
sync_command() {
    local src="$1"
    local basename
    local description
    basename=$(basename "$src" .md)
    description=$(get_description "$src")

    # Read source content (strip any existing frontmatter)
    local content
    if head -1 "$src" | grep -q "^---$"; then
        # Find line number of second --- and take everything after
        local end_line
        end_line=$(awk '/^---$/{n++; if(n==2){print NR; exit}}' "$src")
        if [ -n "$end_line" ]; then
            content=$(tail -n +$((end_line + 1)) "$src")
        else
            content=$(cat "$src")
        fi
    else
        content=$(cat "$src")
    fi

    # Trim leading blank lines from content
    content=$(echo "$content" | awk 'NF{found=1} found')

    # Adjust relative links to be workspace-relative from the target directory (all are 2 levels deep)
    local transformed_content
    transformed_content=$(echo "$content" | sed -E 's|\]\(([^/h#][^)]*)\)|\](../../\1)|g')

    # === Claude Code ===
    local claude_file="$CLAUDE_DIR/$basename.md"
    local claude_content="---
description: $description
---

$transformed_content"

    # === Cursor ===
    local cursor_file="$CURSOR_DIR/$basename.md"
    local cursor_content="---
description: $description
---

$transformed_content"

    # === VS Code (GitHub Copilot) ===
    local vscode_file="$VSCODE_DIR/$basename.prompt.md"
    local vscode_content="---
agent: agent
description: $description
---

$transformed_content"

    # Check/write files
    local changes=0

    for target_file in "$claude_file" "$cursor_file" "$vscode_file"; do
        local target_content
        case "$target_file" in
            */.claude/*) target_content="$claude_content" ;;
            */.cursor/*) target_content="$cursor_content" ;;
            */.github/*) target_content="$vscode_content" ;;
        esac

        if [ -f "$target_file" ]; then
            local existing
            existing=$(cat "$target_file")
            if [ "$existing" != "$target_content" ]; then
                changes=$((changes + 1))
                if $CHECK_MODE; then
                    echo -e "  ${YELLOW}DRIFT${NC} $target_file"
                    DRIFTED=$((DRIFTED + 1))
                elif $DRY_RUN; then
                    echo -e "  ${YELLOW}WOULD UPDATE${NC} $target_file"
                else
                    echo "$target_content" > "$target_file"
                    echo -e "  ${GREEN}UPDATED${NC} $target_file"
                fi
            else
                SKIPPED=$((SKIPPED + 1))
            fi
        else
            changes=$((changes + 1))
            if $CHECK_MODE; then
                echo -e "  ${RED}MISSING${NC} $target_file"
                DRIFTED=$((DRIFTED + 1))
            elif $DRY_RUN; then
                echo -e "  ${YELLOW}WOULD CREATE${NC} $target_file"
            else
                mkdir -p "$(dirname "$target_file")"
                echo "$target_content" > "$target_file"
                echo -e "  ${GREEN}CREATED${NC} $target_file"
            fi
        fi
    done

    if [ $changes -gt 0 ]; then
        SYNCED=$((SYNCED + changes))
    fi
}

# Process each canonical command (exclude README.md)
for src_file in "$CANONICAL_DIR"/*.md; do
    if [ -f "$src_file" ]; then
        basename=$(basename "$src_file")
        # Skip README.md - it's documentation, not a command
        if [ "$basename" = "README.md" ]; then
            continue
        fi
        echo -e "${BLUE}$basename${NC}"
        sync_command "$src_file"
    fi
done

echo ""
echo -e "${BLUE}============================================${NC}"

if $CHECK_MODE; then
    if [ $DRIFTED -gt 0 ]; then
        echo -e "${RED}Found $DRIFTED files with drift${NC}"
        echo "Run ./sync-commands.sh to sync changes"
        exit 1
    else
        echo -e "${GREEN}All commands in sync${NC}"
        exit 0
    fi
elif $DRY_RUN; then
    echo -e "${YELLOW}Dry run complete${NC}"
    echo "Run without --dry-run to apply changes"
else
    echo -e "${GREEN}Sync complete: $SYNCED updated, $SKIPPED unchanged${NC}"
fi
