import { defineSlashCommand } from "../defineCommands";

function helpCommandImpl() {}

export default defineSlashCommand({
  name: "help",
  description: "Display help information",
  execute: helpCommandImpl,
});
