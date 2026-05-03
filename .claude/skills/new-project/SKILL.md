---
name: new-project
description: Create a new project from the context-engineering template. Use when the user wants to scaffold a new project with AI config, PRPs, and setup.
argument-hint: "[path]"
disable-model-invocation: true
user-invocable: true
---

Read and follow the instructions in [.claude/commands/new-project.md](.claude/commands/new-project.md). If the user did not provide a path, ask for location and project name first, then use that path (e.g. `/new-project ~/projects/my-app`). Never create the project inside the context-engineering template folder.
