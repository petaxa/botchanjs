import type { Client } from "@discordjs/core";
import { ChannelType, type APIGuildChannel } from "discord-api-types/v10";
import { describe, expect, it, vi } from "vite-plus/test";
import { readGuildSettings } from "./guild-settings.ts";
import { parseGuildSetting } from "./guild-settings-parser.ts";

describe("guild settings", (): void => {
  it("ignores malformed messages", (): void => {
    expect(parseGuildSetting("bad line")).toBeUndefined();
    expect(parseGuildSetting(":value")).toBeUndefined();
    expect(parseGuildSetting("key:")).toBeUndefined();
    expect(parseGuildSetting("key:value\nother:value")).toBeUndefined();
    expect(parseGuildSetting(" key : value ")).toEqual({ key: "key", value: "value" });
  });

  it("reads every page and keeps the newest valid value for each key", async (): Promise<void> => {
    const firstPage = Array.from({ length: 100 }, (_, index): object => ({
      id: String(200 - index),
      content: index === 0 ? "noticeChannel:public" : "bad line",
    }));
    const getMessages = vi
      .fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([
        { id: "100", content: "noticeChannel:old" },
        { id: "99", content: "secretChannel:secret" },
      ]);
    const client = { api: { channels: { getMessages } } } as unknown as Client;
    const channels = [
      { id: "settings", name: "settings", type: ChannelType.GuildText },
    ] as APIGuildChannel[];

    const settings = await readGuildSettings(client, channels);
    expect(Object.fromEntries(settings)).toEqual({
      noticeChannel: "public",
      secretChannel: "secret",
    });
    expect(getMessages).toHaveBeenNthCalledWith(2, "settings", { limit: 100, before: "101" });
  });
});
