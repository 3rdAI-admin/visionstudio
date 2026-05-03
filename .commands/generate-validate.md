# Generate Validate-Project Command

**Use [.claude/commands/example-validate.md](.claude/commands/example-validate.md) as the template.** That file shows the structure (phases, backtick-fenced runnable commands, summary). Also use [docs/validation/ultimate_validate_command.md](docs/validation/ultimate_validate_command.md) for philosophy (user workflows, E2E levels).

**Why /validate-project (not /validate):** We generate a **/validate-project** command so project-specific validation is not overridden by team or global /validate commands. Users run **/validate-project** to run this project's validation.

**When to run:** **Once, or after a significant project change.** Run **after planning** (after /generate-prp), **before building**, so /validate-project exists for this project.

## Step 0: Discover Real User Workflows

**Before analyzing tooling, understand what users ACTUALLY do:**

1. Read workflow documentation:
   - README.md - Look for "Usage", "Quickstart", "Examples" sections
   - CLAUDE.md/AGENTS.md or similar - Look for workflow patterns
   - docs/ folder - User guides, tutorials

2. Identify external integrations:
   - What CLIs does the app use? (Check Dockerfile for installed tools)
   - What external APIs does it call? (Telegram, Slack, GitHub, etc.)
   - What services does it interact with?

3. Extract complete user journeys from docs:
   - Find examples like "Fix Issue (GitHub):" or "User does X → then Y → then Z"
   - Each workflow becomes an E2E test scenario

**Critical: Your E2E tests should mirror actual workflows from docs, not just test internal APIs.**

## Step 1: Deep Codebase Analysis

Explore the codebase to understand:

**What validation tools already exist:**
- Linting config: .eslintrc*, .pylintrc, ruff.toml, etc.
- Type checking: tsconfig.json, mypy.ini, etc.
- Style/formatting: .prettierrc*, black, .editorconfig
- Unit tests: jest.config.*, pytest.ini, test directories
- Package manager scripts: package.json scripts, Makefile, pyproject.toml tools

**What the application does:**
- Frontend: Routes, pages, components, user flows
- Backend: API endpoints, authentication, database operations
- Database: Schema, migrations, models
- Infrastructure: Docker services, dependencies

**How things are currently tested:**
- Existing test files and patterns
- CI/CD workflows (.github/workflows/, etc.)
- Test commands in package.json or scripts

## Step 2: Generate validate-project from the example template

**Follow the structure of [.claude/commands/example-validate.md](.claude/commands/example-validate.md):**
- Title and short description for *this* codebase
- Phase 1: Linting (actual linter commands found in the project)
- Phase 2: Type Checking (actual type checker commands)
- Phase 3: Style Checking (actual formatter check commands)
- Phase 4: Unit Testing (actual test commands)
- Phase 5: End-to-End Testing (user workflows from docs; use Docker/curl/Playwright as in the example where applicable)
- Summary and, if the template includes it, journal entry instructions

**Only include phases that exist in the codebase.** Adapt paths and commands to this project (e.g. no frontend/ or backend/ folders if the project has a different layout).

**Python projects using uv:** For ruff, mypy, black, pytest, etc., always use "uv run TOOL" pattern (e.g. "uv run ruff check app/ tests/", "uv run mypy app/", "uv run ruff format --check app/ tests/", "uv run pytest tests/ -v") so validation runs without requiring the venv to be activated or tools on PATH. If the project has pyproject.toml and optional dev deps, users should run "uv sync --all-extras" once so lint/type/formatter tools are installed.

**E2E (from validation/ultimate_validate_command.md):**
1. Internal APIs - endpoints, DB, commands
2. External integrations - CLIs, platform APIs
3. Complete user journeys from docs

## Output: Create /validate-project in all IDEs

Write the generated validation so **/validate-project** is available in every IDE:

1. **.claude/commands/validate-project.md** – Claude Code (primary output)
2. **.cursor/prompts/validate-project.md** – Cursor (copy same content)
3. **.cursor/commands/validate-project.md** – Cursor commands folder (copy same content)
4. **.github/prompts/validate-project.prompt.md** – VS Code Copilot (same content; add YAML frontmatter with description: and mode: if needed for that IDE)

Use the same phase structure and format as [.claude/commands/example-validate.md](.claude/commands/example-validate.md). **Runnable commands:** Use backtick-fenced code blocks only (e.g. for "uv run ruff check app/ tests/") — do NOT prefix with exclamation marks (bash treats ! as history expansion). **curl with JSON:** For any curl -d with JSON, use escaped double quotes safe for automation: -d "{\\"key\\":\\"value\\"}" — never use single quotes around JSON (can break when passed to bash).

**Journal entry step (required):** The generated command MUST include a final section that instructs the AI to append a daily journal entry after validation completes:
1. Ensure journal/ exists (mkdir -p journal).
2. Append one line to journal/YYYY-MM-DD.md: "HH:MM | Pass/Fail | E:N W:M | P1:OK P2:... | optional note".
3. Update journal/README.md with one line per date for that day's latest outcome.

The result should be executable, practical, and give complete confidence in the codebase. Users run **/validate-project** (not /validate) to avoid conflicts with injected commands.
