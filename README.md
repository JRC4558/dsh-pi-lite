# dsh-pi-lite

A minimal, portable Pi-like mode for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Standard tools only: `read`, `write`, `edit`, `bash`, `skill`, `read_image`, `web_search`, `web_fetch`. It keeps the Pi allocation and hard budgets, and deliberately removes everything that ties a mode to one workstation.

## What it is

- A DSH **bundle** (one preset) plus a small TypeScript policy plugin.
- Timeout watchdog, tool allow-list, per-turn call budget, repeat guard, session token budget, and per-session image/search quotas.
- A bundled `pi-lite` skill, installed into `$DSH_HOME/skills/pi-lite` so the catalog loads it without a manual copy.
- Reasoning remains the model's own: this mode does not set or clamp reasoning effort.

## Install

```sh
npm install dsh-pi-lite
# or install into a specific DSH profile:
dsh plugin --profile <profile> add dsh-pi-lite
```

Then select the `pi-lite` preset for a session. The install script copies the bundled skill to `${DSH_HOME:-~/.dsh}/skills/pi-lite`; use `--ignore-scripts` only if you plan to copy `skills/pi-lite` yourself.

Requirements: a DeepSeek Harness build that provides agent presets and the standard tool packages (`dsh-persona`, `dsh-tool-bash`, `dsh-tool-fs`, `dsh-tool-skill`, `dsh-skill-filesystem`, `dsh-tool-web`) plus `read_image`. The mode itself only needs a POSIX `bash`; on Windows use the shell provider your DSH installation already exposes.

## Budgets

| Limit | Default |
|---|---|
| Tool calls per turn | 40 |
| Identical calls | 3 |
| Turn deadline | 30 min |
| Session deadline | 4 h |
| Session tokens (input + output) | 2,000,000 |
| `web_search` per session | 5 |
| `read_image` per session | 10 |

All values are configurable in `cordis.patch.yml`. When a limit trips, the harness cancels the turn; the model is expected to report the verified state and the next step instead of retrying.

## Package layout

```
src/index.ts        policy hooks (watchdog, allow-list, budgets, quotas)
src/policy.ts       pure helpers, unit-tested
cordis.patch.yml    the pi-lite preset
skills/pi-lite/     bundled skill
scripts/install-skill.mjs
tests/              policy tests
```

Build and verify:

```sh
npm install --ignore-scripts
npm run build
npm test
npm pack --dry-run
```

## Vibe coding statement

This is a vibe-coded project. It was produced with DeepSeek V4.1 Flash inside DeepSeek Harness, with the maintainer directing the scope and reviewing the result. Pull requests are not accepted and will be closed without review; there is no support commitment. Treat it as a small, readable starting point you can fork.

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE) for third-party components.
