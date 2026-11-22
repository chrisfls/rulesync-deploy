# auto-rulesync

Deploy an existing Rulesync project to the AI coding agents installed for the current user. The deployer reads the selected project's `.rulesync/` sources and `rulesync.jsonc`, detects installed agents, then asks Rulesync to generate those native targets.

## Requirements

- [mise](https://mise.jdx.dev/)
- Git
- Node.js 24.19.0, Rulesync 43.10.0, and OpenSpec 2.1.1 are pinned in `mise.toml`.

## Setup

```powershell
mise trust
mise run setup
npm link
```

## Deploy

After `npm link`, run `auto-rulesync` from any Rulesync project. By default, the current directory is the project to deploy. Use `--root` to select another project and `--global` to write user-level agent configuration.

```powershell
# Project files and .gitignore
auto-rulesync

# Global user configuration from the selected project's sources
auto-rulesync --global
```

The `mise run deploy` and `mise run deploy-global` tasks are also available for development; pass `--root <path>` to deploy a different project from this checkout.

Project deployment always updates `.gitignore` for all generated Rulesync files. Global deployment does not modify `.gitignore`. Deployment is explicit; no Git hook runs it automatically.

The target registry follows the complete native target list in the pinned Rulesync release. Agent-specific targets are included when a matching CLI, app installation directory, or product-specific editor extension is detected. Shared config directories such as `.kiro`, `.roo`, `.gemini`, and `.warp` are reported as ambiguous unless a product-specific signal distinguishes the installed agent. Open standards are included when their source format or corresponding existing paths are detected. Plugin-only targets are considered when their project plugin directory exists, and are unavailable in global mode.

## Development

```powershell
mise run check
```

The check task typechecks the TypeScript, runs mechanical Node tests, and validates the OpenSpec specifications.
