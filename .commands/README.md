# Canonical Commands Source

This directory contains the **single source of truth** for all slash commands used across Claude Code, Cursor, and VS Code (GitHub Copilot).

## How It Works

1. **Edit commands here** - Make changes to `.commands/*.md`
2. **Run sync** - Execute `./sync-commands.sh` to distribute to all IDEs
3. **Verify** - Use `./sync-commands.sh --check` to detect drift

## Directory Structure

```
.commands/           # Canonical source (this directory)
├── generate-prp.md
├── execute-prp.md
├── build-prp.md
├── generate-prompt.md
├── generate-validate.md
├── validate-project.md
├── new-project.md
├── summarize.md
├── generate-prd.md
└── validate.md

.claude/commands/    # Claude Code output
.cursor/prompts/     # Cursor output
.github/prompts/     # VS Code/GitHub Copilot output
```

## Sync Script Options

```bash
./sync-commands.sh              # Sync all commands to IDE directories
./sync-commands.sh --dry-run    # Show what would change (no modifications)
./sync-commands.sh --check      # Verify sync status (for CI)
```

## IDE-Specific Frontmatter

The sync script automatically adds appropriate frontmatter for each IDE:

- **Claude/Cursor**: `description:` field
- **VS Code**: `mode: agent` and `description:` fields

## Adding New Commands

1. Create `new-command.md` in `.commands/`
2. Include a description line or YAML frontmatter with `description:`
3. Run `./sync-commands.sh`

## When to Sync

- After editing any command in `.commands/`
- Before committing changes
- In CI to verify sync status (`--check` returns non-zero on drift)
