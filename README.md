# rulesync-deploy

Deploy an existing [Rulesync](https://github.com/dyoshikawa/rulesync) project to the AI coding agents installed on your machine.

`rulesync-deploy` detects your installed agents and uses Rulesync to generate their native configuration files from a single `.rulesync/` source directory. You don't need to maintain a target list or install the Rulesync CLI separately.

## Quick start

You'll need:

- **Node.js 24.19.0 or newer**
- An existing Rulesync project with `rulesync.jsonc` and a `.rulesync/` directory

From your Rulesync project's directory, run:

```sh
npx --yes rulesync-deploy
```

This generates project-level configuration for the detected agents and updates the project's `.gitignore` to exclude generated Rulesync files.

To deploy the same sources to your user-level agent configuration instead:

```sh
npx --yes rulesync-deploy --global
```

The package is available on [npm](https://www.npmjs.com/package/rulesync-deploy). `npx` downloads it and its dependencies into npm's cache on first use, so no global installation is needed.

## Usage

```text
rulesync-deploy [--root <path>] [--global] [--help]
```

| Option | Description |
| --- | --- |
| `--root <path>` | Select a Rulesync project. Defaults to the current directory. |
| `--global` | Generate user-level agent configuration instead of project-level files. |
| `--help`, `-h` | Show CLI help. |

You can run the command from outside the Rulesync project by passing its path:

```sh
npx --yes rulesync-deploy --root ../my-project
npx --yes rulesync-deploy --root ../my-project --global
```

`--global` changes where Rulesync generates the configuration. It still reads the sources from the selected project.

## How deployment works

1. **Validate the project.** Check that `rulesync.jsonc` and `.rulesync/` exist, and read `rulesync.local.jsonc` if present.
2. **Detect installed agents.** Look for supported agent commands, configuration directories, and product-specific installation signals.
3. **Install declared sources.** If either Rulesync configuration declares sources, run `rulesync install --frozen` before generating anything.
4. **Generate native targets.** Run Rulesync with the targets corresponding to detected agents, plus applicable open-standard targets.
5. **Update `.gitignore` in project mode.** Run `rulesync gitignore` for all generated targets and features. Global deployment skips this step.

Deployment runs only when you invoke the command. It doesn't install a Git hook or automatically regenerate files when sources change.

### Agent detection

The target registry covers the native targets supported by the Rulesync version bundled with this package. Detection uses signals such as an executable on `PATH`, an agent's user configuration directory, an application installation, or a specific editor extension.

Some directories are shared by multiple tools. For example, `.kiro`, `.roo`, `.gemini`, and `.warp` alone may not identify which product is installed. Ambiguous installations are reported and skipped until a more specific signal is available.

The CLI also:

- Includes open standards such as `AGENTS.md` and agent skills when the project's sources or existing paths make them applicable.
- Reports recognized agents for which Rulesync has no native target.
- Includes plugin targets only when the corresponding project plugin directory exists. Plugin targets and other project-only targets are skipped in global mode.

If no supported installed target is detected, deployment stops with an error instead of generating a target arbitrarily.

## Development

Development uses [mise](https://mise.jdx.dev/) and Git. The repository pins Node.js 24.19.0, Rulesync 43.10.0, and OpenSpec 2.1.1 in `mise.toml`.

```sh
git clone https://github.com/chrisfls/rulesync-deploy.git
cd rulesync-deploy
mise trust
mise run setup
npm run build
npm link
```

After linking, `rulesync-deploy` is available as a local command. Run it from another Rulesync project, or use `--root` to select one:

```sh
rulesync-deploy --root ../my-project
rulesync-deploy --root ../my-project --global
```

For development without linking, use the `mise run deploy` and `mise run deploy-global` tasks. Both accept `--root <path>` to select another project.

Run all checks with:

```sh
mise run check
```

This typechecks and builds the TypeScript, runs the Node test suite, and validates the OpenSpec specifications.

## License

[MIT](LICENSE)
