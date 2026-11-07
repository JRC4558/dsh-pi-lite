---
name: pi-lite
description: Minimal Pi-style workflow using standard DSH tools only — read, write, edit, bash, skill, bounded image inspection, and bounded web search.
whenToUse: Load when a session runs the Pi Lite preset and you need the tool allocation, budget rules, and search/image limits.
---

# Pi Lite

Pi Lite keeps the Pi-style allocation but assumes nothing beyond the standard toolset. Do not expect rg, fd, fzf, tre, jj, zellij, LSP, containers, or home-manager.

## Tools

| Intent | Tool |
|---|---|
| Read a file | `read` |
| Create or replace a file | `write` |
| Replace literal text | `edit` |
| Short command | `bash` |
| Load a skill | `skill` |
| Inspect an image | `read_image` (10 free calls per session) |
| Search the web | `web_search` (5 free calls per session) |
| Fetch a known URL | `web_fetch` |

## Working rules

- Search with `grep`, `find`, `sed`, `awk`, and `curl`; write commands that work on a stock POSIX userland.
- Prefer a small `bash` command over a long compound one. Use `bash -n` or a quick smoke run after generating a shell script.
- Quote the exact path and command in your report; separate what you observed from what you inferred.
- If a tool is missing, use the standard alternative and say so; do not assume this host has a modern CLI.
- Keep the change minimal and verify it with the project's own checker or a focused run.

## Budgets

- 40 tool calls per turn, identical calls repeated at most 3 times.
- 30 minute turn deadline, 4 hour session deadline, 2M session tokens (input + output).
- 5 `web_search` and 10 `read_image` calls per session.

When a budget is exhausted the harness stops the turn. Report the verified state and the single next step; do not try to continue through the limit.
