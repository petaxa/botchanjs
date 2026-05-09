import type { Client } from "discord.js";
import { fetchSettings, getSettingChannel, setSettings } from "../feature/settings";
import { deploySlashCommands } from "../feature/slashCommands";

export function dispatchOnReady(client: Client) {
  client.once("ready", async () => {
    console.log("Ready!");
    console.log(client.user?.tag);

    const token = process.env.DISCORD_TOKEN ?? process.env.TOKEN;
    if (!token) {
      throw new Error("Missing required environment variable: DISCORD_TOKEN");
    }

    const clientId = process.env.DISCORD_CLIENT_ID ?? process.env.BOT_CLIENT_ID;
    if (!clientId) {
      throw new Error("Missing required environment variable: DISCORD_CLIENT_ID");
    }

    const guilds = client.guilds.cache;
    for (const [guildId, guild] of guilds) {
      await deploySlashCommands(token, clientId, guildId);

      const settings = await fetchSettings(guildId, getSettingChannel(guild.channels));
      setSettings(settings.id, settings.settings);
    }
  });
}
