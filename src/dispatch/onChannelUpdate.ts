import type { Client } from "discord.js";
import { ChannelType } from "discord.js";
import { fetchSettings, getSettingChannel, setSettings } from "../feature/settings";

export function dispatchOnChannelUpdate(client: Client) {
  client.on("channelUpdate", async (_, newChannel) => {
    if (!(newChannel.type === ChannelType.GuildText) || newChannel.name !== "settings") return;

    const guild = newChannel.guild;
    const settings = await fetchSettings(guild.id, getSettingChannel(guild.channels));
    setSettings(settings.id, settings.settings);
  });
}
