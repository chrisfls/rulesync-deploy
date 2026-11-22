import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { detectTargets, getNativeTargetIds, makeDetectorHost } from "./targets.mts";

const expectedRulesyncTargets = [
  "agentsmd", "agentsskills", "amp", "bob", "claudecode", "claudecode-plugin", "codebuddy", "codewhale",
  "codexcli", "commandcode", "copilot", "copilotcli", "crush", "goose", "hermesagent", "grokcli", "cursor",
  "deepagents", "factorydroid", "firebender", "opencode", "opencodev1", "openclaw", "mimocode", "gitlabduo",
  "cline", "kilo", "kimi-code", "kimi-code-plugin", "roo", "zoocode", "rovodev", "takt", "trae", "tabnine",
  "continue", "cortexcode", "vibe", "vibe-plugin", "qoder", "qwencode", "musecode", "reasonix", "codebuff",
  "kiro", "kiro-cli", "kiro-ide", "lettacode", "antigravity-ide", "antigravity-cli", "antigravity-plugin",
  "aiassistant", "androidstudio", "junie", "augmentcode", "augmentcode-plugin", "devin", "devin-plugin", "warp",
  "warpcli", "xum", "replit", "pi", "omp", "zed", "zcode", "zcode-plugin", "pool", "dsh",
];

function fakeHost(
  files: string[],
  pathEntries: string[] = [],
  versions: Record<string, string> = {},
  directoryEntries: Record<string, string[]> = {},
) {
  const normalize = (path: string) => resolve(path).replaceAll("\\", "/").toLowerCase();
  const set = new Set(files.map(normalize));
  const directories = new Map(Object.entries(directoryEntries).map(([path, names]) => [normalize(path), names]));
  return makeDetectorHost({
    homeDir: "C:/Users/tester",
    projectRoot: "C:/work/project",
    env: { PATH: "", PATHEXT: ".EXE;.CMD" },
    platform: "win32",
    pathEntries,
    pathExts: [".EXE", ".CMD"],
    commandVersion: (command) => versions[command],
    exists: (path) => set.has(normalize(path)),
    readDirectory: (path) => directories.get(normalize(path)) ?? [],
  });
}

