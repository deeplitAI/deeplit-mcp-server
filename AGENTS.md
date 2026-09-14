# AGENTS.md

This file provides guidance to AI coding agents working in this repository. It is
the only instruction file; `CLAUDE.md` beside it is a pointer at this one.

## Repository map

A plugin marketplace with one plugin. It ships no server, no build step, no
package.json and no test suite. Everything users install is under `plugins/deeplit/`.

- `.claude-plugin/marketplace.json`: Claude Code marketplace manifest (marketplace `deeplit`, plugin source `./plugins/deeplit`).
- `.agents/plugins/marketplace.json`: Codex marketplace manifest for the same plugin.
- `plugins/deeplit/plugin.json`: generic metadata (name, version, description, author, homepage, repository, license). Inert for both clients; see the first trap below.
- `plugins/deeplit/.claude-plugin/plugin.json`: Claude Code manifest. `userConfig` (`mcp_url`, `api_key`) and the HTTP MCP server with `X-API-Key: ${user_config.api_key}`.
- `plugins/deeplit/.codex-plugin/plugin.json`: Codex manifest. `interface`, `skills`, and the MCP server declared inline with `env_http_headers` (`X-API-Key` from `DEEPLIT_API_KEY`).
- `plugins/deeplit/skills/*/SKILL.md`: five skills. They are shipped product content that runs inside users' agents, not instructions for this repo.
- `plugins/deeplit/scripts/deeplit-auth.mjs` and `.ps1`: optional credential helper (OS keychain), used only through a manual Codex `config.toml` entry.
- `LICENSE` (Apache-2.0) and `NOTICE`.

The MCP server is operated by deeplit and is not part of this repository. The live
server is the source of truth for tool names, parameters and scopes: its `tools/list`
response (see the probe under Commands) lists every tool with its schema. Public
endpoint: `https://mcp.deeplit.ai`, Streamable HTTP at `/`.

## Reference docs

| Doc | Read when |
|---|---|
| [README.md](README.md) | The user-facing front door. Its tool reference and scope table describe the live server; verify against `tools/list` before changing them |
| `plugins/deeplit/skills/*/SKILL.md` | Changing what the agent is told to do with the tools |

The README is for humans and is not a source of truth about the server. When the
server changes, update the README from the live server, never the other way round.

## Working rules

- Plan first: no code changes without an outlined plan and explicit approval.
- Keep the manifests in step. `name`, `version`, `description` and `author` appear in `plugins/deeplit/plugin.json` and both client manifests; `.claude-plugin/marketplace.json` repeats `version` and `description`. A release bumps `version` in all of them; Claude Code only offers `claude plugin update` when the version changes.
- Git Flow branches: `feature/...`, `bugfix/...`; pull requests into `main`.
- Never add `Co-Authored-By: Claude ...` (or any AI co-author trailer) to commit messages. This is the user's repo; their authorship. No assistant attribution lines, no "Generated with..." footers. Keep commit messages and pull request descriptions clean.
- Prose (docs, commits, skill text, helper output): no em-dashes, no AI-sounding filler, plain titles.
- Brand: `deeplit`, lowercase, in all prose, including at the start of a sentence. `deeplit®` appears only in the README title and its first sentence. Never "Deeplit" or "Deeplit AI". Identifiers (`deeplit@deeplit`, `mcp.deeplit.ai`, `dk_core_`) stay as they are, and the Windows credential directory `%LOCALAPPDATA%\Deeplit` keeps its name so stored keys are not orphaned.
- License is Apache-2.0. `LICENSE`, `NOTICE` and `"license"` in `plugins/deeplit/plugin.json` must agree.
- Do not hand-write facts the server owns. Tool counts, tool names, parameters and defaults in the README come from the live `tools/list`; scope strings come from the key-creation page in the deeplit console. Check them before editing.
- Nothing in this repository may contain a key. `dk_core_...` and `ak_...` values appear only as placeholders.
- English only, everywhere.
- Agent instructions live in `AGENTS.md`. The `CLAUDE.md` beside it is a pointer and is never edited. Codex reads `AGENTS.md` directly, Claude Code reads it through the pointer, and there is only ever one copy to keep current.

## Commands

Validate after editing any manifest (Claude Code CLI, `--strict` catches unknown fields):

```bash
claude plugin validate ./plugins/deeplit --strict   # plugin manifest
claude plugin validate . --strict                   # marketplace manifest
node --check plugins/deeplit/scripts/deeplit-auth.mjs
for f in plugins/deeplit/plugin.json plugins/deeplit/.claude-plugin/plugin.json plugins/deeplit/.codex-plugin/plugin.json .claude-plugin/marketplace.json .agents/plugins/marketplace.json; do python3 -m json.tool "$f" >/dev/null || echo "invalid: $f"; done
```

Try the plugin without installing it:

```bash
claude --plugin-dir ./plugins/deeplit                 # session-only, Claude Code
claude plugin marketplace add ./ && claude plugin install deeplit@deeplit --scope user
codex plugin marketplace add ./ && codex plugin add deeplit@deeplit
```

Probe the live server without a real key (the gateway checks only the key prefix at
connect time; `tools/list` is served by the gateway, so it lists every tool):

```bash
curl -s -X POST https://mcp.deeplit.ai/ -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -H 'X-API-Key: dk_core_probe' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | sed -n 's/^data: //p' | python3 -c "import sys,json; print(sorted(t['name'] for t in json.load(sys.stdin)['result']['tools']))"
```

There is no CI. A clean validate run and a diff of the README tool reference against
the live `tools/list` are the only gates before a pull request.

## Traps that bite first

- Do not add `"$schema": "https://agent-plugins.org/schemas/..."` to `plugins/deeplit/plugin.json`. With that schema Codex treats the package as a portable Agent Plugin, reads MCP servers only from `./mcp.json` (static headers only) and ignores the `mcpServers` in `.codex-plugin/plugin.json`. The plugin then installs with skills but no server.
- Do not reintroduce a plugin-root `.mcp.json`. Claude Code reads that path as its default MCP location and would register the server twice with undocumented precedence. The Codex server is declared inline in `.codex-plugin/plugin.json` on purpose.
- Codex runs `http_headers_helper` through `sh -c` from the session's working directory, with a scrubbed environment and stderr discarded. A relative helper path in a distributed plugin never resolves, and the Linux and Windows backends of the helper do not work in that environment. The shipped auth is `env_http_headers`; the helper is an optional manual route with an absolute path, on macOS.
- The shell `claude plugin install` does not prompt for `userConfig`. Users set the key with `/plugin configure deeplit@deeplit` or `--config api_key=...`. Keep `userConfig.mcp_url.default` at `https://mcp.deeplit.ai` so only the key needs entering.
- In Claude Code the plugin's server is `plugin:deeplit:deeplit` and its tools are `mcp__plugin_deeplit_deeplit__<tool>`; permission rules that use `mcp__deeplit__*` match only a manually added server, never the plugin's.
- A well-formed but invalid key shows as connected in both clients. The control plane rejects it on the first tool call with a tool error carrying `401 Invalid or expired API key`. Verify keys with a read-only call such as `get_current_account`, not with the connection status.
- Write tools need `confirmed=true`. It is an MCP safety gate that returns a `403` tool error; it is not authorization, and the skills must keep asking the user before setting it.
- `cold_store_volume` and `terminate_instance(cold_store_volumes=true)` fail with `Cold storage is disabled for MCP` unless the server operator enabled it. Do not document them as generally available.
