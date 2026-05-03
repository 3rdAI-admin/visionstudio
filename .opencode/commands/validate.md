---
description: Project-specific validation for visionedit (lint, typing)
---

# Validate visionedit

> Run from project root. This validates TypeScript type checks and lints via tsc

## Phase 2: Type Checking
`npm run lint`

Expected: 0 errors, 0 warnings

## Summary

Validation passes when all phases succeed.

```bash
# Canonical local validation command (all phases in one line)
npm run lint
```

## Journal Entry (required after running)

1. **Ensure `journal/` exists:** `mkdir -p journal`
2. **Append one line to `journal/YYYY-MM-DD.md`** (today's date):
   `HH:MM | Pass/Fail | E:N W:M | P1:OK P2:OK P3:OK P4:OK P5:OK | optional note`