import { GatewayDispatchEvents, type Client } from "@discordjs/core";
import { ChannelType, type APIGuildChannel, type APIVoiceState } from "discord-api-types/v10";
import { readGuildSettings } from "../../config/guild-settings.ts";

type VoiceChange = { channelId: string; action: "入室" | "退出" };

function voiceChanges(previous: string | null, current: string | null): VoiceChange[] {
  if (previous === current) return [];
  const changes: VoiceChange[] = [];
  if (previous) changes.push({ channelId: previous, action: "退出" });
  if (current) changes.push({ channelId: current, action: "入室" });
  return changes;
}

function textChannel(
  channels: readonly APIGuildChannel[],
  id: string | undefined,
): string | undefined {
  return channels.find(
    (channel): boolean => channel.type === ChannelType.GuildText && channel.id === id,
  )?.id;
}

function formatTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part): boolean => part.type === type)?.value ?? "";
  return `${value("month")}/${value("day")} ${value("hour")}:${value("minute")}`;
}

async function notify(
  client: Client,
  state: APIVoiceState,
  changes: readonly VoiceChange[],
): Promise<void> {
  if (!state.guild_id) return;
  const channels = await client.api.guilds.getChannels(state.guild_id);
  const settings = await readGuildSettings(client, channels);
  const configuredNotice = settings.get("noticeChannel");
  const normalNotice = configuredNotice
    ? textChannel(channels, configuredNotice)
    : channels.find(
        (channel): boolean =>
          channel.type === ChannelType.GuildText && channel.name === "vc-notice",
      )?.id;
  const secretNotice = textChannel(channels, settings.get("secretNoticeChannel"));
  const secretChannel = settings.get("secretChannel");
  const member = state.member ?? (await client.api.guilds.getMember(state.guild_id, state.user_id));
  const displayName =
    member.nick ?? member.user?.global_name ?? member.user?.username ?? state.user_id;
  const time = formatTime(new Date());

  for (const change of changes) {
    const channel = channels.find(
      (candidate): boolean =>
        (candidate.type === ChannelType.GuildVoice ||
          candidate.type === ChannelType.GuildStageVoice) &&
        candidate.id === change.channelId,
    );
    if (!channel) continue;

    const destination = change.channelId === secretChannel ? secretNotice : normalNotice;
    if (!destination) continue;
    const content = `${time} に ${displayName} が ${channel.name} ${change.action === "退出" ? "から退出" : "に入室"}しました`;
    await client.api.channels.createMessage(destination, {
      content,
      allowed_mentions: { parse: [] },
    });
  }
}

export const voiceNoticeFeature = {
  name: "voice-notice",
  register(client: Client): void {
    const voiceStates = new Map<string, Map<string, string>>();
    const pendingNotices = new Map<string, Promise<void>>();

    client.on(GatewayDispatchEvents.GuildCreate, ({ data }): void => {
      if (data.unavailable) return;
      voiceStates.set(
        data.id,
        new Map(
          data.voice_states.flatMap((state): [string, string][] =>
            state.channel_id ? [[state.user_id, state.channel_id]] : [],
          ),
        ),
      );
    });

    client.on(GatewayDispatchEvents.GuildDelete, ({ data }): void => {
      if (!data.unavailable) voiceStates.delete(data.id);
    });

    client.on(GatewayDispatchEvents.VoiceStateUpdate, ({ data }): void => {
      if (!data.guild_id) return;
      let guildStates = voiceStates.get(data.guild_id);
      if (!guildStates) {
        guildStates = new Map();
        voiceStates.set(data.guild_id, guildStates);
      }

      const previous = guildStates.get(data.user_id) ?? null;
      const current = data.channel_id;
      if (current) guildStates.set(data.user_id, current);
      else guildStates.delete(data.user_id);

      const changes = voiceChanges(previous, current);
      if (changes.length === 0) return;
      const guildId = data.guild_id;
      const previousNotice = pendingNotices.get(guildId) ?? Promise.resolve();
      const currentNotice = previousNotice
        .catch((): void => undefined)
        .then((): Promise<void> => notify(client, data, changes));
      pendingNotices.set(guildId, currentNotice);
      void currentNotice
        .catch((error: unknown): void => {
          console.error("Failed to send voice notice", error);
        })
        .finally((): void => {
          if (pendingNotices.get(guildId) === currentNotice) pendingNotices.delete(guildId);
        });
    });
  },
};
