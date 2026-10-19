import { type Client } from "@discordjs/core";
import { ChannelType, type APIGuildChannel } from "discord-api-types/v10";

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
      const separator = message.content.indexOf(":");
      if (separator < 1 || message.content.includes("\n")) continue;

      const key = message.content.slice(0, separator).trim();
      const value = message.content.slice(separator + 1).trim();
      // Discord returns newest messages first, so the latest valid value wins.
      if (key && value && !settings.has(key)) settings.set(key, value);
    }
    if (messages.length < 100) return settings;
    before = messages.at(-1)?.id;
  }
}
