# Contributing

Thank you for helping improve the deeplit plugin. This repository holds the plugin only: manifests, five skills, an optional credential helper and the documentation. The MCP server is operated by deeplit and is not developed here.

## Ways to contribute

- **Report a bug** with the [bug report form](https://github.com/deeplitAI/deeplit-mcp-server/issues/new?template=bug_report.yml). Include the client and version, the install route and the `request_id` of the failing call. Never paste an API key.
- **Report a security issue** privately through [Security](https://github.com/deeplitAI/deeplit-mcp-server/security/advisories/new); see [SECURITY.md](SECURITY.md).
- **Propose a change** with the [feature request form](https://github.com/deeplitAI/deeplit-mcp-server/issues/new?template=feature_request.yml) before writing a large pull request, so the direction is agreed first.
- **Open a pull request** for fixes and improvements to the skills, manifests, helper or docs.

## Pull requests

`main` is protected: nobody pushes to it directly, and every change lands through a pull request with an approving review from a code owner.

1. Fork the repository and create a branch: `feature/<topic>` or `bugfix/<topic>`.
2. Make the change. Read [AGENTS.md](AGENTS.md) first; it lists the conventions (lowercase `deeplit` in prose, no em-dashes, English only, no keys anywhere) and the packaging traps that break the plugin in one client or the other.
3. Validate before pushing:

   ```bash
   claude plugin validate ./plugins/deeplit --strict
   claude plugin validate . --strict
   node --check plugins/deeplit/scripts/deeplit-auth.mjs
   ```

4. If the change touches the tool reference or scope table in the README, say in the PR how you verified it against the live server (`tools/list`).
5. Open the pull request against `main` with a short description of what changed and why. Keep commits clean: your own authorship, no generated-with footers.

Small documentation fixes are welcome as pull requests without an issue first.

## What we will not merge

- Anything containing a `dk_core_` or `ak_` value, even an expired one.
- Changes that reintroduce a plugin-root `.mcp.json`, an `agent-plugins.org` `$schema` in `plugins/deeplit/plugin.json`, or a localhost default URL (see the traps in `AGENTS.md`).
- Server-side behaviour described as if it existed; the README documents what `https://mcp.deeplit.ai` does today.

## License

By contributing you agree that your contribution is licensed under the [Apache License 2.0](LICENSE), as stated in Section 5 of that license.
