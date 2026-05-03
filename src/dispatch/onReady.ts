import type { Client } from "discord.js";
import { fetchSettings, getSettingChannel, setSettings } from "../feature/settings";
import { deploySlashCommands } from "../feature/slashCommands";

export function dispatchOnReady(client: Client) {
  client.once("ready", async () => {
    console.log("Ready!");
    console.log(client.user?.tag);

    const guilds = client.guilds.cache;
    for (const [guildId, guild] of guilds) {
      await deploySlashCommands(process.env.TOKEN, process.env.BOT_CLIENT_ID, guildId);

      const settings = await fetchSettings(guildId, getSettingChannel(guild.channels));
      setSettings(settings.id, settings.settings);
    }
  });
}
