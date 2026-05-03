import type { Client, Interaction } from "discord.js";
import { executeSlashCommands } from "../feature/slashCommands";

export function dispatchOnInteractionCreate(client: Client) {
  client.on("interactionCreate", async (interaction: Interaction) => {
    executeSlashCommands(interaction);
  });
}
