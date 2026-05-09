import { SlashCommandBuilder } from "discord.js";

type SlashCommandInfo = {
  name: string;
  description: string;
  execute: () => void;
};
export type SlashCommand = {
  name: string;
  builder: SlashCommandBuilder;
  execute: () => void;
};
export function defineSlashCommand(slashCommand: SlashCommandInfo): SlashCommand {
  return {
    name: slashCommand.name,
    builder: createSlashCommandBuilder(slashCommand.name, slashCommand.description),
    execute: slashCommand.execute,
  };

  function createSlashCommandBuilder(name: string, description: string) {
    return new SlashCommandBuilder().setName(name).setDescription(description);
  }
}
