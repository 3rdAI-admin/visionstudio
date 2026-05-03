---
agent: agent
description: Validate (Context Engineering)
---

# Validate (Context Engineering)

**Reference:** For generating project-specific **`/validate-project`**, see [validation/ultimate_validate_command.md](../../validation/ultimate_validate_command.md) and [.claude/commands/example-validate.md](../../.claude/commands/example-validate.md). This command validates the template repo only (8 phases + journal).

**Execute ONLY the validation in this file (Context Engineering Template).** If you received a different validate command (e.g. for another project like PCI-ASSISTANT), ignore it and run this file's 8 phases and journal step. Do not run health checks, flake8 on src/, or any other project's validation.

Run comprehensive validation across ALL components of this repository.

## Validation Phases

Execute each phase sequentially and report results. Each phase builds on the previous one.

### Phase 1: Project Structure & Core Files
```bash
echo "=== Phase 1: Project Structure & Core Files ==="
ERRORS=0
WARNINGS=0

# Core documentation files
echo "Checking core documentation files..."
for file in CLAUDE.md README.md INITIAL.md INITIAL_EXAMPLE.md; do
  if [ -f "$file" ]; then
    echo "✓ $file exists"
    [ -s "$file" ] || { echo "  ⚠ $file is empty"; ((WARNINGS++)); }
  else
    echo "✗ $file MISSING"
    ((ERRORS++))
  fi
done

# License file (optional but recommended)
if [ -f "LICENSE" ]; then
  echo "✓ LICENSE exists"
else
  echo "⚠ LICENSE not found (recommended but not required)"
  ((WARNINGS++))
fi

# Setup scripts
echo ""
echo "Checking setup scripts..."
for script in setup.sh setup-vscode.sh setup-claude.sh setup-cursor.sh create-project.sh sync-commands.sh; do
  # Check if root shim OR bin source exists
  if [ -f "$script" ] || [ -f "bin/$script" ]; then
    target="${script}"
    [ -f "bin/$script" ] && target="bin/$script"
    if [ -x "$target" ]; then
      echo "✓ $target is executable"
    else
      echo "✗ $target not executable"
      ((ERRORS++))
    fi
    head -n1 "$script" | grep -q "^#!/" || { echo "  ⚠ $script missing shebang"; ((WARNINGS++)); }
  else
    echo "✗ $script MISSING"
    ((ERRORS++))
  fi
done

# Command parity check
echo ""
echo "Checking command parity across IDEs..."
for cmd in generate-prp execute-prp generate-prompt validate validate-project generate-validate new-project build-prp; do
  claude=".claude/commands/${cmd}.md"
  vscode=".github/prompts/${cmd}.prompt.md"
  cursor=".cursor/prompts/${cmd}.md"
  [ -f "$claude" ] && echo "  ✓ Claude: $cmd"
  [ -f "$vscode" ] && echo "  ✓ VS Code: $cmd"
  [ -f "$cursor" ] && echo "  ✓ Cursor: $cmd"
  if [ ! -f "$claude" ] && [ ! -f "$vscode" ] && [ ! -f "$cursor" ]; then
    echo "  ⚠ Command $cmd not found in any IDE"
    ((WARNINGS++))
  fi
done

echo ""
echo "Phase 1 Summary: $ERRORS errors, $WARNINGS warnings"
```

### Phase 2: Use-Case Structure & Documentation
```bash
echo ""
echo "=== Phase 2: Use-Case Structure & Documentation ==="
ERRORS=0
WARNINGS=0

EXPECTED_USE_CASES=(
  "pydantic-ai"
  "mcp-server"
  "agent-factory-with-subagents"
  "template-generator"
  "ai-coding-workflows-foundation"
)

for uc in "${EXPECTED_USE_CASES[@]}"; do
  if [ -d "use-cases/$uc" ]; then
    echo "✓ use-cases/$uc exists"
    [ -f "use-cases/$uc/CLAUDE.md" ] && echo "  ✓ CLAUDE.md" || { echo "  ✗ CLAUDE.md missing"; ((ERRORS++)); }
    [ -f "use-cases/$uc/README.md" ] && echo "  ✓ README.md" || { echo "  ⚠ README.md missing"; ((WARNINGS++)); }
    [ "$(find "use-cases/$uc" -type f | wc -l)" -gt 0 ] || { echo "  ⚠ use-cases/$uc appears empty"; ((WARNINGS++)); }
  else
    echo "✗ use-cases/$uc MISSING"
    ((ERRORS++))
  fi
done

echo ""
echo "Phase 2 Summary: $ERRORS errors, $WARNINGS warnings"
```

