# Summarize: Completed Steps and Next Actions

**When to run:** After **`/validate-project`** (or after a build/execute cycle).  
**Purpose:** Give the user a clear summary of **what was completed** and **what to do next** so they can respond or decide.

## Process

1. **Gather context**
   - Recent journal entries (`journal/YYYY-MM-DD.md`, `journal/README.md`)
   - Last PRP executed (if any)
   - Last validation result (pass/fail, phases)
   - Any open TODOs or in-progress work in the conversation

2. **Write the summary**
   - **Completed steps:** What was done in this cycle (e.g. "Created PRD", "Generated execution plan", "Implemented feature X", "Validation: P1–P5 passed").
   - **Next actions:** Concrete options for the user (e.g. "Run `/validate-project --thorough` to run full tests", "Review PRDs/my-app.md and run `/generate-prp PRDs/my-app.md` to build the plan", "Run `/execute-prp PRPs/my-feature.md` to implement", "No blocking issues; you can ship or iterate").
   - **Blockers or warnings:** Anything that failed or needs user input (e.g. "Phase 4 skipped: install mypy/pytest in venv for full validation").

3. **Format for user response**
   - Use clear headings: **Completed** and **Next actions**.
   - Keep next actions short and actionable (one line per option).
   - End with a direct question or choice if appropriate (e.g. "What would you like to do next?").

## Example Output

```markdown
## Completed
- Created PRD: PRDs/daily-quote-app.md
- Generated execution plan: PRPs/daily-quote-app.md (multi-agent task breakdown)
- Ran /validate-project: Pass (P1, P3, P5 OK; P2, P4 skipped)

## Next actions
1. **Review the PRD** – Open PRDs/daily-quote-app.md and adjust scope if needed.
2. **Execute the plan** – Run `/execute-prp PRPs/daily-quote-app.md` to implement.
3. **Full validation** – Run `./install-dev-tools.sh` then `/validate-project --thorough` for mypy/pytest.

What would you like to do next?
```

## When to Run

- After **`/validate-project`** (recommended).
- After **`/execute-prp`** (to summarize what was built and what to validate next).
- After **`/generate-prp`** (to summarize the plan and suggest execute or build-prp).
- Anytime the user asks for a status or "what's next."
