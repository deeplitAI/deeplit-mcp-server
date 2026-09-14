# deeplit® plugin for Claude Code and Codex

[![validate](https://github.com/deeplitAI/deeplit-mcp-server/actions/workflows/validate.yml/badge.svg)](https://github.com/deeplitAI/deeplit-mcp-server/actions/workflows/validate.yml) [![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

Connect Claude Code or OpenAI Codex to your deeplit® account through the deeplit MCP server at `https://mcp.deeplit.ai`. deeplit runs private AI inside your perimeter: managed GPU instances that serve open models with vLLM, persistent volumes, and per-instance application users and inference keys. With a scoped platform API key, your coding agent inspects and manages GPU instances, persistent volumes, the model and GPU catalog, wallet and usage data, and per-instance application users and inference keys. This repository contains only the client-side plugin (manifests, five skills, an optional credential helper); deeplit operates the server, a stateless gateway.

- 41 tools: 24 read-only, 17 write (every write requires `confirmed=true`)
- API-key authentication (`X-API-Key: dk_core_...`) over MCP Streamable HTTP
- Keys default to read-only scopes; write scopes are opt-in at key creation
- License: Apache-2.0 ([LICENSE](./LICENSE))
- Website: [deeplit.ai](https://deeplit.ai); console and API keys: [console.deeplit.ai/settings/mcp](https://console.deeplit.ai/settings/mcp)

> [!WARNING]
> A key with write scopes lets an agent create, restart, and terminate billable GPU infrastructure and delete volumes. The skills ask for your approval before every write, but only your client can enforce that; see [Security](#security).

## Quickstart

### Create an API key

Open [console.deeplit.ai/settings/mcp](https://console.deeplit.ai/settings/mcp), select **New MCP API key**, name it, choose an expiry, and pick scopes; the default is all seven read scopes and no write scopes. Copy the key when shown: the plaintext appears once; deeplit stores only an HMAC-SHA256 digest. One key per machine and client. Do not confuse the two credential families:

| Prefix | What it is | Where it works |
|---|---|---|
| `dk_core_...` | Platform API key, sent as `X-API-Key` on every request | This plugin and the deeplit control plane |
| `ak_...` | Inference API key inside one instance, created by the instance-access tools; shown once | That instance only; cannot authenticate to MCP |

### Choose scopes

| Console checkbox | Scope string | Unlocks |
|---|---|---|
| Read: Account | `account:read` | Account tool |
| Read: Catalog | `catalog:read` | GPU, offer, and model catalog tools |
| Read: Instances | `instances:read` | Instance read tools |
| Read: Volumes | `volumes:read` | Volume read tools |
| Read: Billing | `billing:read` | Billing read tools |
| Read: Usage | `usage:read` | Usage and log tools |
| Read: Instance access | `instance-management:read` | Instance-access read tools |
| Write: Create instances | `instances:create` | `create_instance` |
| Write: Terminate instances | `instances:terminate` | `terminate_instance` |
| Write: Manage domains | `instances:write` | Instance update, restart, and domain tools |
| Write: Manage volumes | `volumes:write` | Volume write tools |
| Write: Manage instance access | `instance-management:write` | Instance-access write tools |

Scopes are fixed at creation. Use the default read-only key daily; for a write task, create a short-lived key with exactly the scopes it needs and delete it afterwards.

### Install in Claude Code

```bash
claude plugin marketplace add deeplitAI/deeplit-mcp-server
claude plugin install deeplit@deeplit --scope user
```

`deeplit@deeplit` means plugin `deeplit` from marketplace `deeplit`. The shell install does not prompt for options, so:

1. Start `claude` and run `/plugin configure deeplit@deeplit`.
2. Keep the default URL `https://mcp.deeplit.ai` and paste your `dk_core_...` key.
3. Run `/reload-plugins` (or restart), then `claude mcp list` prints `plugin:deeplit:deeplit: https://mcp.deeplit.ai (HTTP) - Connected`.

Non-interactive: `claude plugin install deeplit@deeplit --config mcp_url=https://mcp.deeplit.ai --config api_key=dk_core_...` (clear the key from your shell history afterwards).

### Install in Codex

```bash
export DEEPLIT_API_KEY=dk_core_...       # in the shell that starts codex, or in your shell profile
codex plugin marketplace add deeplitAI/deeplit-mcp-server
codex plugin add deeplit@deeplit
codex mcp list                          # deeplit  https://mcp.deeplit.ai  -  enabled  Unknown
```

The plugin registers the five skills and the `deeplit` MCP server, which reads `DEEPLIT_API_KEY` from the environment of the `codex` process. Install before starting `codex`, or start a new session afterwards: tools and skills load at session start. `Auth Unknown` in the listing is normal for API-key servers and appears whether or not the key is set; the smoke test under [Verify](#verify) is what proves the key.

> [!NOTE]
> Codex passes the launching shell's environment, including `DEEPLIT_API_KEY`, to commands the agent runs. To hide it, add `[shell_environment_policy]` to `~/.codex/config.toml` with `ignore_default_excludes = false` (drops names containing KEY, SECRET, or TOKEN) or `filters = { "DEEPLIT_API_KEY" = "exclude" }`. The MCP header still works because Codex resolves `env_http_headers` from its own process.

### Verify

In either client, `/mcp` shows the server. Claude Code lists the skills under `/skills` as `/deeplit:<name>`; Codex lists them when you type `$`. Then run a read-only smoke test: `Show my deeplit account and list my instances with their status.` The agent calls `get_current_account` and `list_instances`; the gateway checks only the key prefix at connect time, so this call proves the key.

## Example prompts

- `Show my deeplit instances and their status.`
- `Find a compatible GPU and model for a new instance in <region> and list the priced offers.`
- `Review usage and billing for my running instances for the last 7 days.`
- `Show the runtime logs for instance <instance_id> and explain any errors.`
- `Create a 200 GB volume named datasets in the same cloud and region as instance <instance_id>, then attach it.` (write: needs `volumes:write`)
- `List the application users on instance <instance_id> and create a managed inference key named "ci-eval" limited to LLM and RAG.` (write: needs `instance-management:write`)

## Skills

Skills are playbooks in [`plugins/deeplit/skills/`](./plugins/deeplit/skills). Claude Code applies them when a request matches; Codex shows them as `deeplit:<name>` and selects them by description. For write prompts, every skill summarizes the change and asks for approval before calling the tool with `confirmed=true`.

| Skill | Use it for | Guardrails |
|---|---|---|
| `manage-instances` | Instance lifecycle and public domains | Read state first; approval before `confirmed=true`; poll `get_instance_status` after async operations; never leak credentials |
| `manage-volumes` | Persistent volumes | Explain impact and get approval before any write; deletion and cold storage are high impact |
| `select-models-and-gpus` | Capacity planning and model selection | Prefer available configurations; never invent availability or pricing |
| `review-usage-and-billing` | Wallet, billing, usage, and logs | Read-only; preserve request ids in failure reports |
| `manage-instance-access` | Application users and `ak_` inference keys inside a ready instance | Inspect first; approval before create or delete; `ak_` secret shown once, never persisted |

## Tool reference

41 tools: 24 read-only (R), 17 write (W). "Scope" is the control-plane scope enforced on the tool's route; optional parameters end with `?`, defaults appear as `=value`. Claude Code names the tools `mcp__plugin_deeplit_deeplit__<tool>`; Codex names them `mcp__deeplit__<tool>`.

<details>
<summary><b>Account and catalog</b> (7 tools, all R; scopes <code>account:read</code>, <code>catalog:read</code>)</summary>

| Tool | R/W | Scope | Parameters | Purpose |
|---|---|---|---|---|
| `get_current_account` | R | `account:read` | none | Account associated with the calling key |
| `list_gpus` | R | `catalog:read` | `cloud?`, `region?` | Available GPU configurations and current platform markup |
| `list_gpu_offers` | R | `catalog:read` | `cloud?`, `region?`, `gpu_type?`, `num_gpus?`, `provider_instance_type?`, `available?`, `sort?` | Priced managed offers with launchable provider instance types |
| `list_compatible_models` | R | `catalog:read` | `gpu_type`, `num_gpus=1` | Catalog models compatible with a GPU configuration |
| `list_models` | R | `catalog:read` | `model_type?`, `gpu_type?`, `featured_only=false` | Hugging Face model catalog |
| `get_model` | R | `catalog:read` | `model_id` (UUID) | One catalog model |
| `list_model_compatible_instances` | R | `catalog:read` | `model_id` (UUID) | Managed instances compatible with a catalog model |

</details>
<details>
<summary><b>Instances</b> (9 tools: 3 R, 6 W; scopes <code>instances:read</code>, <code>instances:create</code>, <code>instances:write</code>, <code>instances:terminate</code>)</summary>

| Tool | R/W | Scope | Parameters |
|---|---|---|---|
| `list_instances` | R | `instances:read` | none |
| `get_instance` | R | `instances:read` | `instance_id` |
| `get_instance_status` | R | `instances:read` | `instance_id` |
| `create_instance` | W | `instances:create` | `name`, `cloud`, `region`, `gpu_type`, `vllm_model`, `num_gpus=1`, `provider_name="shadeform"`, `provider_instance_type?`, `demo_server_id?`, `custom_server_id?`, `hf_model_id?`, `custom_model_hf_id?`, `model_display_name?`, `volume_id?`, `vllm_image="vllm/vllm-openai:v0.20.0-cu129"`, `vllm_args?`, `hf_token?`, `confirmed` |
| `update_instance` | W | `instances:write` | `instance_id`, `name?`, `auto_delete?`, `alert?`, `tags?`, `confirmed` (PATCH semantics) |
| `restart_instance` | W | `instances:write` | `instance_id`, `confirmed` |
| `terminate_instance` | W | `instances:terminate` | `instance_id`, `cold_store_volumes=false`, `confirmed` |
| `create_instance_domain` | W | `instances:write` | `instance_id`, `confirmed` (provisions a public domain) |
| `delete_instance_domain` | W | `instances:write` | `instance_id`, `confirmed` |

- `create_instance` and `terminate_instance` are asynchronous (HTTP 202). Poll `get_instance_status` until the instance reaches its target state.
- Three model fields on `create_instance` are easy to mix up: `hf_model_id` is the catalog model UUID from `list_models` or `get_model` (the gateway parses it as a UUID); `custom_model_hf_id` and `vllm_model` are passed through to the control plane as strings.
- `hf_token` passes a secret as a tool argument; see [Security](#security).
- `terminate_instance(cold_store_volumes=true)` works only when deeplit has enabled cold storage on the gateway; otherwise it fails with `Cold storage is disabled for MCP`.

</details>
<details>
<summary><b>Volumes</b> (7 tools: 2 R, 5 W; scopes <code>volumes:read</code>, <code>volumes:write</code>)</summary>

| Tool | R/W | Scope | Parameters |
|---|---|---|---|
| `list_volumes` | R | `volumes:read` | none |
| `get_volume` | R | `volumes:read` | `volume_id` |
| `create_volume` | W | `volumes:write` | `name`, `size_gb`, `cloud`, `region`, `availability_zone?`, `instance_id?`, `confirmed` |
| `attach_volume` | W | `volumes:write` | `volume_id`, `instance_id`, `confirmed` |
| `detach_volume` | W | `volumes:write` | `volume_id`, `confirmed` |
| `cold_store_volume` | W | `volumes:write` | `volume_id`, `keep_shadeform_volume=false`, `confirmed` (only when deeplit has enabled cold storage on the gateway) |
| `delete_volume` | W | `volumes:write` | `volume_id`, `confirmed` (destructive) |

</details>
<details>
<summary><b>Billing and usage</b> (9 tools, all R; scopes <code>billing:read</code>, <code>usage:read</code>)</summary>

| Tool | R/W | Scope | Parameters | Purpose |
|---|---|---|---|---|
| `get_wallet_summary` | R | `billing:read` | none | Organization wallet balance |
| `list_wallet_transactions` | R | `billing:read` | `limit=50` (1..200), `cursor?` (UUID) | Keyset-paginated transactions |
| `get_payment_config` | R | `billing:read` | none | Checkout availability and configured top-up options (read-only) |
| `get_topup_status` | R | `billing:read` | `intent_id` (UUID) | Status of an owned top-up attempt |
| `get_instance_billing` | R | `billing:read` | `instance_id` | Billing for one instance |
| `get_instance_usage` | R | `usage:read` | `instance_id`, `start_date?`, `end_date?` | Usage statistics |
| `get_instance_logs` | R | `usage:read` | `instance_id`, `limit=100` (1..200), `api_key_id?` | Usage logs |
| `get_instance_runtime_logs` | R | `usage:read` | `instance_id` | Live or cached vLLM container diagnostics |
| `get_instance_service_logs` | R | `usage:read` | `instance_id`, `service` (`backend` or `api-controller`) | Logs for one platform service on the instance |

- `limit` on `list_wallet_transactions` and `get_instance_logs` must be between 1 and 200; other values are rejected with `limit must be between 1 and 200`. Page `list_wallet_transactions` with `cursor`.
- Payment checkout and top-up creation are intentionally not exposed; billing is read-only over MCP.

</details>
<details>
<summary><b>Instance access</b> (9 tools: 3 R, 6 W; scopes <code>instance-management:read</code>, <code>instance-management:write</code>)</summary>

| Tool | R/W | Scope | Parameters |
|---|---|---|---|
| `list_instance_users` | R | `instance-management:read` | `instance_id` |
| `create_instance_user` | W | `instance-management:write` | `instance_id`, `phone`, `password` (a secret passed as a tool argument; see [Security](#security)), `full_name?`, `confirmed` |
| `delete_instance_user` | W | `instance-management:write` | `instance_id`, `user_id` (int), `confirmed` |
| `list_instance_api_keys` | R | `instance-management:read` | `instance_id`, `user_id` |
| `create_instance_api_key` | W | `instance-management:write` | `instance_id`, `user_id`, `key_name`, `rate_limit=100`, `confirmed` (returns the `ak_` secret once) |
| `delete_instance_api_key` | W | `instance-management:write` | `instance_id`, `key_id` (int), `confirmed` |
| `list_managed_instance_api_keys` | R | `instance-management:read` | `instance_id` (secrets never revealed) |
| `create_managed_instance_api_key` | W | `instance-management:write` | `instance_id`, `name`, `rate_limit=100`, `enable_llm=true`, `enable_vlm=true`, `enable_stt=true`, `enable_tts=true`, `enable_rag=true`, `confirmed` (returns the secret once) |
| `delete_managed_instance_api_key` | W | `instance-management:write` | `instance_id`, `key_id`, `confirmed` |

</details>

## Security

- **Stateless gateway; the control plane decides.** The gateway has no database, key store, or user store. It checks the `dk_core_` prefix, attaches an `X-Request-ID`, and forwards the same `X-API-Key` to the deeplit control plane on a fixed route per tool. The control plane alone authenticates the key (digest lookup, expiry, active user), enforces the route's scope, and checks ownership. Results are wrapped as `{ "request_id": "<uuid>", "data": ... }`.
- **`confirmed=true` is a safety gate, not authorization.** It prevents accidental writes; it does not let a read-only key write, and the gateway cannot tell whether a human approved.
- **Key storage.** Claude Code keeps `api_key` in secure storage (macOS Keychain, otherwise `~/.claude/.credentials.json`) and writes `mcp_url` to `~/.claude/settings.json` under `pluginConfigs`. Codex reads `DEEPLIT_API_KEY` from its own environment and never writes the key to `config.toml`.
- **Restrict what the agent may call.** Claude Code: list write tools in `permissions.deny` (for example the glob `mcp__plugin_deeplit_deeplit__delete_*`) to remove them; put only read tools in `permissions.allow`. Codex: under `[plugins."deeplit@deeplit".mcp_servers.deeplit]` in `config.toml` (`[mcp_servers.deeplit]` for a manual entry) set `disabled_tools = ["terminate_instance", "delete_volume"]` or `tools.<tool>.approval_mode = "approve"` with bare tool names. Name the write tools explicitly rather than relying on the `writes` approval mode, which depends on tool annotations.
- **Secrets that pass through the agent.** `create_instance_api_key` and `create_managed_instance_api_key` return an `ak_` secret exactly once; the skills tell the agent to hand it to you and never write it to files, commits, or logs. `create_instance(hf_token=...)` and `create_instance_user(password=...)` take secrets as tool arguments, which land in your client's session transcript; use a fine-grained read-only Hugging Face token and rotate it once the instance has fetched its weights.
- **Not exposed:** SSH, shell execution, database access, platform secrets, admin operations, raw provider (Shadeform) passthrough, arbitrary URL forwarding, and payment checkout or top-up creation.

| Status | Meaning | Decided by |
|---|---|---|
| 401 `X-API-Key is required` | Header missing or empty | Gateway |
| 401 `X-API-Key has an invalid format` | Value lacks the `dk_core_` prefix | Gateway |
| 401 `Invalid or expired API key` | Key unknown, expired, or deleted | Control plane |
| 403 | Key lacks the scope for this route | Control plane |
| 403 `Confirmation is required before <operation>` | Write tool called without `confirmed=true` | Gateway |
| 404 or 403 | Resource missing or owned by another organization | Control plane |
| 502 | Control plane unreachable or returned 5xx | Gateway |

The two gateway `X-API-Key` errors fail the MCP connection itself; every other row arrives inside the tool result as an MCP tool error that carries the control-plane status and detail, for example `401 Invalid or expired API key`.

## Rotate or replace your key

1. Create the new key in the console (scopes are immutable, so this is also how you add a scope).
2. Claude Code: `/plugin configure deeplit@deeplit`, paste the new key, then `/reload-plugins` or restart. Codex: export the new `DEEPLIT_API_KEY` (helper users: run `set`) and start a new session.
3. Delete the old key in the console.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Claude Code: `/mcp` does not list `plugin:deeplit:deeplit` | Plugin options not set (the server is skipped silently; the skills still load) | `/plugin configure deeplit@deeplit`, then `/reload-plugins` or restart (`claude --debug` prints MCP errors) |
| 401 `X-API-Key is required` or `X-API-Key has an invalid format` | No key reaches the gateway, or it lacks the `dk_core_` prefix | Claude Code: configure `api_key`. Codex: export `DEEPLIT_API_KEY` before starting `codex`. Manual setups: check the header |
| 401 `Invalid or expired API key` | Key deleted, expired, or mistyped | [Rotate or replace your key](#rotate-or-replace-your-key) |
| 403 on a tool call | Missing scope, or resource owned by another organization | Create a new key with the scope, or check the resource id against `list_instances` / `list_volumes` |
| 403 `Confirmation is required before ...` | Write tool called without `confirmed=true` | Approve when the agent asks; it retries with `confirmed=true` |
| `Cold storage is disabled for MCP` | Cold storage is not enabled on the gateway | None; gateway-gated |
| Nothing changed after install or update, or Codex shows no deeplit tools or skills | Plugins load on the next session; third-party marketplaces do not auto-update | Claude Code: `/reload-plugins` or restart. Codex: start a new session (the desktop app included). See [Update and uninstall](#update-and-uninstall) |
| Codex (helper route): `deeplit` fails to start or is missing from `/mcp` | Node.js not on the `PATH` Codex uses, no key stored, or `set` run without a TTY | Run the helper's `get` in a terminal and read the error; `The API key must start with dk_core_.` (macOS/Linux) or `No deeplit credential is stored` (Windows) means no key is stored, so run `set`. On Linux and Windows use `env_http_headers` |

## Manual and local setups

The plugin configures one Streamable HTTP server with one header. You can do the same by hand, without the skills, in Claude Code, Codex, or any other client that supports MCP Streamable HTTP with custom headers (Streamable HTTP at the root path, not SSE). The subsections below cover installing from a local clone and the optional Codex credential helper.

<details>
<summary><b>Claude Code (project .mcp.json)</b></summary>

```json
{
  "mcpServers": {
    "deeplit": { "type": "http", "url": "https://mcp.deeplit.ai", "headers": { "X-API-Key": "${DEEPLIT_API_KEY}" } }
  }
}
```

`type` is required for a `url` entry. Claude Code asks you to approve project-scoped servers on first use. Its Bash tool inherits your environment, so agent-run commands can read `DEEPLIT_API_KEY`; the plugin's `userConfig` route avoids this. Verify with `claude mcp list` or `/mcp`; remove by deleting the entry from `.mcp.json` (or `claude mcp remove deeplit --scope project`). Use either the plugin or the manual server, not both.

</details>
<details>
<summary><b>Codex (config.toml)</b></summary>

```toml
[mcp_servers.deeplit]
url = "https://mcp.deeplit.ai"
env_http_headers = { "X-API-Key" = "DEEPLIT_API_KEY" }
```

Add this to `~/.codex/config.toml` (or a trusted project's `.codex/config.toml`) and start a new session; `codex mcp add` has no header flag, so edit the file directly. A static `http_headers = { "X-API-Key" = "dk_core_..." }` also works but stores the key in plaintext. `bearer_token_env_var` sends `Authorization: Bearer`, which the gateway ignores. This route also works for the Codex IDE extension, which shares `config.toml`. Verify with `codex mcp list` or `/mcp`.

</details>

### Install from a local clone

```bash
git clone https://github.com/deeplitAI/deeplit-mcp-server.git
claude plugin marketplace add ./deeplit-mcp-server && claude plugin install deeplit@deeplit --scope user
codex plugin marketplace add ./deeplit-mcp-server && codex plugin add deeplit@deeplit
```

### Credential helper (optional, Codex on macOS)

[`deeplit-auth.mjs`](./plugins/deeplit/scripts/deeplit-auth.mjs) (Node.js 18+, no dependencies; actions `set`, `get`, `remove`, `status`) keeps the key in the OS credential store and prints it as an `X-API-Key` header on `get`. Under Codex only the macOS backend works, because Codex runs helper commands with a minimal environment; the Linux and Windows backends serve standalone `set`, `status` and `remove` use. It replaces `env_http_headers` in the manual `config.toml` route above. Clone the repository (see [Install from a local clone](#install-from-a-local-clone)) and run `node /absolute/path/to/deeplit-mcp-server/plugins/deeplit/scripts/deeplit-auth.mjs set`:

| OS | Storage | Backend |
|---|---|---|
| macOS | Keychain item, service `ai.deeplit.mcp`, account = your username | `security add-generic-password` / `find-generic-password` / `delete-generic-password` |
| Linux | freedesktop Secret Service (GNOME Keyring, KWallet), service `ai.deeplit.mcp` | `secret-tool`; needs `libsecret-tools` (Debian/Ubuntu) or `libsecret` (Fedora/Arch) and a running Secret Service |
| Windows | DPAPI-encrypted file `%LOCALAPPDATA%\Deeplit\codex-api-key.dat` | [`deeplit-auth.ps1`](./plugins/deeplit/scripts/deeplit-auth.ps1), invoked by the `.mjs`; run the `.mjs` with `node`, not the `.ps1` directly |

The installed plugin already registers a server named `deeplit`: keep it for its skills, turn off its bundled server, and add the manual table pointing at the helper by absolute path:

```toml
[plugins."deeplit@deeplit".mcp_servers.deeplit]
enabled = false

[mcp_servers.deeplit]
url = "https://mcp.deeplit.ai"
http_headers_helper = "node /absolute/path/to/deeplit-mcp-server/plugins/deeplit/scripts/deeplit-auth.mjs get"
```

On Linux and Windows use `env_http_headers`. Run `remove` when you stop using the helper.

## Update and uninstall

```bash
claude plugin marketplace update deeplit && claude plugin update deeplit@deeplit   # update; then /reload-plugins or restart
claude plugin uninstall deeplit@deeplit && claude plugin marketplace remove deeplit # uninstall
codex plugin marketplace upgrade deeplit && codex plugin remove deeplit@deeplit && codex plugin add deeplit@deeplit   # update; then start a new session
codex plugin remove deeplit@deeplit && codex plugin marketplace remove deeplit     # uninstall
```

Uninstalling removes the local registration only. Delete the key at [console.deeplit.ai/settings/mcp](https://console.deeplit.ai/settings/mcp) to revoke access.

## Repository layout

```text
.claude-plugin/marketplace.json        Claude Code marketplace manifest (marketplace "deeplit", source ./plugins/deeplit)
.agents/plugins/marketplace.json       Codex marketplace manifest (marketplace "deeplit", source ./plugins/deeplit)
plugins/deeplit/                       The plugin (no build step, no package.json, no server code); plugin.json holds its metadata
  .claude-plugin/plugin.json           Claude Code manifest: userConfig (mcp_url, api_key) + HTTP MCP server
  .codex-plugin/plugin.json            Codex manifest: interface, skills, inline MCP server (env_http_headers)
  scripts/deeplit-auth.{mjs,ps1}       Optional credential helper (Node.js, no dependencies) and its Windows DPAPI backend
  skills/*/SKILL.md                    Five skills
```

## Versioning

- Current version: `0.2.0` (`plugins/deeplit/plugin.json`, `.claude-plugin/plugin.json`, and the marketplace entry); the Codex manifest adds a `+codex.<timestamp>` build suffix.
- Claude Code offers `claude plugin update` only when this version changes; third-party marketplaces do not auto-update unless enabled under `/plugin` > Marketplaces.
- Pinning: `claude plugin marketplace add deeplitAI/deeplit-mcp-server@<tag-or-branch>`; `codex plugin marketplace add deeplitAI/deeplit-mcp-server --ref <tag-or-branch>`.

## Contributing and support

Plugin problems (install, skills, credential helper): open an issue at [github.com/deeplitAI/deeplit-mcp-server/issues](https://github.com/deeplitAI/deeplit-mcp-server/issues) and include the `request_id` of the failed call. Account, key, or platform problems: contact deeplit through [deeplit.ai](https://deeplit.ai).

Pull requests are welcome; `main` is protected, so every change lands through a reviewed pull request with a green `validate` check. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the flow and [AGENTS.md](./AGENTS.md) for the conventions; run `claude plugin validate ./plugins/deeplit --strict` after editing manifests and before opening one.

## License

Apache License 2.0; see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). deeplit is a registered trademark. The license covers this repository only, not the deeplit platform or the MCP server, which require a deeplit account under the deeplit Terms of Service.