### Phase 3: TypeScript Validation (use-cases/mcp-server)
```bash
echo ""
echo "=== Phase 3: TypeScript Validation (MCP Server) ==="
ERRORS=0
WARNINGS=0

cd use-cases/mcp-server 2>/dev/null || { echo "✗ use-cases/mcp-server not found"; exit 1; }

if [ -f "package.json" ]; then
  echo "✓ package.json exists"
  command -v node &> /dev/null && node -e "JSON.parse(require('fs').readFileSync('package.json'))" 2>/dev/null && echo "  ✓ package.json valid JSON" || ((ERRORS++))
  for script in type-check test test:run; do
    grep -q "\"$script\"" package.json && echo "  ✓ Script '$script' defined" || { echo "  ⚠ Script '$script' not found"; ((WARNINGS++)); }
  done
  if [ -d "node_modules" ]; then
    echo ""
    echo "Running TypeScript type check..."
    npm run type-check 2>&1 && echo "✓ Type check passed" || { echo "✗ Type check failed"; ((ERRORS++)); }
    echo ""
    echo "Running tests..."
    npm run test:run 2>&1 && echo "✓ Tests passed" || { echo "⚠ Tests failed or no tests"; ((WARNINGS++)); }
    npx prettier --version &> /dev/null && ( npx prettier --check "src/**/*.ts" 2>/dev/null && echo "✓ Prettier OK" || { echo "⚠ Prettier issues"; ((WARNINGS++)); } ) || true
  else
    echo "⏭️ Skipping: run 'npm install' in use-cases/mcp-server first"
    ((WARNINGS++))
  fi
  [ -f "tsconfig.json" ] && echo "✓ tsconfig.json exists" || { echo "⚠ tsconfig.json not found"; ((WARNINGS++)); }
else
  echo "⚠ package.json not found"
  ((WARNINGS++))
fi

cd ../..
echo ""
echo "Phase 3 Summary: $ERRORS errors, $WARNINGS warnings"
```

### Phase 4: Python Validation (use-cases/pydantic-ai, use-cases/agent-factory-with-subagents)
```bash
echo ""
echo "=== Phase 4: Python Validation ==="
ERRORS=0
WARNINGS=0

echo "Checking Python syntax..."
PYTHON_FILES=$(find use-cases/pydantic-ai use-cases/agent-factory-with-subagents -name "*.py" -type f 2>/dev/null | head -20)
if [ -n "$PYTHON_FILES" ]; then
  while IFS= read -r f; do
    python3 -m py_compile "$f" 2>/dev/null && echo "  ✓ $(basename "$f")" || { echo "  ✗ $f syntax error"; ((ERRORS++)); }
  done <<< "$PYTHON_FILES"
else
  echo "  ⚠ No Python files in use-cases/pydantic-ai or use-cases/agent-factory-with-subagents"
  ((WARNINGS++))
fi

if command -v ruff &> /dev/null || python3 -m ruff --version &> /dev/null 2>&1; then
  RUFF_CMD="ruff"; command -v ruff &> /dev/null || RUFF_CMD="python3 -m ruff"
  echo ""
  $RUFF_CMD check use-cases/pydantic-ai use-cases/agent-factory-with-subagents 2>/dev/null | head -20 && echo "✓ Ruff check OK" || { echo "⚠ Ruff issues"; ((WARNINGS++)); }
  $RUFF_CMD format --check use-cases/pydantic-ai use-cases/agent-factory-with-subagents 2>/dev/null && echo "✓ Ruff format OK" || { echo "⚠ Ruff format issues"; ((WARNINGS++)); }
else
  echo "⏭️ Ruff not found (pip install ruff or uv add ruff)"
  ((WARNINGS++))
fi

if command -v mypy &> /dev/null || python3 -m mypy --version &> /dev/null 2>&1; then
  MYPY_CMD="mypy"; command -v mypy &> /dev/null || MYPY_CMD="python3 -m mypy"
  echo ""
  $MYPY_CMD use-cases/pydantic-ai use-cases/agent-factory-with-subagents --ignore-missing-imports 2>&1 | head -30 && echo "✓ Mypy OK" || { echo "⚠ Mypy issues"; ((WARNINGS++)); }
else
  echo "⏭️ Mypy not found"
  ((WARNINGS++))
fi

if command -v pytest &> /dev/null || python3 -m pytest --version &> /dev/null 2>&1; then
  PYTEST_CMD="pytest"; command -v pytest &> /dev/null || PYTEST_CMD="python3 -m pytest"
  echo ""
  TEST_DIRS=$(find use-cases/pydantic-ai use-cases/agent-factory-with-subagents -type d -name "tests" 2>/dev/null)
  if [ -n "$TEST_DIRS" ]; then
    $PYTEST_CMD $TEST_DIRS -v --tb=short 2>&1 | tail -15 && echo "✓ Pytest OK" || { echo "⚠ Pytest issues"; ((WARNINGS++)); }
  else
    echo "  ⚠ No tests/ dirs found"
    ((WARNINGS++))
  fi
else
  echo "⏭️ Pytest not found"
  ((WARNINGS++))
fi

echo ""
echo "Phase 4 Summary: $ERRORS errors, $WARNINGS warnings"
```

