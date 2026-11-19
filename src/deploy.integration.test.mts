import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "node:test";

const tempDirectories: string[] = [];

function createFixture(): { root: string; home: string } {
  const root = mkdtempSync(join(tmpdir(), "auto-rulesync-e2e-"));
  const home = join(root, "home");
  tempDirectories.push(root);
  mkdirSync(join(root, ".rulesync", "rules"), { recursive: true });
  mkdirSync(join(home, ".claude"), { recursive: true });
  writeFileSync(join(root, "rulesync.jsonc"), JSON.stringify({ targets: { claudecode: ["rules"] } }));
  writeFileSync(join(root, ".rulesync", "rules", "overview.md"), "---\nroot: true\n---\n\n# Fixture rules\n\nUse the fixture.\n");
  return { root, home };
}

function runCli(root: string, home: string, global: boolean) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const cliPath = join(repoRoot, "src", "cli.mts");
  const args = [cliPath, "--root", root];
  if (global) args.push("--global");
  return spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      USERPROFILE: home,
      HOME: home,
      APPDATA: join(home, "AppData", "Roaming"),
      LOCALAPPDATA: join(home, "AppData", "Local"),
      XDG_CONFIG_HOME: join(home, ".config"),
      PATH: "",
      PATHEXT: ".EXE;.CMD",
    },
  });
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("end-to-end deployment", () => {
  it("generates detected project targets and updates project gitignore", () => {
    const { root, home } = createFixture();
    const result = runCli(root, home, false);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.ok(existsSync(join(root, ".claude", "CLAUDE.md")) || existsSync(join(root, "CLAUDE.md")), result.stdout);
    assert.ok(existsSync(join(root, "AGENTS.md")));
    assert.match(readFileSync(join(root, ".gitignore"), "utf8"), /CLAUDE\.md/);
  });

  it("generates global targets without changing the project's gitignore", () => {
    const { root, home } = createFixture();
    const gitignorePath = join(root, ".gitignore");
    writeFileSync(gitignorePath, "keep-this-entry\n");
    const result = runCli(root, home, true);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.ok(existsSync(join(home, ".claude", "CLAUDE.md")));
    assert.equal(readFileSync(gitignorePath, "utf8"), "keep-this-entry\n");
  });
});
