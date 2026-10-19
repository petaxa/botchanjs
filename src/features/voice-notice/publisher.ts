import type { Client } from "@discordjs/core";
import { ChannelType, type APIGuildChannel, type APIVoiceState } from "discord-api-types/v10";
import { readGuildSettings } from "../../config/guild-settings.ts";
import { formatNotice } from "./notice-message.ts";
import { planNotices, type NoticeChannel } from "./notice-policy.ts";
import type { VoiceChange } from "./voice-state-tracker.ts";

function noticeChannel(channel: APIGuildChannel): NoticeChannel | undefined {
  if (channel.type === ChannelType.GuildText) {
    return { id: channel.id, name: channel.name, kind: "text" };
  }
  if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
    return { id: channel.id, name: channel.name, kind: "voice" };
  }
  return undefined;
}

/** Adapts Discord data to the notice policy and sends the planned messages. */
export async function publishVoiceNotices(
  client: Client,
  state: APIVoiceState,
  changes: readonly VoiceChange[],
): Promise<void> {
  if (!state.guild_id) return;
  const channels = await client.api.guilds.getChannels(state.guild_id);
  const settings = await readGuildSettings(client, channels);
  const notices = planNotices(
    changes,
    channels.flatMap((channel): NoticeChannel[] => {
      const result = noticeChannel(channel);
      return result ? [result] : [];
    }),
    settings,
  );
  if (notices.length === 0) return;

  const member = state.member ?? (await client.api.guilds.getMember(state.guild_id, state.user_id));
  const displayName =
    member.nick ?? member.user?.global_name ?? member.user?.username ?? state.user_id;
  const date = new Date();

  for (const notice of notices) {
    await client.api.channels.createMessage(notice.destinationId, {
      content: formatNotice(notice, displayName, date),
      allowed_mentions: { parse: [] },
    });
  }
}