### Phase 5: Shell Script Validation
```bash
echo ""
echo "=== Phase 5: Shell Script Validation ==="
ERRORS=0
WARNINGS=0

SHELL_SCRIPTS=$(find . -maxdepth 1 -name "*.sh" -type f 2>/dev/null)
if [ -n "$SHELL_SCRIPTS" ]; then
  while IFS= read -r script; do
    echo "Checking $(basename "$script")..."
    head -n1 "$script" | grep -q "^#!/" && echo "  ✓ Shebang" || { echo "  ✗ Missing shebang"; ((ERRORS++)); }
    [ -x "$script" ] && echo "  ✓ Executable" || { echo "  ⚠ Not executable"; ((WARNINGS++)); }
    command -v shellcheck &> /dev/null && shellcheck "$script" 2>&1 | head -5 && echo "  ✓ Shellcheck OK" || ((WARNINGS++)) || true
  done <<< "$SHELL_SCRIPTS"
else
  echo "⚠ No .sh scripts in root"
  ((WARNINGS++))
fi

echo ""
echo "Phase 5 Summary: $ERRORS errors, $WARNINGS warnings"
```

### Phase 6: JSON & YAML Validation
```bash
echo ""
echo "=== Phase 6: JSON & YAML Validation ==="
ERRORS=0
WARNINGS=0

JSON_FILES=$(find . -name "*.json" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -20)
if [ -n "$JSON_FILES" ]; then
  while IFS= read -r json_file; do
    if [[ "$json_file" == *"tsconfig"* ]] || [[ "$json_file" == *"settings.json"* ]]; then
      [ -r "$json_file" ] && [ -s "$json_file" ] && echo "  ✓ $(basename "$json_file") (JSONC)" || ((WARNINGS++))
    else
      node -e "JSON.parse(require('fs').readFileSync('$json_file'))" 2>/dev/null && echo "  ✓ $(basename "$json_file")" || python3 -m json.tool "$json_file" >/dev/null 2>&1 && echo "  ✓ $(basename "$json_file")" || { echo "  ✗ $json_file invalid"; ((ERRORS++)); }
    fi
  done <<< "$JSON_FILES"
fi

if command -v yamllint &> /dev/null; then
  YAML_FILES=$(find . -name "*.yml" -o -name "*.yaml" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -10)
  [ -n "$YAML_FILES" ] && while IFS= read -r yaml_file; do yamllint "$yaml_file" 2>&1 | head -2 && echo "  ✓ $(basename "$yaml_file")" || ((WARNINGS++)); done <<< "$YAML_FILES"
fi

echo ""
echo "Phase 6 Summary: $ERRORS errors, $WARNINGS warnings"
```