describe("Rulesync target registry", () => {
  it("contains every native target in Rulesync 43.10.0", () => {
    assert.deepEqual(getNativeTargetIds(), expectedRulesyncTargets);
  });

  it("matches the pinned Rulesync CLI's supported target table", () => {
    const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const rulesyncCli = join(projectRoot, "node_modules", "rulesync", "dist", "cli", "index.js");
    const result = spawnSync(process.execPath, [rulesyncCli, "docs", "reference/supported-tools"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const supportedIds = [...result.stdout.matchAll(/^\|\s*[^|]+?\s*\|\s*([a-z0-9-]+)\s*\|/gm)]
      .map((match) => match[1])
      .filter((id) => id !== "--targets" && !id.startsWith("-"));
    assert.deepEqual(getNativeTargetIds(), supportedIds);
  });

  it("detects agents from user config directories and Windows executables", () => {
    const host = fakeHost([
      "C:/Users/tester/.claude",
      "C:/bin/codex.CMD",
    ], ["C:/bin"]);
    const result = detectTargets(host);

    assert.ok(result.targetIds.includes("claudecode"));
    assert.ok(result.targetIds.includes("codexcli"));
    assert.ok(!result.targetIds.includes("agentsmd"));
    assert.ok(!result.targetIds.includes("agentsskills"));
  });

  it("detects open standards only when their files or directories exist", () => {
    const host = fakeHost([
      "C:/work/project/AGENTS.md",
      "C:/Users/tester/.agents/skills",
    ]);
    const result = detectTargets(host);

    assert.deepEqual(result.targetIds, ["agentsmd", "agentsskills"]);
  });

  it("selects configured plugin targets only in project mode", () => {
    const host = fakeHost(["C:/Users/tester/.claude"]);
    const local = detectTargets(host, false, ["claudecode-plugin"]);
    const global = detectTargets(host, true, ["claudecode-plugin"]);

    assert.ok(local.targetIds.includes("claudecode-plugin"));
    assert.ok(global.globalUnavailable.includes("Claude Code plugin"));
    assert.ok(!global.targetIds.includes("claudecode-plugin"));
  });

  it("skips plugin targets whose manifests exist but are not configured", () => {
    const host = fakeHost([
      "C:/Users/tester/.claude",
      "C:/work/project/.claude-plugin/plugin.json",
      "C:/work/project/.kimi-plugin/plugin.json",
    ]);
    const result = detectTargets(host, false, ["claudecode", "kimi-code"]);

    assert.deepEqual(result.targetIds, ["claudecode"]);
    assert.deepEqual(result.detected, ["Claude Code"]);
    assert.deepEqual(result.skippedPlugins, ["Claude Code plugin", "Kimi Code plugin"]);
  });

  it("avoids mutually exclusive deprecated and replacement targets", () => {
    const host = fakeHost([
      "C:/Users/tester/.roo",
      "C:/Users/tester/.kiro",
      "C:/bin/zoocode.exe",
      "C:/bin/kiro-cli.exe",
    ], ["C:/bin"]);
    const result = detectTargets(host);

    assert.ok(result.targetIds.includes("zoocode"));
    assert.ok(!result.targetIds.includes("roo"));
    assert.ok(result.targetIds.includes("kiro-cli"));
    assert.ok(!result.targetIds.includes("kiro"));
    assert.deepEqual(result.ambiguous, []);
  });

  it("reports shared config roots as ambiguous instead of guessing the product", () => {
    const host = fakeHost([
      "C:/Users/tester/.kiro",
      "C:/Users/tester/.roo",
      "C:/Users/tester/.config/opencode",
      "C:/Users/tester/.gemini",
      "C:/Users/tester/.warp",
      "C:/Users/tester/.tabnine",
    ]);
    const result = detectTargets(host);

    assert.deepEqual(result.targetIds, []);
    assert.ok(result.ambiguous.includes("Kiro CLI vs Kiro IDE"));
    assert.ok(result.ambiguous.includes("Roo Code vs Zoo Code"));
    assert.ok(result.ambiguous.includes("OpenCode V1 vs OpenCode (shared configuration directory)"));
    assert.ok(result.ambiguous.includes("Antigravity CLI vs IDE (or Gemini CLI)"));
    assert.ok(result.ambiguous.includes("Warp vs Warp Agent CLI"));
    assert.ok(result.ambiguous.includes("Tabnine CLI version"));
  });

  it("uses the OpenCode executable version to choose the matching native target", () => {
    const configPath = "C:/Users/tester/.config/opencode";
    const v1 = detectTargets(fakeHost([configPath, "C:/bin/opencode.exe"], ["C:/bin"], { opencode: "OpenCode v1.9.4" }));
    const v2 = detectTargets(fakeHost([configPath, "C:/bin/opencode.exe"], ["C:/bin"], { opencode: "OpenCode v2.3.0" }));

    assert.ok(v1.targetIds.includes("opencodev1"));
    assert.ok(!v1.targetIds.includes("opencode"));
    assert.ok(v2.targetIds.includes("opencode"));
    assert.ok(!v2.targetIds.includes("opencodev1"));
    assert.deepEqual(v1.ambiguous, []);
    assert.deepEqual(v2.ambiguous, []);
  });

  it("detects the Kiro IDE from its app installation path", () => {
    const result = detectTargets(fakeHost(["C:/Users/tester/AppData/Local/Programs/Kiro"]));
    assert.ok(result.targetIds.includes("kiro-ide"));
    assert.ok(!result.targetIds.includes("kiro-cli"));
  });

  it("detects Roo Code from its installed VS Code extension marker", () => {
    const extensionDir = "C:/Users/tester/.vscode/extensions";
    const result = detectTargets(fakeHost([], [], {}, {
      [extensionDir]: ["rooveterinaryinc.roo-cline-3.40.0"],
    }));

    assert.ok(result.targetIds.includes("roo"));
    assert.ok(!result.ambiguous.includes("Roo Code vs Zoo Code"));
  });

  it("reports detected tools without a native Rulesync target", () => {
    const host = fakeHost(["C:/Users/tester/.openhands"]);
    const result = detectTargets(host);

    assert.deepEqual(result.unsupported, ["OpenHands"]);
    assert.deepEqual(result.targetIds, []);
  });

  it("uses project plugin roots rather than user paths to report skipped plugins", () => {
    const host = fakeHost(["C:/work/project/.zcode-plugin/plugin.json", "C:/Users/tester/.kimi-plugin/plugin.json"]);
    const result = detectTargets(host);

    assert.deepEqual(result.targetIds, []);
    assert.deepEqual(result.skippedPlugins, ["ZCode plugin"]);
  });
});
