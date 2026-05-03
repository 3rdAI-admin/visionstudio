---
description: Generate Professional Product Requirements Document (PRD)
---

# Generate Professional Product Requirements Document (PRD)

**Input:** User requirements (e.g. `INITIAL.md`) or a brief description.  
**Output:** A professional **Product Requirements Document (PRD)** in `PRDs/` that stakeholders can review and that feeds the execution plan (PRP).

## Purpose

Turn a vibe coder's idea or INITIAL.md into a **professional PRD**: clear goals, scope, success criteria, and requirements so the next step (multi-agent execution plan) has a single source of truth.

## Process

1. **Read the input**
   - If the user points to a file (e.g. `INITIAL.md`), read it fully.
   - If the user describes the product in chat, use that as the source.

2. **Research**
   - Codebase: similar features, conventions, tech stack.
   - External: comparable products, APIs, best practices (include URLs).

3. **Draft the PRD**
   - Use [PRPs/templates/prd_base.md](../../PRPs/templates/prd_base.md) as the structure.
   - Fill every section: Overview, Background & Problem, Requirements (functional + non-functional), Success Criteria, Scope & Constraints, References.
   - Write in clear, stakeholder-friendly language (semi-technical is fine; avoid jargon without explanation).
   - Add concrete success criteria (testable / measurable where possible).

4. **Save**
   - Save as `PRDs/{product-or-feature-name}.md` (e.g. `PRDs/daily-quote-app.md`).
   - If `PRDs/` does not exist, create it.

## Output Checklist

- [ ] Purpose and goals stated
- [ ] Problem statement and users/stakeholders
- [ ] Functional and non-functional requirements (with priorities)
- [ ] Success criteria (measurable)
- [ ] In-scope / out-of-scope and constraints
- [ ] References (docs, examples) for implementation

## Next Step

After the PRD is approved or finalized, the user runs **`/generate-prp`** (pointing at the PRD or PRDs file) to create an **execution plan with multi-agent task breakdown** for accuracy. Then **`/generate-validate`** → **`/execute-prp`** → **`/validate-project`** → **`/summarize`**.
