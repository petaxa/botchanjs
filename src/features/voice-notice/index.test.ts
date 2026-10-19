import { EventEmitter } from "node:events";
import { GatewayDispatchEvents, type Client } from "@discordjs/core";
import { ChannelType } from "discord-api-types/v10";
import { describe, expect, it, vi } from "vite-plus/test";
import { voiceNoticeFeature } from "./index.ts";

const channels = [
  { id: "settings", name: "settings", type: ChannelType.GuildText },
  { id: "public", name: "vc-notice", type: ChannelType.GuildText },
  { id: "private", name: "private-notice", type: ChannelType.GuildText },
  { id: "general", name: "general", type: ChannelType.GuildVoice },
  { id: "secret", name: "secret", type: ChannelType.GuildVoice },
];

function mockClient(messageContents: string[]): {
  client: Client;
  events: EventEmitter;
  sent: ReturnType<
    typeof vi.fn<
      (
        channel: string,
        message: { content: string; allowed_mentions?: { parse: string[] } },
      ) => Promise<object>
    >
  >;
  getMessages: ReturnType<typeof vi.fn>;
} {
  const events = new EventEmitter();
  const sent = vi.fn(
    async (
      _channel: string,
      _message: { content: string; allowed_mentions?: { parse: string[] } },
    ): Promise<object> => ({}),
  );
  const getMessages = vi.fn().mockResolvedValue(
    messageContents.map((content, index): object => ({
      id: String(messageContents.length - index),
      content,
    })),
  );
  const client = Object.assign(events, {
    api: {
      guilds: {
        getChannels: vi.fn().mockResolvedValue(channels),
        getMember: vi.fn().mockResolvedValue({ nick: "ゆうま", user: { username: "yuma" } }),
      },
      channels: {
        getMessages,
        createMessage: sent,
      },
    },
  }) as unknown as Client;
  return { client, events, sent, getMessages };
}

function voiceEvent(events: EventEmitter, channelId: string | null): void {
  events.emit(GatewayDispatchEvents.VoiceStateUpdate, {
    data: {
      guild_id: "guild",
      user_id: "user",
      channel_id: channelId,
      member: { nick: "ゆうま", user: { username: "yuma" } },
    },
  });
}

describe("voice notices", (): void => {
  it("announces joins, moves, and exits but ignores mute changes", async (): Promise<void> => {
    const { client, events, sent } = mockClient([]);
    voiceNoticeFeature.register(client);

    voiceEvent(events, "general");
    await vi.waitFor((): void => expect(sent).toHaveBeenCalledTimes(1));
    voiceEvent(events, "general");
    expect(sent).toHaveBeenCalledTimes(1);
    voiceEvent(events, "secret");
    await vi.waitFor((): void => expect(sent).toHaveBeenCalledTimes(3));
    voiceEvent(events, null);
    await vi.waitFor((): void => expect(sent).toHaveBeenCalledTimes(4));

    expect(sent.mock.calls.map((call): string => call[1].content)).toEqual([
      expect.stringMatching(/^\d{2}\/\d{2} \d{2}:\d{2} に ゆうま が general に入室しました$/),
      expect.stringMatching(/に ゆうま が general から退出しました$/),
      expect.stringMatching(/に ゆうま が secret に入室しました$/),
      expect.stringMatching(/に ゆうま が secret から退出しました$/),
    ]);
    expect(sent.mock.calls.every((call): boolean => call[0] === "public")).toBe(true);
    expect(
      sent.mock.calls.every((call): boolean => call[1].allowed_mentions?.parse.length === 0),
    ).toBe(true);
  });

  it("routes secret voice to its own destination and suppresses it when unconfigured", async (): Promise<void> => {
    const configured = mockClient([
      "secretChannel:secret",
      "secretNoticeChannel:private",
      "noticeChannel:public",
    ]);
    voiceNoticeFeature.register(configured.client);
    voiceEvent(configured.events, "secret");
    await vi.waitFor((): void => expect(configured.sent).toHaveBeenCalledTimes(1));
    expect(configured.sent.mock.calls[0]?.[0]).toBe("private");

    const suppressed = mockClient(["secretChannel:secret"]);
    voiceNoticeFeature.register(suppressed.client);
    voiceEvent(suppressed.events, "secret");
    await vi.waitFor((): void => expect(suppressed.getMessages).toHaveBeenCalled());
    expect(suppressed.sent).not.toHaveBeenCalled();
  });

  it("seeds current voice members without sending startup notices", async (): Promise<void> => {
    const { client, events, sent } = mockClient([]);
    voiceNoticeFeature.register(client);
    events.emit(GatewayDispatchEvents.GuildCreate, {
      data: { id: "guild", voice_states: [{ user_id: "user", channel_id: "general" }] },
    });
    voiceEvent(events, "general");
    expect(sent).not.toHaveBeenCalled();
  });
});
