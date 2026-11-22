import { parse, printParseErrorCode, type ParseError } from "jsonc-parser";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

export interface RulesyncConfig {
  sources?: unknown;
  [key: string]: unknown;
}

export interface DeploymentOptions {
  root: string;
  global: boolean;
  targets: string[];
  config: RulesyncConfig;
  localConfig?: RulesyncConfig;
}

export type RulesyncCommand = string[];

export interface CommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

export type CommandRunner = (args: string[], cwd: string) => CommandResult;

export function parseRulesyncConfig(contents: string, fileName: string): RulesyncConfig {
  const errors: ParseError[] = [];
  const parsed = parse(contents.replace(/^\uFEFF/, ""), errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    const detail = errors.map((error) => printParseErrorCode(error.error)).join(", ");
    throw new Error(`${fileName} is not valid JSONC (${detail}).`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${fileName} must contain a JSON object.`);
  }
  return parsed as RulesyncConfig;
}

export function hasDeclaredSources(config: RulesyncConfig, localConfig?: RulesyncConfig): boolean {
  const hasSources = (value: RulesyncConfig | undefined): boolean => Array.isArray(value?.sources) && value.sources.length > 0;
  return hasSources(config) || hasSources(localConfig);
}

function hasFileNamed(directory: string, name: string): boolean {
  if (!existsSync(directory)) return false;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isFile() && (name === ".md"
      ? entry.name.toLowerCase().endsWith(name)
      : entry.name.toLowerCase() === name.toLowerCase())) return true;
    if (entry.isDirectory() && hasFileNamed(path, name)) return true;
  }
  return false;
}

export function includeStandardTargets(
  targets: string[],
  root: string,
  global: boolean,
  config: RulesyncConfig,
  localConfig?: RulesyncConfig,
): string[] {
  const result = new Set(targets);
  const hasRules = hasFileNamed(resolve(root, ".rulesync", "rules"), ".md");
  const hasSkills = hasFileNamed(resolve(root, ".rulesync", "skills"), "SKILL.md")
    || [config, localConfig].some((value) => Array.isArray(value?.sources)
      && value.sources.some((source) => source !== null && typeof source === "object"
        && "skills" in source && Array.isArray(source.skills) && source.skills.length > 0));
  if (hasRules && !global) result.add("agentsmd");
  if (hasSkills) result.add("agentsskills");
  return [...result];
}

export function buildRulesyncCommands(options: DeploymentOptions): RulesyncCommand[] {
  const targets = options.targets.join(",");
  const commands: RulesyncCommand[] = [];
  if (hasDeclaredSources(options.config, options.localConfig)) {
    commands.push(["install", "--frozen"]);
  }

  const generate = ["generate", "--targets", targets];
  if (options.global) generate.push("--global");
  commands.push(generate);

  if (!options.global) {
    commands.push(["gitignore", "--targets", targets, "--features", "*"]);
  }
  return commands;
}

export function validateRulesyncProject(root: string): { config: RulesyncConfig; localConfig?: RulesyncConfig } {
  const configPath = resolve(root, "rulesync.jsonc");
  const sourcePath = resolve(root, ".rulesync");
  if (!existsSync(configPath)) {
    throw new Error(`No rulesync.jsonc found in ${root}. Run this from a Rulesync project or pass --root <project>.`);
  }
  if (!existsSync(sourcePath)) {
    throw new Error(`No .rulesync source directory found in ${root}.`);
  }

  const config = parseRulesyncConfig(readFileSync(configPath, "utf8"), "rulesync.jsonc");
  const localConfigPath = resolve(root, "rulesync.local.jsonc");
  const localConfig = existsSync(localConfigPath)
    ? parseRulesyncConfig(readFileSync(localConfigPath, "utf8"), "rulesync.local.jsonc")
    : undefined;
  return { config, localConfig };
}

export function runRulesyncCommands(commands: RulesyncCommand[], root: string, runner: CommandRunner): void {
  for (const args of commands) {
    const result = runner(args, root);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) throw new Error(`Could not run rulesync ${args.join(" ")}: ${result.error.message}`);
    if (result.status !== 0) {
      throw new Error(`rulesync ${args.join(" ")} exited with status ${String(result.status)}.`);
    }
  }
}

// Rulesync's exports do not include package.json, so look for the package
// directory along Node's module search paths, which covers nested and hoisted
// installs.
export function resolveRulesyncCli(fromUrl: string | URL = import.meta.url): string {
  for (const directory of createRequire(fromUrl).resolve.paths("rulesync") ?? []) {
    const packageRoot = join(directory, "rulesync");
    const manifestPath = join(packageRoot, "package.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { bin?: string | Record<string, string> };
    const bin = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.rulesync;
    if (!bin) throw new Error(`${manifestPath} does not declare a rulesync executable.`);
    return resolve(packageRoot, bin);
  }
  throw new Error("Could not find the rulesync package.");
}

export function runPinnedRulesync(args: string[], cwd: string): CommandResult {
  const cliPath = resolveRulesyncCli();
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    ...(result.error ? { error: result.error } : {}),
  };
}
