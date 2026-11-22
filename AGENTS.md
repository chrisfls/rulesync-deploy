# Additional Conventions Beyond the Built-in Functions

As this project's AI coding tool, you must follow the additional conventions below, in addition to the built-in functions.

# rulesync-deploy

This repository contains a TypeScript CLI that detects installed AI coding agents and deploys an existing Rulesync project to them. Use `mise` for pinned tools and project tasks. Keep the deployer generic: do not add personal agent instructions, skills, or configuration here.

## Release process

Publish every release to GitHub and npm using the same version and source commit. Push the release commit to `master` and create the matching GitHub release/tag first. Publish to npm only after the GitHub release succeeds. Verify both releases; do not consider a release complete until GitHub and npm show the intended version. Never publish to npm before the GitHub release succeeds.
