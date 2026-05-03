---
description: Build from PRP
---

# Build from PRP

Finalize the PRP, then optionally build (implement) and run the project. Use after a PRP has been created (e.g. via `/generate-prp`).

**When to run:** After you have a PRP (e.g. from `/generate-prp`); when you want to **finalize the plan before implementing**. Run before `/execute-prp` (optional step—you can skip to `/execute-prp` if you don't need to review first).

## PRP file: $ARGUMENTS

If no file is provided, list files in `PRPs/` (excluding `templates/` and `prompts/`) and ask the user which PRP to use, or use the only one if a single PRP exists.

---

## Phase 1: Resolve PRP file

- Resolve relative path (e.g. `daily-quote-app` or `PRPs/daily-quote-app.md`) to full path under the project
- Confirm the file exists; if not, list available PRPs and ask

---

## Phase 2: Finalize the PRP

1. **Load and review**
   - Read the PRP completely
   - Summarize: goal, success criteria, and high-level implementation outline
   - Note any gaps, ambiguities, or suggested improvements (e.g. missing validation gates, unclear steps)

2. **Confirm with user**
   - Ask: "Review the summary above. Should we **edit the PRP** (tell me what to change), or is it **finalized** and ready to build?"
   - If the user requests edits: apply changes to the PRP file, then repeat the summary and ask again until they confirm finalized
   - If the user confirms **finalized** (or "ready to build", "looks good", etc.): proceed to Phase 3

3. **Do not start implementation until the user has explicitly confirmed the PRP is finalized.**

---

## Phase 3: Option to build (implement)

1. **Ask**
   - "PRP is finalized. **Proceed to build now?** (I will implement the PRP and run validation.)"
   - If **no**: Stop. Tell them they can run `/build-prp` again or `/execute-prp PRPs/<name>.md` when ready to build.
   - If **yes**: Continue to step 2.

2. **Build (same as Execute PRP)**
   - Create an implementation plan (use TodoWrite to track tasks)
   - Implement the PRP step by step; follow all instructions and validation gates
   - Run each validation command from the PRP (ruff, mypy, pytest, npm run type-check, etc.)
   - Fix any failures and re-run until all pass
   - Ensure all PRP checklist items are done; run final validation
   - Report completion and what was built

---

## Phase 4: Option to execute (run the project)

1. **After build completes**
   - If the PRP describes a runnable app (e.g. Flask, MCP server, CLI): ask "**Run the project now?**" (e.g. `python app.py`, `npm run dev`)
   - If **yes**: Start the app (in background if appropriate) and give the user the URL or command to use
   - If **no**: Tell them how to run it themselves (e.g. `python app.py`, `npm run dev`)

2. **If the PRP does not describe a runnable app**, skip this phase and just summarize next steps.

---

## Journal entry

After Phase 2 (finalized) or after Phase 3/4 (build/run) completes:
- Ensure `journal/` exists (`mkdir -p journal` from project root)
- Append one line to `journal/YYYY-MM-DD.md` (today's date): `HH:MM | build-prp | PRPs/<path> | Finalized` or `HH:MM | build-prp | PRPs/<path> | Built` (or `Built and run` if Phase 4 was used). Use the actual PRP path. This builds a timeline of milestones for tracking and support.

---

## Notes

- Finalize first, then build, then run. Do not implement until the user has confirmed the PRP is finalized.
- If validation fails during build, use error messages and PRP guidance to fix and retry.
