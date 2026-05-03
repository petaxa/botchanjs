import type { Interaction } from "discord.js";
import { REST, Routes } from "discord.js";
import helpCommand from "./commands/help";
import viewSettingsCommand from "./commands/viewSettings";
import type { SlashCommand } from "./defineCommands";

const commands: SlashCommand[] = [helpCommand, viewSettingsCommand];

export function executeSlashCommands(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;

  const commandByName = new Map(commands.map((command) => [command.name, command]));
  const command = commandByName.get(interaction.commandName);
  command?.execute();
}

export async function deploySlashCommands(token: string, clientId: string, guildId: string) {
  const rest = new REST({ version: "10" }).setToken(token);

  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: commands.map((command) => command.builder.toJSON()),
  });
}
