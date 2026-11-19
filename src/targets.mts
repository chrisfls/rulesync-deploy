import { delimiter, join, resolve } from "node:path";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";

export type TargetKind = "agent" | "standard" | "plugin";

export interface TargetDefinition {
  id: string;
  name: string;
  kind: TargetKind;
  commands?: string[];
  homePaths?: string[];
  projectPaths?: string[];
}

// Keep this list aligned with Rulesync's Supported Tools reference. Plugin
// targets are project-scoped because Rulesync requires a plugin output root.
export const TARGETS: TargetDefinition[] = [
  { id: "agentsmd", name: "AGENTS.md", kind: "standard", projectPaths: ["AGENTS.md"] },
  { id: "agentsskills", name: "AgentsSkills", kind: "standard", homePaths: [".agents/skills"] },
  { id: "amp", name: "Amp", kind: "agent", commands: ["amp"], homePaths: [".config/amp"] },
  { id: "bob", name: "IBM Bob", kind: "agent", commands: ["bob"], homePaths: [".bob"] },
  { id: "claudecode", name: "Claude Code", kind: "agent", commands: ["claude"], homePaths: [".claude"] },
  { id: "claudecode-plugin", name: "Claude Code plugin", kind: "plugin", projectPaths: [".claude-plugin/plugin.json", ".claude-plugin/marketplace.json"] },
  { id: "codebuddy", name: "CodeBuddy Code", kind: "agent", commands: ["codebuddy"], homePaths: [".codebuddy"] },
  { id: "codewhale", name: "Codewhale", kind: "agent", commands: ["codewhale"], homePaths: [".codewhale"] },
  { id: "codexcli", name: "Codex CLI", kind: "agent", commands: ["codex"], homePaths: [".codex"] },
  { id: "commandcode", name: "Command Code", kind: "agent", commands: ["commandcode"], homePaths: [".commandcode"] },
  { id: "copilot", name: "GitHub Copilot", kind: "agent", commands: [], homePaths: ["AppData/Roaming/Code/User/globalStorage/github.copilot-chat", ".config/Code/User/globalStorage/github.copilot-chat"] },
  { id: "copilotcli", name: "GitHub Copilot CLI", kind: "agent", commands: ["copilot"], homePaths: [".copilot"] },
  { id: "crush", name: "Crush", kind: "agent", commands: ["crush"], homePaths: [".config/crush"] },
  { id: "goose", name: "Goose", kind: "agent", commands: ["goose"], homePaths: [".config/goose"] },
  { id: "hermesagent", name: "Hermes Agent", kind: "agent", commands: ["hermes"], homePaths: [".hermes", ".config/hermes"] },
  { id: "grokcli", name: "Grok CLI", kind: "agent", commands: ["grok"], homePaths: [".config/grok"] },
  { id: "cursor", name: "Cursor", kind: "agent", commands: ["cursor", "cursor-agent"], homePaths: [".cursor"] },
  { id: "deepagents", name: "deepagents-cli", kind: "agent", commands: ["dcode", "deepagents"], homePaths: [".deepagents"] },
  { id: "factorydroid", name: "Factory Droid", kind: "agent", commands: ["droid"], homePaths: [".factory"] },
  { id: "firebender", name: "Firebender", kind: "agent", commands: ["firebender"], homePaths: [".firebender"] },
  { id: "opencode", name: "OpenCode", kind: "agent", commands: ["opencode"], homePaths: [".config/opencode"] },
  { id: "opencodev1", name: "OpenCode V1", kind: "agent", commands: [], homePaths: [".config/opencode-v1"] },
  { id: "openclaw", name: "OpenClaw", kind: "agent", commands: ["openclaw"], homePaths: [".openclaw"] },
  { id: "mimocode", name: "MiMo Code", kind: "agent", commands: ["mimocode"], homePaths: [".config/mimocode"] },
  { id: "gitlabduo", name: "GitLab Duo CLI", kind: "agent", commands: ["glab"], homePaths: [".config/glab-cli"] },
  { id: "cline", name: "Cline", kind: "agent", commands: [], homePaths: ["Documents/Cline", ".config/Cline"] },
  { id: "kilo", name: "Kilo Code", kind: "agent", commands: ["kilo"], homePaths: [".kilocode", ".config/kilo"] },
  { id: "kimi-code", name: "Kimi Code", kind: "agent", commands: ["kimi"], homePaths: [".kimi", ".config/kimi"] },
  { id: "kimi-code-plugin", name: "Kimi Code plugin", kind: "plugin", projectPaths: [".kimi-plugin/plugin.json", ".kimi-plugin/marketplace.json"] },
  { id: "roo", name: "Roo Code", kind: "agent", commands: [], homePaths: [".roo"] },
  { id: "zoocode", name: "Zoo Code", kind: "agent", commands: ["zoocode", "zoo"], homePaths: [".roo"] },
  { id: "rovodev", name: "Rovo Dev", kind: "agent", commands: ["rovodev"], homePaths: [".rovodev"] },
  { id: "takt", name: "Takt", kind: "agent", commands: ["takt"], homePaths: [".takt"] },
  { id: "trae", name: "Trae", kind: "agent", commands: [], homePaths: [".trae"] },
  { id: "tabnine", name: "Tabnine CLI", kind: "agent", commands: ["tabnine", "tabnine-legacy"], homePaths: [".tabnine"] },
  { id: "continue", name: "Continue", kind: "agent", commands: ["cn"], homePaths: [".continue"] },
  { id: "cortexcode", name: "Snowflake Cortex Code", kind: "agent", commands: ["cortex"], homePaths: [".snowflake/cortex"] },
  { id: "vibe", name: "Vibe Code", kind: "agent", commands: ["vibe"], homePaths: [".vibe"] },
  { id: "vibe-plugin", name: "Vibe Code plugin", kind: "plugin", projectPaths: [".vibe/plugins"] },
  { id: "qoder", name: "Qoder", kind: "agent", commands: ["qoder"], homePaths: [".qoder"] },
  { id: "qwencode", name: "Qwen Code", kind: "agent", commands: ["qwen"], homePaths: [".qwen"] },
  { id: "musecode", name: "Meta Muse Code", kind: "agent", commands: ["muse"], homePaths: [".muse"] },
  { id: "reasonix", name: "Reasonix", kind: "agent", commands: ["reasonix"], homePaths: [".reasonix"] },
  { id: "codebuff", name: "Codebuff", kind: "agent", commands: ["codebuff"], homePaths: [".codebuff"] },
  { id: "kiro", name: "Kiro (legacy target)", kind: "agent", commands: ["kiro"], homePaths: [".kiro"] },
  { id: "kiro-cli", name: "Kiro CLI", kind: "agent", commands: ["kiro-cli"], homePaths: [".kiro"] },
  { id: "kiro-ide", name: "Kiro IDE", kind: "agent", commands: [], homePaths: [".kiro"] },
  { id: "lettacode", name: "Letta Code", kind: "agent", commands: ["letta"], homePaths: [".letta"] },
  { id: "antigravity-ide", name: "Google Antigravity IDE", kind: "agent", commands: [], homePaths: [".gemini"] },
  { id: "antigravity-cli", name: "Google Antigravity CLI", kind: "agent", commands: ["agy"], homePaths: [".gemini/antigravity-cli"] },
  { id: "antigravity-plugin", name: "Google Antigravity plugin", kind: "plugin", projectPaths: [".antigravity-plugin/plugin.json"] },
  { id: "aiassistant", name: "JetBrains AI Assistant", kind: "agent", commands: [], homePaths: ["AppData/Roaming/JetBrains", ".config/JetBrains"] },
  { id: "androidstudio", name: "Gemini in Android Studio", kind: "agent", commands: [], homePaths: ["AppData/Roaming/Google/AndroidStudio", ".config/Google/AndroidStudio"] },
  { id: "junie", name: "JetBrains Junie", kind: "agent", commands: ["junie"], homePaths: [".junie", "AppData/Roaming/JetBrains"] },
  { id: "augmentcode", name: "AugmentCode", kind: "agent", commands: ["augment"], homePaths: [".augment"] },
  { id: "augmentcode-plugin", name: "AugmentCode plugin", kind: "plugin", projectPaths: [".augment-plugin/plugin.json"] },
  { id: "devin", name: "Devin Desktop", kind: "agent", commands: ["devin"], homePaths: [".devin"] },
  { id: "devin-plugin", name: "Devin plugin", kind: "plugin", projectPaths: [".devin-plugin/plugin.json"] },
  { id: "warp", name: "Warp", kind: "agent", commands: ["warp"], homePaths: [".warp"] },
  { id: "warpcli", name: "Warp Agent CLI", kind: "agent", commands: ["warp", "warp-cli"], homePaths: [".warp"] },
  { id: "xum", name: "Xum", kind: "agent", commands: ["xum"], homePaths: [".xum"] },
  { id: "replit", name: "Replit", kind: "agent", commands: ["replit"], homePaths: [".replit"] },
  { id: "pi", name: "Pi Coding Agent", kind: "agent", commands: ["pi"], homePaths: [".pi"] },
  { id: "omp", name: "oh-my-pi", kind: "agent", commands: ["omp"], homePaths: [".omp"] },
  { id: "zed", name: "Zed", kind: "agent", commands: ["zed"], homePaths: [".config/zed"] },
  { id: "zcode", name: "ZCode", kind: "agent", commands: ["zcode"], homePaths: [".config/zcode"] },
  { id: "zcode-plugin", name: "ZCode plugin", kind: "plugin", projectPaths: [".zcode-plugin/plugin.json"] },
  { id: "pool", name: "Pool (Poolside)", kind: "agent", commands: ["pool"], homePaths: [".pool"] },
  { id: "dsh", name: "DeepSeek Harness", kind: "agent", commands: ["dsh"], homePaths: [".config/dsh"] },
];

