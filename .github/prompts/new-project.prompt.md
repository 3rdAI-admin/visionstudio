---
agent: agent
description: New Project
---

# New Project

## Project path: $ARGUMENTS

Create a new project from the context-engineering template at the specified path.

## Before Execution (Required)

**If the user did not provide a path** (e.g. they said "new project" or "start the tutorial"), **do not create the project yet.** Ask:

1. **Where** should the new project be created? (e.g. `~/projects`, `~/code`, `~/Desktop`)
2. **What** should the project be named? (e.g. `daily-quote-app`, `my-app`)

Then form the full path as `[location]/[name]` (e.g. `~/projects/daily-quote-app`) and run the command with that path.

**Never create the new project inside the context-engineering template folder.** The path must be outside the current repo (e.g. not `./tutorial-walkthrough-app` or any subfolder of the template). If the user suggests a name only (e.g. "daily-quote-app"), suggest a parent directory outside the template and confirm before creating.

## What This Command Does

1. **Creates project folder** at the specified path
2. **Copies AI configuration** (`.claude/`, `.github/`, `.vscode/`, `.cursor/`, `CLAUDE.md`, `.cursorrules`)
3. **Sets up folder structure** (`PRPs/`, `PRPs/prompts/`, `PRPs/templates/`, `examples/`, `journal/`) and a starter **journal** index for progress tracking (resume after restart or unexpected IDE shutdown)
4. **Copies PRP templates** for use in the new project
5. **Creates blank INITIAL.md** ready to fill in
6. **Creates .gitignore** with common patterns
7. **Initializes git repository** with initial commit

## Usage

```
/new-project ~/projects/my-app-name
```

## Execution

Run the create-project.sh script with the provided path:

```bash
./create-project.sh $ARGUMENTS
```

If the script doesn't exist or you're running this from a new project that was already created, manually execute these steps:

### Step 1: Validate Path
- Check that the target path does NOT already exist
- If it exists, ask user to choose a different path or confirm overwrite

### Step 2: Create Directory Structure
```bash
mkdir -p "$PROJECT_PATH"
mkdir -p "$PROJECT_PATH/PRPs/prompts"
mkdir -p "$PROJECT_PATH/PRPs/templates"
mkdir -p "$PROJECT_PATH/examples"
mkdir -p "$PROJECT_PATH/journal"
echo "# Validation journal index" > "$PROJECT_PATH/journal/README.md"
```
(The journal is used by `/validate-project`, `/execute-prp`, and `/build-prp` to record progress so you can resume after a restart or unexpected IDE shutdown.)

### Step 3: Copy Template Files
Copy from the context-engineering template (adjust source path as needed):
- `CLAUDE.md` → project root
- `.cursorrules` → project root
- `.claude/` → project root (entire directory)
- `.github/` → project root (entire directory)
- `.vscode/` → project root (entire directory)
- `.cursor/` → project root (entire directory)
- `PRPs/templates/*` → `PRPs/templates/`

### Step 4: Create INITIAL.md
Create a blank template:
```markdown
## FEATURE:
[Describe what you want to build - be specific about functionality and requirements]

## EXAMPLES:
[List any example files in the examples/ folder and explain how they should be used]

## DOCUMENTATION:
[Include links to relevant documentation, APIs, or resources]

## OTHER CONSIDERATIONS:
[Mention any gotchas, specific requirements, or things AI assistants commonly miss]
```

### Step 5: Create .gitignore
```
# Environment
.env
.env.local
*.local

# Python
__pycache__/
*.py[cod]
.venv/
venv/
*.egg-info/

# Node
node_modules/
dist/

# IDE
.idea/
*.swp
*.swo
.DS_Store
```

### Step 6: Initialize Git
```bash
cd "$PROJECT_PATH"
git init
git add .
git commit -m "Initial project from context-engineering template"
```

## After Creation

Display next steps to the user:

```
✅ Project created successfully at: [PROJECT_PATH]

Next steps:
1. cd [PROJECT_PATH]
2. Open in your IDE: code . (or cursor . or claude)
3. Edit INITIAL.md with your feature requirements
4. Run: /generate-prd (for a PRD) then /generate-prp INITIAL.md (for the execution plan)
```

## Important Notes

- The new project is **completely independent** from the context-engineering template
- Each project gets its **own git history**
- The template files are **copied, not linked** - you can customize them per-project
- Always create projects **outside** the context-engineering folder
