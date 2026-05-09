import { defineSlashCommand } from "../defineCommands";

function viewSettingsCommandImpl() {}

export default defineSlashCommand({
  name: "view-settings",
  description: "View current settings",
  execute: viewSettingsCommandImpl,
});
