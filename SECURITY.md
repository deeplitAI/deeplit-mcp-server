# Security

## Reporting a vulnerability

Report vulnerabilities in this plugin, or in the deeplit MCP server it connects to, through GitHub's private vulnerability reporting: open the **Security** tab of this repository and choose **Report a vulnerability**. Do not open a public issue for security problems.

Include the affected client (Claude Code or Codex, with version), your operating system, the install route, and the `request_id` of any failing call. Never include an API key.

## Scope

- In scope: the manifests, skills and credential helper in this repository, and the behaviour of `https://mcp.deeplit.ai` as reached through them.
- Out of scope: the deeplit console and platform beyond what the plugin exposes; report those through the deeplit console.

## Key handling

A platform API key (`dk_core_...`) grants exactly the scopes chosen at creation and can be deleted at any time at [console.deeplit.ai/settings/mcp](https://console.deeplit.ai/settings/mcp). If you suspect a key has leaked, delete it there first, then report.
