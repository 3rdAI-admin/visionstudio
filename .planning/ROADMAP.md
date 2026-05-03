# Roadmap: visionedit

## Overview

Build this project using GSD phases (research → plan → execute) and ICM stages (Research, Draft, Review). Start with /gsd:new-project or work through stages/01-research first.

## Phases

- [ ] **Phase 1: Discovery** — Research scope, requirements, constraints
- [ ] **Phase 2: Plan** — Roadmap and phase plans (use /gsd:plan-phase)
- [ ] **Phase 3: Execute** — Implement (use /gsd:execute-phase)
- [ ] **Phase 4: Review** — Quality and ship

## Phase Details

### Phase 1: Discovery
**Goal**: Understand what to build and for whom.
**Depends on**: Nothing
**Success Criteria**:
  1. PROJECT.md has clear What This Is and Core Value
  2. Key requirements and out-of-scope items listed
  3. Context and constraints documented

### Phase 2: Plan
**Goal**: Break work into phases and plans.
**Depends on**: Phase 1
**Success Criteria**:
  1. ROADMAP.md has phases and success criteria
  2. First phase has at least one plan

### Phase 3: Execute
**Goal**: Implement plans and produce deliverables.
**Depends on**: Phase 2
**Success Criteria**:
  1. Plans executed via /gsd:execute-phase or equivalent
  2. Outputs in stages/*/output/ or as specified in plans

### Phase 4: Review
**Goal**: Quality check and ship.
**Depends on**: Phase 3
**Success Criteria**:
  1. Deliverables reviewed
  2. Ready for handoff or next iteration
