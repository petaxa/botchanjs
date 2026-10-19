import { type Client } from "@discordjs/core";
import { ChannelType, type APIGuildChannel } from "discord-api-types/v10";
import { parseGuildSetting } from "./guild-settings-parser.ts";

/** Reads settings from every message in the guild's `settings` text channel. */
export async function readGuildSettings(
  client: Client,
  channels: readonly APIGuildChannel[],
): Promise<ReadonlyMap<string, string>> {
  const settingsChannel = channels.find(
    (channel): boolean => channel.type === ChannelType.GuildText && channel.name === "settings",
  );
  const settings = new Map<string, string>();
  if (!settingsChannel) return settings;

  let before: string | undefined;
  while (true) {
    const messages = await client.api.channels.getMessages(settingsChannel.id, {
      limit: 100,
      before,
    });
    for (const message of messages) {
      const setting = parseGuildSetting(message.content);
      // Discord returns newest messages first, so the latest valid value wins.
      if (setting && !settings.has(setting.key)) settings.set(setting.key, setting.value);
    }
    if (messages.length < 100) return settings;
    before = messages.at(-1)?.id;
  }
}
