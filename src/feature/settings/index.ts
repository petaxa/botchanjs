import type { GuildChannelManager, TextChannel } from "discord.js";
import { ChannelType } from "discord.js";
import type { settingType } from "./types";
import { settingsStore } from "../../store/data/settings";

export async function fetchSettings(
  guildId: string,
  settingChannel: TextChannel | undefined,
): Promise<{ id: string; settings: settingType }> {
  const channel = settingChannel;
  // 設定チャンネルのメッセージを取得
  const msgs = (await channel?.messages.fetch()) ?? [];

  // 設定の初期値を決定
  const settings: settingType = {
    noticeChannelId: "",
    secretVoiceChannelIds: [""],
    secretNoticeChannelId: "",
    ignoreNoticeChannelIds: [""],
  };

  // 取得したメッセージから設定部分を検出、settingにセット
  msgs.forEach((msg) => {
    // ":"が含まれていない場合はreturn
    if (!msg.content.includes(":")) return;
    // ":"を区切り文字として分割
    const settingAry = msg.content.split(":");
    const key = settingAry[0];
    const value = settingAry[1];

    switch (key) {
      case "noticeChannelId":
        settings.noticeChannelId = value;
        break;
      case "secretNoticeChannelId":
        settings.secretNoticeChannelId = value;
        break;
      case "secretVoiceChannelIds":
        settings.secretVoiceChannelIds.push(...value.split(" "));
        break;
      case "ignoreNoticeChannelIds":
        settings.ignoreNoticeChannelIds.push(...value.split(" "));
        break;
      default:
        break;
    }
  });

  return { id: guildId, settings };
}

export function setSettings(guildId: string, settings: settingType) {
  settingsStore.set(guildId, settings);
}

export function getSettingChannel(channels: GuildChannelManager): TextChannel | undefined {
  const settingChannel = channels.cache.find((channel) => channel.name === "settings");

  if (!settingChannel || !(settingChannel.type === ChannelType.GuildText)) {
    return undefined;
  }

  return settingChannel;
}