export interface DetectorHost {
  homeDir: string;
  projectRoot: string;
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  exists: (path: string) => boolean;
  pathEntries: string[];
  pathExts: string[];
}

export interface DetectionResult {
  targetIds: string[];
  detected: string[];
  unsupported: string[];
  globalUnavailable: string[];
}

const UNSUPPORTED_HARNESSES = [
  { name: "Aider", commands: ["aider"], homePaths: [".aider"] },
  { name: "OpenHands", commands: ["openhands"], homePaths: [".openhands"] },
  { name: "CodeArts Agent", commands: ["codeartsdoer"], homePaths: [".codeartsdoer"] },
] as const;

const projectOnlyIds = new Set([...TARGETS.filter((target) => target.kind === "plugin").map((target) => target.id), "agentsmd"]);

function pathExists(host: DetectorHost, filePath: string): boolean {
  try {
    return host.exists(filePath);
  } catch {
    return false;
  }
}

function expandHomePath(host: DetectorHost, relativePath: string): string {
  return resolve(host.homeDir, relativePath);
}

function commandFound(host: DetectorHost, command: string): boolean {
  const suffixes = host.platform === "win32" ? ["", ...host.pathExts] : [""];
  for (const directory of host.pathEntries) {
    for (const suffix of suffixes) {
      if (pathExists(host, join(directory, `${command}${suffix}`))) return true;
    }
  }
  return false;
}

