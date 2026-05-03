# Chat slash commands

These skills are **slash commands** in Claude Code chat. Type **`/`** in the chat input to see and run them.

**Execution order** (all 7 commands):

| Order | Type in chat | What it does | When to run |
|-------|---------------|--------------|-------------|
| 1 | `/new-project [path]` | Create a new project from the template; **copies all slash commands** into the new project so you can open it and continue the workflow | When starting a new project |
| 2 | `/generate-prp [INITIAL.md]` | Generate a PRP from requirements | For each feature or when requirements change |
| 3 | `/generate-validate` | Create **`/validate-project`** for this project | **Once, or after a significant project change** (run after planning, before building) |
| 4 | `/build-prp [PRPs/feature.md]` | Finalize PRP, then optionally build and run | After you have a PRP; when you want to finalize the plan before implementing |
| 5 | `/execute-prp [PRPs/feature.md]` | Implement a feature from a PRP | After `/build-prp` (or after `/generate-prp` if you skip review); main implementation path |
| 6 | **`/validate-project`** | Run project-specific validation (from `/generate-validate`) | After building; use this, not `/validate`, to avoid injected commands |
| 6b | `/validate [--thorough]` | Run template validation (this repo only) | When validating the context-engineering template |
| 7 | `/generate-prompt [task]` | Generate an XML-structured prompt | Anytime (quick tasks) |

Each skill delegates to the full instructions in `.claude/commands/<name>.md`.  
**Requirement:** Open this repo (or a project that has these files) as the project root in Claude Code so `.claude/skills/` is discovered.

**New vs existing projects:** Projects **created with `/new-project`** already have the commands—just open that project in Claude Code. For an **existing** project not created from this template, run from the template repo: `./install-claude-commands.sh` and enter the project path when prompted. Then open that project in Claude Code and restart.
