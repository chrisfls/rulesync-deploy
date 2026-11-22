import { delimiter, join, resolve } from "node:path";
import { accessSync, constants, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";

export type TargetKind = "agent" | "standard" | "plugin";

export interface TargetDefinition {
  id: string;
  name: string;
  kind: TargetKind;
  commands?: string[];
  homePaths?: string[];
  homePathPrefixes?: Array<{ directory: string; prefix: string }>;
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
  { id: "opencode", name: "OpenCode", kind: "agent" },
  { id: "opencodev1", name: "OpenCode V1", kind: "agent", homePaths: [".config/opencode-v1"] },
  { id: "openclaw", name: "OpenClaw", kind: "agent", commands: ["openclaw"], homePaths: [".openclaw"] },
  { id: "mimocode", name: "MiMo Code", kind: "agent", commands: ["mimocode"], homePaths: [".config/mimocode"] },
  { id: "gitlabduo", name: "GitLab Duo CLI", kind: "agent", commands: ["glab"], homePaths: [".config/glab-cli"] },
  { id: "cline", name: "Cline", kind: "agent", commands: [], homePaths: ["Documents/Cline", ".config/Cline"] },
  { id: "kilo", name: "Kilo Code", kind: "agent", commands: ["kilo"], homePaths: [".kilocode", ".config/kilo"] },
  { id: "kimi-code", name: "Kimi Code", kind: "agent", commands: ["kimi"], homePaths: [".kimi", ".config/kimi"] },
  { id: "kimi-code-plugin", name: "Kimi Code plugin", kind: "plugin", projectPaths: [".kimi-plugin/plugin.json", ".kimi-plugin/marketplace.json"] },
  { id: "roo", name: "Roo Code", kind: "agent", homePathPrefixes: [
    { directory: ".vscode/extensions", prefix: "rooveterinaryinc.roo-cline-" },
    { directory: ".vscode-insiders/extensions", prefix: "rooveterinaryinc.roo-cline-" },
  ] },
  { id: "zoocode", name: "Zoo Code", kind: "agent", commands: ["zoocode", "zoo"], homePaths: [".config/zoocode", "AppData/Local/Programs/Zoo Code"] },
  { id: "rovodev", name: "Rovo Dev", kind: "agent", commands: ["rovodev"], homePaths: [".rovodev"] },
  { id: "takt", name: "Takt", kind: "agent", commands: ["takt"], homePaths: [".takt"] },
  { id: "trae", name: "Trae", kind: "agent", commands: [], homePaths: [".trae"] },
  { id: "tabnine", name: "Tabnine CLI", kind: "agent", commands: ["tabnine-legacy"], homePaths: [".tabnine/legacy"] },
  { id: "continue", name: "Continue", kind: "agent", commands: ["cn"], homePaths: [".continue"] },
  { id: "cortexcode", name: "Snowflake Cortex Code", kind: "agent", commands: ["cortex"], homePaths: [".snowflake/cortex"] },
  { id: "vibe", name: "Vibe Code", kind: "agent", commands: ["vibe"], homePaths: [".vibe"] },
  { id: "vibe-plugin", name: "Vibe Code plugin", kind: "plugin", projectPaths: [".vibe/plugins"] },
  { id: "qoder", name: "Qoder", kind: "agent", commands: ["qoder"], homePaths: [".qoder"] },
  { id: "qwencode", name: "Qwen Code", kind: "agent", commands: ["qwen"], homePaths: [".qwen"] },
  { id: "musecode", name: "Meta Muse Code", kind: "agent", commands: ["muse"], homePaths: [".muse"] },
  { id: "reasonix", name: "Reasonix", kind: "agent", commands: ["reasonix"], homePaths: [".reasonix"] },
  { id: "codebuff", name: "Codebuff", kind: "agent", commands: ["codebuff"], homePaths: [".codebuff"] },
  { id: "kiro", name: "Kiro (legacy target)", kind: "agent", commands: ["kiro"] },
  { id: "kiro-cli", name: "Kiro CLI", kind: "agent", commands: ["kiro-cli"] },
  { id: "kiro-ide", name: "Kiro IDE", kind: "agent", homePaths: ["AppData/Local/Programs/Kiro", "Applications/Kiro.app", ".local/share/kiro"] },
  { id: "lettacode", name: "Letta Code", kind: "agent", commands: ["letta"], homePaths: [".letta"] },
  { id: "antigravity-ide", name: "Google Antigravity IDE", kind: "agent", commands: ["antigravity"], homePaths: ["AppData/Local/Programs/Antigravity IDE", "Applications/Antigravity IDE.app", ".local/share/antigravity-ide"] },
  { id: "antigravity-cli", name: "Google Antigravity CLI", kind: "agent", commands: ["agy"] },
  { id: "antigravity-plugin", name: "Google Antigravity plugin", kind: "plugin", projectPaths: [".antigravity-plugin/plugin.json"] },
  { id: "aiassistant", name: "JetBrains AI Assistant", kind: "agent", commands: [], homePaths: ["AppData/Roaming/JetBrains", ".config/JetBrains"] },
  { id: "androidstudio", name: "Gemini in Android Studio", kind: "agent", commands: [], homePaths: ["AppData/Roaming/Google/AndroidStudio", ".config/Google/AndroidStudio"] },
  { id: "junie", name: "JetBrains Junie", kind: "agent", commands: ["junie"], homePaths: [".junie", "AppData/Roaming/JetBrains"] },
  { id: "augmentcode", name: "AugmentCode", kind: "agent", commands: ["augment"], homePaths: [".augment"] },
  { id: "augmentcode-plugin", name: "AugmentCode plugin", kind: "plugin", projectPaths: [".augment-plugin/plugin.json"] },
  { id: "devin", name: "Devin Desktop", kind: "agent", commands: ["devin"], homePaths: [".devin"] },
  { id: "devin-plugin", name: "Devin plugin", kind: "plugin", projectPaths: [".devin-plugin/plugin.json"] },
  { id: "warp", name: "Warp", kind: "agent", commands: [], homePaths: ["AppData/Local/Programs/Warp", "Applications/Warp.app", ".local/share/warp"] },
  { id: "warpcli", name: "Warp Agent CLI", kind: "agent", commands: ["warp-cli"], homePaths: [".config/warp-cli"] },
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
  commandVersion: (command: string) => string | undefined;
  readDirectory: (path: string) => string[];
}

export interface DetectionResult {
  targetIds: string[];
  detected: string[];
  unsupported: string[];
  globalUnavailable: string[];
  ambiguous: string[];
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

function directoryHasPrefix(host: DetectorHost, relativeDirectory: string, prefix: string): boolean {
  const directory = expandHomePath(host, relativeDirectory);
  try {
    return host.readDirectory(directory).some((name) => name.toLowerCase().startsWith(prefix.toLowerCase()));
  } catch {
    return false;
  }
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
  const hasPathPrefix = (target.homePathPrefixes ?? []).some(({ directory, prefix }) => directoryHasPrefix(host, directory, prefix));
  if (hasPathPrefix) return true;
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
  return [...selected];
}

interface AmbiguousConfig {
  label: string;
  homePath: string;
  targets: string[];
}

const AMBIGUOUS_CONFIGS: AmbiguousConfig[] = [
  { label: "Kiro CLI vs Kiro IDE", homePath: ".kiro", targets: ["kiro", "kiro-cli", "kiro-ide"] },
  { label: "Roo Code vs Zoo Code", homePath: ".roo", targets: ["roo", "zoocode"] },
  { label: "Antigravity CLI vs IDE (or Gemini CLI)", homePath: ".gemini", targets: ["antigravity-cli", "antigravity-ide"] },
  { label: "Warp vs Warp Agent CLI", homePath: ".warp", targets: ["warp", "warpcli"] },
  { label: "Tabnine CLI version", homePath: ".tabnine", targets: ["tabnine"] },
];

function detectOpenCode(host: DetectorHost): { target?: string; ambiguous?: string } {
  if (commandFound(host, "opencode")) {
    const version = host.commandVersion("opencode");
    const major = version?.match(/(?:^|\s|v)(\d+)\.\d+/i)?.[1];
    if (major === "1") return { target: "opencodev1" };
    if (major && Number(major) >= 2) return { target: "opencode" };
    return { ambiguous: "OpenCode (version could not be identified)" };
  }
  if (pathExists(host, expandHomePath(host, ".config/opencode-v1"))) return { target: "opencodev1" };
  if (pathExists(host, expandHomePath(host, ".config/opencode"))) {
    return { ambiguous: "OpenCode V1 vs OpenCode (shared configuration directory)" };
  }
  return {};
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
    commandVersion: overrides.commandVersion ?? ((command) => {
      const result = spawnSync(command, ["--version"], {
        encoding: "utf8",
        timeout: 2500,
        windowsHide: true,
        shell: platform === "win32",
      });
      if (result.error || result.status !== 0) return undefined;
      return `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    }),
    readDirectory: overrides.readDirectory ?? ((directory) => readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)),
    exists: overrides.exists ?? ((candidate) => {
      accessSync(candidate, constants.F_OK);
      return true;
    }),
  };
}

export function detectTargets(host = makeDetectorHost(), global = false): DetectionResult {
  const openCode = detectOpenCode(host);
  const found = TARGETS.filter((target) => target.id !== "opencode" && target.id !== "opencodev1" && targetDetected(host, target));
  const ids = resolveTargetAliases([...found.map((target) => target.id), ...(openCode.target ? [openCode.target] : [])]);
  const globalUnavailable = global ? ids.filter((id) => projectOnlyIds.has(id)) : [];
  const installable = global ? ids.filter((id) => !projectOnlyIds.has(id)) : [...ids];
  const targetIds = [...new Set(installable)];
  const unsupported = UNSUPPORTED_HARNESSES.filter((entry) => unsupportedDetected(host, entry)).map((entry) => entry.name);
  const detectedIds = new Set(ids);
  const ambiguous = AMBIGUOUS_CONFIGS
    .filter((candidate) => pathExists(host, expandHomePath(host, candidate.homePath))
      && !candidate.targets.some((id) => detectedIds.has(id)))
    .map((candidate) => candidate.label);
  if (openCode.ambiguous) ambiguous.push(openCode.ambiguous);
  const byId = new Map(TARGETS.map((target) => [target.id, target.name]));
  return {
    targetIds,
    detected: ids.map((id) => byId.get(id) ?? id),
    unsupported,
    globalUnavailable: globalUnavailable.map((id) => byId.get(id) ?? id),
    ambiguous,
  };
}

export function getNativeTargetIds(): string[] {
  return TARGETS.map((target) => target.id);
}
