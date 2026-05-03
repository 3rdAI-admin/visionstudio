---
name: generate-prompt
description: Generate an XML-structured prompt with ambiguity detection. Use for standalone tasks that need a well-engineered prompt, not a full PRP.
argument-hint: "[task description]"
disable-model-invocation: true
user-invocable: true
---

Read and follow the instructions in [.claude/commands/generate-prompt.md](.claude/commands/generate-prompt.md). Use $ARGUMENTS as the task description if provided (e.g. `/generate-prompt Create a caching layer for API responses`).
