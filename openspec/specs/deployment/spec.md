# Deployment Specification

## Purpose

Detect installed AI agent targets supported by Rulesync and deploy an existing Rulesync project in project or global scope.

## Requirements

### Requirement: Detect installed Rulesync targets

The CLI SHALL detect a target when its executable is available on `PATH` or a registered user configuration directory exists. The target registry SHALL cover every native target in the Rulesync release pinned by `mise.toml`.

#### Scenario: Agent executable is installed

- **WHEN** a registered agent executable is on `PATH`
- **THEN** the CLI includes its native Rulesync target

#### Scenario: Agent user configuration exists

- **WHEN** a registered agent's user configuration directory exists
- **THEN** the CLI includes its native Rulesync target

#### Scenario: No supported agent is detected

- **WHEN** no native target is detected
- **THEN** the CLI exits with a clear diagnostic and does not run Rulesync

### Requirement: Deploy an existing Rulesync project

The CLI SHALL use the current directory by default and SHALL accept `--root <path>` to select a different project. It SHALL require `rulesync.jsonc` and `.rulesync/` in that project.

#### Scenario: Project deployment

- **WHEN** the CLI runs without `--global`
- **THEN** it runs Rulesync generation for the detected targets in project scope

#### Scenario: Global deployment

- **WHEN** the CLI runs with `--global`
- **THEN** it runs Rulesync generation for the detected targets in user scope

### Requirement: Run as an ephemeral npm command

The package SHALL expose `rulesync-deploy` as an npm executable and include all runtime files and dependencies needed to run it from an npm package cache, without a global installation or checkout in the user's project.

#### Scenario: Run from an existing Rulesync project

- **WHEN** a user invokes the published package with `npx rulesync-deploy` from a Rulesync project
- **THEN** the CLI uses that working directory as the project root and runs normally

#### Scenario: npm hoists the Rulesync dependency

- **WHEN** npm installs `rulesync` beside `rulesync-deploy` rather than inside its `node_modules`
- **THEN** the CLI finds the Rulesync executable through Node module resolution and runs it

### Requirement: Install locked sources before generation

The CLI SHALL run `rulesync install --frozen` when the selected project's base or local configuration declares sources. It SHALL stop when installation fails.

#### Scenario: Project declares sources

- **WHEN** `rulesync.jsonc` or `rulesync.local.jsonc` declares at least one source
- **THEN** frozen source installation completes before generation

#### Scenario: Source installation fails

- **WHEN** frozen source installation exits unsuccessfully
- **THEN** generation and gitignore updates do not run

### Requirement: Update project gitignore

The CLI SHALL run `rulesync gitignore` for every detected target and all supported features after successful project-scope generation. It SHALL NOT change `.gitignore` in global scope.

#### Scenario: Local deployment

- **WHEN** project-scope generation succeeds
- **THEN** generated Rulesync paths are added to the project's `.gitignore`

#### Scenario: Global deployment

- **WHEN** global generation succeeds
- **THEN** the CLI does not run the gitignore command

### Requirement: Report unsupported or unavailable targets

The CLI SHALL report recognized agents that have no native Rulesync target. In global scope it SHALL report detected project-only plugin targets and omit them from generation.

#### Scenario: Unsupported harness is installed

- **WHEN** a recognized harness has no native Rulesync target
- **THEN** its name is reported as unsupported

#### Scenario: Plugin target is detected in global scope

- **WHEN** a plugin-only target's project directory exists and global scope is selected
- **THEN** the CLI reports that target as unavailable globally and omits it

#### Scenario: Shared configuration does not identify the installed product

- **WHEN** a shared configuration directory exists without a product-specific executable, installation path, or extension marker
- **THEN** the CLI reports the ambiguity and does not infer one of the colliding targets
