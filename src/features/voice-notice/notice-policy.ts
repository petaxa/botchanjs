import type { VoiceChange } from "./voice-state-tracker.ts";

export interface NoticeChannel {
  id: string;
  name: string;
  kind: "text" | "voice";
}

export interface PlannedNotice extends VoiceChange {
  destinationId: string;
  voiceName: string;
}

/** Selects destinations without making Discord API calls. */
export function planNotices(
  changes: readonly VoiceChange[],
  channels: readonly NoticeChannel[],
  settings: ReadonlyMap<string, string>,
): PlannedNotice[] {
  const configuredNotice = settings.get("noticeChannel");
  const normalNotice = configuredNotice
    ? channels.find(
        (channel): boolean => channel.kind === "text" && channel.id === configuredNotice,
      )?.id
    : channels.find((channel): boolean => channel.kind === "text" && channel.name === "vc-notice")
        ?.id;
  const secretNotice = channels.find(
    (channel): boolean =>
      channel.kind === "text" && channel.id === settings.get("secretNoticeChannel"),
  )?.id;
  const secretChannel = settings.get("secretChannel");

  return changes.flatMap((change): PlannedNotice[] => {
    const voice = channels.find(
      (channel): boolean => channel.kind === "voice" && channel.id === change.channelId,
    );
    const destinationId = change.channelId === secretChannel ? secretNotice : normalNotice;
    if (!voice || !destinationId) return [];
    return [{ ...change, destinationId, voiceName: voice.name }];
  });
}
