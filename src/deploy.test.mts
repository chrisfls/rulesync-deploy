import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import {
  buildRulesyncCommands,
  hasDeclaredSources,
  includeStandardTargets,
  parseRulesyncConfig,
  resolveRulesyncCli,
  runRulesyncCommands,
  validateRulesyncProject,
} from "./deploy.mts";

const tempDirectories: string[] = [];

function tempProject(): string {
  const root = mkdtempSync(join(tmpdir(), "rulesync-deploy-"));
  tempDirectories.push(root);
  mkdirSync(join(root, ".rulesync", "rules"), { recursive: true });
  writeFileSync(join(root, "rulesync.jsonc"), '{"targets": {"agentsmd": ["rules"]}}\n');
  return root;
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("Rulesync deployment", () => {
  it("parses JSONC including comments and trailing commas", () => {
    const config = parseRulesyncConfig('{ // note\n "sources": [{"source":"owner/repo",}], }', "rulesync.jsonc");
    assert.equal(Array.isArray(config.sources), true);
  });

  it("detects sources in the base or local configuration", () => {
    assert.equal(hasDeclaredSources({ sources: [{ source: "owner/repo" }] }), true);
    assert.equal(hasDeclaredSources({}, { sources: [{ source: "owner/repo" }] }), true);
    assert.equal(hasDeclaredSources({ sources: [] }), false);
  });

  it("finds the rulesync CLI when npm hoists it beside rulesync-deploy or nests it", () => {
    const root = mkdtempSync(join(tmpdir(), "rulesync-deploy-layout-"));
    tempDirectories.push(root);
    const packageRoot = join(root, "node_modules", "rulesync-deploy");
    const fromUrl = pathToFileURL(join(packageRoot, "dist", "deploy.mjs"));
    const writeRulesync = (directory: string) => {
      mkdirSync(directory, { recursive: true });
      writeFileSync(join(directory, "package.json"), '{"name":"rulesync","bin":{"rulesync":"dist/cli/index.js"}}');
    };

    writeRulesync(join(root, "node_modules", "rulesync"));
    assert.equal(resolveRulesyncCli(fromUrl), join(root, "node_modules", "rulesync", "dist", "cli", "index.js"));

    writeRulesync(join(packageRoot, "node_modules", "rulesync"));
    assert.equal(resolveRulesyncCli(fromUrl), join(packageRoot, "node_modules", "rulesync", "dist", "cli", "index.js"));
  });

  it("adds open-standard targets only when the source project uses them", () => {
    const root = tempProject();
    writeFileSync(join(root, ".rulesync", "rules", "overview.md"), "---\nroot: true\n---\nRule.\n");
    assert.deepEqual(includeStandardTargets(["claudecode"], root, false, {}), ["claudecode", "agentsmd"]);
    assert.deepEqual(includeStandardTargets(["claudecode"], root, true, {}), ["claudecode"]);
    assert.deepEqual(includeStandardTargets(["claudecode"], root, true, { sources: [{ skills: ["review"] }] }), ["claudecode", "agentsskills"]);
  });

  it("builds project commands with install, generate, then full gitignore updates", () => {
    assert.deepEqual(buildRulesyncCommands({
      root: "C:/work/project",
      global: false,
      targets: ["claudecode", "agentsmd"],
      config: { sources: [{ source: "owner/repo" }] },
    }), [
      ["install", "--frozen"],
      ["generate", "--targets", "claudecode,agentsmd"],
      ["gitignore", "--targets", "claudecode,agentsmd", "--features", "*"],
    ]);
  });

  it("builds global commands without project gitignore changes", () => {
    assert.deepEqual(buildRulesyncCommands({
      root: "C:/work/project",
      global: true,
      targets: ["claudecode", "agentsskills"],
      config: {},
    }), [["generate", "--targets", "claudecode,agentsskills", "--global"]]);
  });

  it("requires a Rulesync project config and source directory", () => {
    const root = mkdtempSync(join(tmpdir(), "rulesync-deploy-invalid-"));
    tempDirectories.push(root);
    assert.throws(() => validateRulesyncProject(root), /No rulesync\.jsonc found/);

    writeFileSync(join(root, "rulesync.jsonc"), "{}\n");
    assert.throws(() => validateRulesyncProject(root), /No \.rulesync source directory found/);
  });

  it("loads both the base and local Rulesync configurations", () => {
    const root = tempProject();
    writeFileSync(join(root, "rulesync.local.jsonc"), '{"sources":[{"source":"owner/local"}]}\n');

    const result = validateRulesyncProject(root);
    assert.ok(result.localConfig);
  });

  it("runs commands in order and stops at the first Rulesync failure", () => {
    const calls: string[][] = [];
    assert.throws(() => runRulesyncCommands([["install", "--frozen"], ["generate"]], "C:/project", (args, cwd) => {
      calls.push([...args, cwd]);
      return { status: calls.length === 1 ? 1 : 0, stdout: "", stderr: "" };
    }), /exited with status 1/);
    assert.deepEqual(calls, [["install", "--frozen", "C:/project"]]);
  });
});
