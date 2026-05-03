---
description: Validate Context Engineering Template (project-specific)
---

# Validate Project (Context Engineering Template)

> **Generated for this codebase:** Template repo with 5 use-cases (pydantic-ai, mcp-server, agent-factory-with-subagents, template-generator, ai-coding-workflows-foundation). Python: ruff, mypy, pytest in use-cases/pydantic-ai and use-cases/agent-factory-with-subagents. TypeScript: use-cases/mcp-server (tsc, vitest, prettier). Root: shell scripts, PRPs/, journal/. Run from repo root. Use **`/validate-project`** (not `/validate`) to run this project's validation and avoid conflicts with team/global commands.
>
> **Setup:** For full Phase 2 (mypy) and Phase 4 (pytest), activate `.venv` and run `./install-dev-tools.sh` or `uv sync --extra dev` first.

## Phase 1: Linting
!`ruff check use-cases/pydantic-ai use-cases/agent-factory-with-subagents`
!`cd use-cases/mcp-server && npm run type-check 2>/dev/null; npx prettier --check "src/**/*.ts" 2>/dev/null || true`

## Phase 2: Type Checking
!`cd use-cases/mcp-server && npm run type-check`
!`mypy use-cases/pydantic-ai use-cases/agent-factory-with-subagents --ignore-missing-imports 2>/dev/null || true`

## Phase 3: Style Checking
!`ruff format --check use-cases/pydantic-ai use-cases/agent-factory-with-subagents`
!`cd use-cases/mcp-server && npx prettier --check "src/**/*.ts" 2>/dev/null || true`

## Phase 4: Unit Testing
!`pytest use-cases/pydantic-ai use-cases/agent-factory-with-subagents -v --tb=short 2>/dev/null || true`
!`cd use-cases/mcp-server && npm run test:run 2>/dev/null || true`

## Phase 5: Structure & Documentation (Template E2E)

Use workspace tools (e.g. list_dir, read_file, glob_file_search) to verify; do **not** run compound shell commands with `&&` / `||` / `for` (they require approval in some IDEs). Report ✓ or ✗ for each.

### Core structure
- **Core files:** CLAUDE.md, README.md, create-project.sh exist; at least one of INITIAL.md or INITIAL_EXAMPLE.md exists → report "✓ Core files" or list missing.
- **Use-cases:** Directories use-cases/pydantic-ai, use-cases/mcp-server, use-cases/agent-factory-with-subagents, use-cases/template-generator, use-cases/ai-coding-workflows-foundation exist → report "✓ Use-cases" or list missing.

### Command parity
- **Commands:** For each of generate-prp, execute-prp, generate-prompt, validate-project, generate-validate, new-project, build-prp, generate-prd, summarize: .claude/commands/{cmd}.md or .cursor/prompts/{cmd}.md exists → report "✓ Commands" or list missing.

### PRP/PRD and journal
- **PRPs:** PRPs/templates/prp_base.md, PRPs/templates/prd_base.md exist; PRPs/prompts is a directory → report "✓ PRPs" or list missing.
- **Journal:** Ensure journal/ exists (create with a single `mkdir -p journal` if needed).

## Summary
All validation passed. Template is ready for use or for creating new projects.

## Journal Entry (required after running)

1. **Ensure `journal/` exists:** `mkdir -p journal`
2. **Append one line to `journal/YYYY-MM-DD.md`** (today, ISO): `HH:MM | Pass/Fail | E:N W:M | P1:OK P2:... | optional note`
3. **Update `journal/README.md`:** One line per date, e.g. `YYYY-MM-DD: N runs, last Pass (E:0 W:1)`

**Example:** `14:30 | Pass | E:0 W:2 | P1:OK P2:OK P4:OK P5:OK | /validate-project`
