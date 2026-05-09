import type * as ChildProcess from "node:child_process";
import type * as Fs from "node:fs";
import type * as Path from "node:path";
import type * as Process from "node:process";

const processModule = require("node:process") as typeof Process;
const fs = require("node:fs") as typeof Fs;
const childProcess = require("node:child_process") as typeof ChildProcess;
const path = require("node:path") as typeof Path;

type Command = {
  command: string;
  args: string[];
  input?: string;
};

const args = new Set(process.argv.slice(2));
const dryRun =
  args.has("--dry-run") ||
  processModule.env.DRY_RUN === "true" ||
  processModule.env.DRY_RUN === "1";
const pruneImages =
  args.has("--prune") ||
  processModule.env.PRUNE_IMAGES === "true" ||
  processModule.env.PRUNE_IMAGES === "1";

const appDir = path.resolve(processModule.env.APP_DIR ?? processModule.cwd());
const composeFile = processModule.env.COMPOSE_FILE ?? "compose.yml";
const imageName = processModule.env.IMAGE_NAME ?? "ghcr.io/tempestif/botchanjs";
const imageTag = processModule.env.IMAGE_TAG;
const registryHost = processModule.env.REGISTRY_HOST ?? imageName.split("/")[0];
const registryUsername = processModule.env.REGISTRY_USERNAME;
const registryToken = processModule.env.REGISTRY_TOKEN;

main();

function main() {
  validate();
  processModule.chdir(appDir);

  log(`App directory: ${appDir}`);
  log(`Compose file: ${composeFile}`);
  log(`Image: ${imageName}:${imageTag}`);
  log(`Mode: ${dryRun ? "dry-run" : "deploy"}`);

  const commands: Command[] = [];
  if (registryUsername && registryToken) {
    commands.push({
      command: "docker",
      args: ["login", registryHost, "--username", registryUsername, "--password-stdin"],
      input: registryToken,
    });
  }

  commands.push(
    { command: "docker", args: ["compose", "--file", composeFile, "pull", "bot"] },
    { command: "docker", args: ["compose", "--file", composeFile, "up", "-d", "bot"] },
  );

  if (pruneImages) {
    commands.push({ command: "docker", args: ["image", "prune", "-f"] });
  }

  for (const command of commands) {
    run(command);
  }

  log("Deploy finished.");
}

function validate() {
  if (!fs.existsSync(appDir)) {
    fail(`APP_DIR does not exist: ${appDir}`);
  }

  const composePath = path.resolve(appDir, composeFile);
  if (!fs.existsSync(composePath)) {
    fail(`Compose file does not exist: ${composePath}`);
  }

  if (!imageTag) {
    fail("IMAGE_TAG is required. Example: IMAGE_TAG=v1.2.3 node scripts/deploy.ts");
  }

  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(imageTag)) {
    fail(`IMAGE_TAG is invalid: ${imageTag}`);
  }

  if ((registryUsername && !registryToken) || (!registryUsername && registryToken)) {
    fail("REGISTRY_USERNAME and REGISTRY_TOKEN must be provided together.");
  }
}

function run(command: Command) {
  const printable = formatCommand(command);
  log(`${dryRun ? "Would run" : "Running"}: ${printable}`);

  if (dryRun) {
    return;
  }

  const result = childProcess.spawnSync(command.command, command.args, {
    env: {
      ...processModule.env,
      IMAGE_NAME: imageName,
      IMAGE_TAG: imageTag,
    },
    input: command.input,
    stdio: command.input ? ["pipe", "inherit", "inherit"] : "inherit",
  });

  if (result.error) {
    fail(`${printable} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`${printable} exited with status ${result.status ?? "unknown"}`);
  }
}

function formatCommand(command: Command) {
  if (command.input) {
    return `${command.command} ${command.args.join(" ")} < secret`;
  }

  return `${command.command} ${command.args.join(" ")}`;
}

function log(message: string) {
  console.log(`[deploy] ${message}`);
}

function fail(message: string): never {
  console.error(`[deploy] ${message}`);
  processModule.exit(1);
  throw new Error(message);
}