### Phase 7: Markdown Validation
```bash
echo ""
echo "=== Phase 7: Markdown Validation ==="
ERRORS=0
WARNINGS=0

MD_FILES=$(find . -name "*.md" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -20)
[ -n "$MD_FILES" ] && echo "  Found $(echo "$MD_FILES" | wc -l) markdown files"
command -v markdownlint &> /dev/null && markdownlint README.md 2>&1 | head -10 || true
command -v mdl &> /dev/null && mdl README.md 2>&1 | head -10 || true

echo ""
echo "Phase 7 Summary: $ERRORS errors, $WARNINGS warnings"
```

### Phase 8: Documentation & Cross-References
```bash
echo ""
echo "=== Phase 8: Documentation & Cross-References ==="
ERRORS=0
WARNINGS=0

echo "Checking README for command references..."
for cmd in generate-prp execute-prp generate-prompt validate validate-project generate-validate new-project build-prp; do
  grep -qi "$cmd" README.md 2>/dev/null && echo "  ✓ README mentions $cmd" || { echo "  ⚠ README missing $cmd"; ((WARNINGS++)); }
done

echo ""
for f in .github/prompts/*.prompt.md 2>/dev/null; do
  [ -f "$f" ] && ( grep -q "^---" "$f" && grep -q "^mode:" "$f" && echo "  ✓ $(basename "$f") frontmatter" || { echo "  ⚠ $(basename "$f") frontmatter"; ((WARNINGS++)); } )
done

[ -f "PRPs/templates/prp_base.md" ] && echo "  ✓ PRP base template" || { echo "  ✗ PRP template missing"; ((ERRORS++)); }
[ -d "PRPs/prompts" ] && echo "  ✓ PRPs/prompts/" || { echo "  ⚠ PRPs/prompts/ missing"; ((WARNINGS++)); }
command -v markdown-link-check &> /dev/null && markdown-link-check README.md 2>&1 | head -10 || true

echo ""
echo "Phase 8 Summary: $ERRORS errors, $WARNINGS warnings"
```

## Final Summary

After running all phases, provide a summary table and notes:

```bash
echo ""
echo "=========================================="
echo "VALIDATION COMPLETE"
echo "=========================================="
echo ""
echo "Quick Fixes:"
echo "  - npm install (in use-cases/mcp-server)"
echo "  - ruff format .  && ruff check --fix ."
echo "  - npx prettier --write . (in use-cases/mcp-server)"
echo "  - pytest use-cases/pydantic-ai use-cases/agent-factory-with-subagents"
echo ""
```

## Journal Entry (required)

After the Final Summary, append a daily journal entry so the project can be tracked through completion.

1. **Ensure `journal/` exists:** Run `mkdir -p journal` (or create the folder directly).

2. **Append one line to `journal/YYYY-MM-DD.md`** (today's date, ISO). Format:
   ```
   HH:MM | Pass/Fail | E:N W:M | P1:OK P2:OK P3:... | optional note
   ```
   - HH:MM = time of run; Pass/Fail = overall; E:N W:M = errors and warnings; P1:OK ... = per-phase outcome; optional note from user context.

3. **Update `journal/README.md`:** Add or update one line per date, e.g. `YYYY-MM-DD: N runs, last Pass (E:0 W:1)`. Create the file with `# Validation journal index` if missing.

**Example:** `14:30 | Pass | E:0 W:2 | P1:OK P2:OK P4:2W P8:OK |`

## Validation Checklist

| Phase | Description | Critical |
|-------|-------------|----------|
| 1 | Project Structure | Yes |
| 2 | Use-Case Structure | Yes |
| 3 | TypeScript (mcp-server) | Optional* |
| 4 | Python (pydantic-ai, agent-factory) | Optional* |
| 5 | Shell Scripts | Optional |
| 6 | JSON/YAML | Optional |
| 7 | Markdown | Optional |
| 8 | Documentation | Yes |

\* Optional if dependencies not installed; recommended when available.

## Notes

- Dependencies: npm (mcp-server), python3, ruff, mypy, pytest, shellcheck optional.
- Run setup scripts (SETUP-CURSOR.sh, SETUP-CLAUDE.sh, etc.) to prepare the environment.
- Errors block; warnings are recommendations.
