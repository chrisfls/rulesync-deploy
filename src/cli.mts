import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { detectTargets, makeDetectorHost } from "./targets.mts";
import {
  buildRulesyncCommands,
  includeStandardTargets,
  runPinnedRulesync,
  runRulesyncCommands,
  validateRulesyncProject,
} from "./deploy.mts";

interface CliOptions {
  root: string;
  global: boolean;
}

function usage(): string {
  return [
    "Usage: auto-rulesync [--root <rulesync-project>] [--global]",
    "",
    "Detect installed Rulesync targets and deploy the selected project's configuration.",
    "  --root <path>  Rulesync project to deploy (default: current directory)",
    "  --global       Write user-level agent configuration",
    "  --help         Show this help",
  ].join("\n");
}

export function parseArgs(args: string[], cwd = process.cwd()): CliOptions | "help" {
  let root = cwd;
  let global = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") return "help";
    if (arg === "--global") {
      global = true;
      continue;
    }
    if (arg === "--root") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--root requires a directory path.");
      root = resolve(cwd, value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}\n\n${usage()}`);
  }
  return { root, global };
}

export function deploy(options: CliOptions): void {
  const { config, localConfig } = validateRulesyncProject(options.root);
  const detection = detectTargets(makeDetectorHost({ projectRoot: options.root }), options.global);

  if (detection.detected.length > 0) {
    process.stdout.write(`Detected agents: ${detection.detected.join(", ")}\n`);
  }
  if (detection.unsupported.length > 0) {
    process.stdout.write(`Unsupported detected agents (no native Rulesync target): ${detection.unsupported.join(", ")}\n`);
  }
  if (detection.globalUnavailable.length > 0) {
    process.stdout.write(`Skipped project-only targets in global mode: ${detection.globalUnavailable.join(", ")}\n`);
  }
  if (detection.targetIds.length === 0) {
    throw new Error("No supported installed Rulesync targets were detected.");
  }

  const targetIds = includeStandardTargets(detection.targetIds, options.root, options.global, config, localConfig);
  const commands = buildRulesyncCommands({
    root: options.root,
    global: options.global,
    targets: targetIds,
    config,
    localConfig,
  });
  runRulesyncCommands(commands, options.root, runPinnedRulesync);
  process.stdout.write(`auto-rulesync: deployed ${targetIds.length} target(s) ${options.global ? "globally" : "to the project"}.\n`);
}

export function main(): void {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options === "help") {
      process.stdout.write(`${usage()}\n`);
      return;
    }
    deploy(options);
  } catch (error) {
    process.stderr.write(`auto-rulesync: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? "")) main();