function targetDetected(host: DetectorHost, target: TargetDefinition): boolean {
  if (target.kind === "plugin") {
    return (target.projectPaths ?? []).some((candidate) => pathExists(host, resolve(host.projectRoot, candidate)));
  }
  if (target.kind === "standard") {
    const projectPaths = (target.projectPaths ?? []).map((candidate) => resolve(host.projectRoot, candidate));
    const homePaths = (target.homePaths ?? []).map((candidate) => expandHomePath(host, candidate));
    return [...projectPaths, ...homePaths].some((candidate) => pathExists(host, candidate));
  }

  const homePaths = (target.homePaths ?? []).map((path) => expandHomePath(host, path));
  const envPaths = target.id === "copilot"
    ? [host.env.APPDATA, host.env.XDG_CONFIG_HOME].filter((value): value is string => Boolean(value)).map((base) => join(base, "Code", "User", "globalStorage", "github.copilot-chat"))
    : [];
  if ([...homePaths, ...envPaths].some((candidate) => pathExists(host, candidate))) return true;
  return (target.commands ?? []).some((command) => commandFound(host, command));
}

function unsupportedDetected(host: DetectorHost, entry: typeof UNSUPPORTED_HARNESSES[number]): boolean {
  if (entry.homePaths.some((path) => pathExists(host, expandHomePath(host, path)))) return true;
  return entry.commands.some((command) => commandFound(host, command));
}

function resolveTargetAliases(ids: string[]): string[] {
  const selected = new Set(ids);
  if (selected.has("zoocode")) selected.delete("roo");
  if (selected.has("kiro-cli") || selected.has("kiro-ide")) selected.delete("kiro");
  // OpenCode 2.x is the current native target. Select the legacy target only
  // when its distinct legacy config root is present.
  if (selected.has("opencode") && selected.has("opencodev1")) selected.delete("opencodev1");
  return [...selected];
}

export function makeDetectorHost(overrides: Partial<DetectorHost> = {}): DetectorHost {
  const env = overrides.env ?? process.env;
  const platform = overrides.platform ?? process.platform;
  const pathValue = env.PATH ?? "";
  const pathEntries = overrides.pathEntries ?? pathValue.split(delimiter).filter(Boolean);
  const pathExts = overrides.pathExts ?? (platform === "win32" ? (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean) : []);
  const homeDir = overrides.homeDir ?? homedir();
  const projectRoot = overrides.projectRoot ?? process.cwd();
  return {
    homeDir,
    projectRoot,
    env,
    platform,
    pathEntries,
    pathExts,
    exists: overrides.exists ?? ((candidate) => {
      accessSync(candidate, constants.F_OK);
      return true;
    }),
  };
}

export function detectTargets(host = makeDetectorHost(), global = false): DetectionResult {
  const found = TARGETS.filter((target) => targetDetected(host, target));
  const ids = resolveTargetAliases(found.map((target) => target.id));
  const globalUnavailable = global ? ids.filter((id) => projectOnlyIds.has(id)) : [];
  const installable = global ? ids.filter((id) => !projectOnlyIds.has(id)) : [...ids];
  const targetIds = [...new Set(installable)];
  const unsupported = UNSUPPORTED_HARNESSES.filter((entry) => unsupportedDetected(host, entry)).map((entry) => entry.name);
  const byId = new Map(TARGETS.map((target) => [target.id, target.name]));
  return {
    targetIds,
    detected: ids.map((id) => byId.get(id) ?? id),
    unsupported,
    globalUnavailable: globalUnavailable.map((id) => byId.get(id) ?? id),
  };
}

export function getNativeTargetIds(): string[] {
  return TARGETS.map((target) => target.id);
}
