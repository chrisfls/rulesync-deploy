import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolve } from "node:path";
import { parseArgs } from "./cli.mts";

describe("CLI arguments", () => {
  it("defaults to project deployment from the current directory", () => {
    assert.deepEqual(parseArgs([], "C:/work/project"), { root: "C:/work/project", global: false });
  });

  it("accepts a selected project root and global scope", () => {
    assert.deepEqual(parseArgs(["--global", "--root", "../shared-rules"], "C:/work/project"), {
      root: resolve("C:/work/shared-rules"),
      global: true,
    });
  });

  it("shows help without interpreting later arguments", () => {
    assert.equal(parseArgs(["--help", "--unknown"]), "help");
  });

  it("rejects incomplete and unknown arguments", () => {
    assert.throws(() => parseArgs(["--root"]), /requires a directory path/);
    assert.throws(() => parseArgs(["--unknown"]), /Unknown option/);
  });
});
