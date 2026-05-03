---
description: Revise PRP: Feedback Loop from Validation to Planning
---

# Revise PRP: Feedback Loop from Validation to Planning

**When to run:** After **`/validate-project`** fails or partially passes, OR after **`/execute-prp`** reveals that the original plan was incomplete, wrong, or needs changes.

**Purpose:** Close the loop between execution/validation and planning. Instead of patching code endlessly, revise the **plan itself** so the next execution cycle starts from a corrected foundation.

## PRP File: $ARGUMENTS

## Process

1. **Gather failure context**
   - Read the PRP file specified (or find the most recent PRP in `PRPs/`)
   - Read recent journal entries (`journal/YYYY-MM-DD.md`) for validation results
   - Identify what failed: which validation phases, which tests, which requirements
   - Distinguish between **plan failures** (wrong approach, missing requirements, bad architecture) and **implementation failures** (bugs, typos, config issues)

2. **Diagnose root causes**
   - For each failure, determine: was the requirement correct but poorly implemented, or was the requirement itself wrong/missing?
   - Check if external dependencies, APIs, or libraries behaved differently than expected
   - Look for patterns: are multiple failures caused by the same root issue?
   - **Ask the user** if any failure is ambiguous or needs their input before proceeding

3. **Revise the PRP**
   - Open the PRP file for editing
   - **Add a `## Revision History` section** at the bottom (or append to existing one):
     ```
     ### Revision N (YYYY-MM-DD)
     **Trigger:** [validation failure / execution issue / user feedback]
     **Root cause:** [what was wrong in the original plan]
     **Changes:** [what was added, removed, or modified]
     ```
   - Update affected sections:
     - Fix incorrect requirements or acceptance criteria
     - Add missing steps that were discovered during implementation
     - Update technology choices or architecture if the original approach was flawed
     - Add new validation commands or test cases for the issues found
     - Add a **Gotchas** or **Known Issues** subsection if the problem was a subtle pitfall
   - **Do NOT delete the original plan content** — mark superseded sections with `~~strikethrough~~` or move them to a `### Superseded` block so the revision history is clear

4. **Validate the revision**
   - Re-read the full revised PRP end-to-end
   - Confirm all original requirements are still addressed
   - Confirm new/changed requirements are complete and testable
   - Ensure no contradictions between original and revised sections

5. **Suggest next steps**
   - Tell the user what changed and why
   - Recommend: re-run `/execute-prp PRPs/<revised-file>.md` to implement from the updated plan
   - Or recommend: `/build-prp PRPs/<revised-file>.md` if the user wants to review before re-executing

6. **Journal entry**
   - Append to `journal/YYYY-MM-DD.md`: `HH:MM | revise-prp | PRPs/<path> | Revised: <brief summary of what changed>`

## When to Use This vs. Just Fixing Code

| Situation | Use `/revise-prp` | Just fix the code |
|-----------|-------------------|-------------------|
| Wrong architecture or approach | Yes | No |
| Missing requirement discovered | Yes | No |
| API behaves differently than documented | Yes | No |
| Simple bug or typo | No | Yes |
| Config issue (env vars, paths) | No | Yes |
| Multiple related failures from same root cause | Yes | No |
| User changed their mind about a feature | Yes | No |

**Rule of thumb:** If you'd fix the same kind of issue again on the next feature because the plan template is wrong, revise the PRP. If it's a one-off mistake, just fix the code.
