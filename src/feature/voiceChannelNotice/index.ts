import type { Client, VoiceState } from "discord.js";
import { ChannelType } from "discord.js";
import { getVoiceChannelTransition } from "./transition";
import { getIgnoreNoticeChannelIds, getNoticeChannelId, shouldNotify } from "./policy";
import { Temporal } from "temporal-polyfill-lite";

export async function voiceChannelNotice(
  oldState: VoiceState,
  newState: VoiceState,
  notice: NoticeFunc,
) {
  const voiceChannelTransitions = getVoiceChannelTransition(oldState, newState);

  const ignoreVoiceChannelIds = getIgnoreNoticeChannelIds();
  const shouldNoticeTransitions = voiceChannelTransitions.filter((transition) =>
    shouldNotify(transition, ignoreVoiceChannelIds),
  );

  for (const transition of shouldNoticeTransitions) {
    const { status, memberName, channelName, channelId } = transition;

    const message = (() => {
      switch (status) {
        case "join":
          return joinMsg(memberName, channelName);
        case "leave":
          return leaveMsg(memberName, channelName);
      }
    })();
    const noticeChannel = getNoticeChannelId(oldState.guild.channels, channelId);
    if (!noticeChannel) return;

    await notice(noticeChannel, message);
  }

  function leaveMsg(
    memberName: string,
    channelName: string,
    now: Temporal.PlainDateTime = Temporal.Now.plainDateTimeISO(),
  ) {
    return `${fmtTimeForMsg(now)} に ${memberName} が ${channelName} から退室しました`;
  }

  function joinMsg(
    memberName: string,
    channelName: string,
    now: Temporal.PlainDateTime = Temporal.Now.plainDateTimeISO(),
  ) {
    return `${fmtTimeForMsg(now)} に ${memberName} が ${channelName} に入室しました`;
  }

  function fmtTimeForMsg(time: Temporal.PlainDateTime): string {
    return `${String(time.month).padStart(2, "0")}/${String(time.day).padStart(2, "0")}-${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
  }
}

type NoticeFunc = (id: string, message: string) => Promise<void>;
export function createNotice(client: Client): NoticeFunc {
  const notice: NoticeFunc = async (channelId: string, message: string): Promise<void> => {
    const channel = client.channels.cache.get(channelId);
    if (!channel || !(channel.type === ChannelType.GuildText)) return;
    await channel.send(message);
  };

  return notice;
}
