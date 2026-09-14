# Changelog

## 0.2.0

First public release.

- Claude Code and Codex plugin with five skills and the deeplit MCP server connection.
- Codex: the MCP server is declared inline in the plugin manifest and authenticates with `env_http_headers` (`DEEPLIT_API_KEY`).
- Claude Code: `userConfig` for the MCP URL (default `https://mcp.deeplit.ai`) and the API key.
- Optional credential helper for the OS keychain (macOS under Codex).
- License: Apache-2.0.
