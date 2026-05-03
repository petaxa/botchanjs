import type { GuildChannelManager } from "discord.js";
import type { VoiceChannelTransition } from "./transition";

type NoticeConfig = {
  noticeChannelId?: string;
  secretVoiceChannelIds?: string[];
  secretNoticeChannelId?: string;
  ignoreNoticeChannelIds?: string[];
};
export function getNoticeChannelId(
  channels: GuildChannelManager,
  updatedVoiceChannelId: string,
  noticeConfig?: NoticeConfig,
): string | undefined {
  if (!noticeConfig || isAllEmptyConfigProps()) return defaultChannelId();

  const { noticeChannelId, secretVoiceChannelIds, secretNoticeChannelId } = noticeConfig;

  if (secretVoiceChannelIds && secretVoiceChannelIds.includes(updatedVoiceChannelId)) {
    // secretVoiceChannelIdsのチャンネルの場合、secretの通知先がなかったら通知しない
    return secretNoticeChannelId ?? undefined;
  }

  const channelId = noticeChannelId ?? defaultChannelId();
  return channelId;

  function isAllEmptyConfigProps() {
    return (
      !noticeConfig?.noticeChannelId &&
      !noticeConfig?.secretVoiceChannelIds?.length &&
      !noticeConfig?.secretNoticeChannelId
    );
  }

  function defaultChannelId() {
    return channels.cache.find((channel) => channel.name === "vc-notice")?.id ?? "";
  }
}

export function getIgnoreNoticeChannelIds(noticeConfig?: NoticeConfig): string[] {
  return noticeConfig?.ignoreNoticeChannelIds ?? [];
}

type NotifiableTransition = Exclude<VoiceChannelTransition, { status: "none" }>;
export function shouldNotify(
  transition: VoiceChannelTransition,
  ignoreIds: readonly string[],
): transition is NotifiableTransition {
  return transition.status !== "none" && !ignoreIds.includes(transition.channelId);
}
