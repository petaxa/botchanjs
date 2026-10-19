import { describe, expect, it } from "vite-plus/test";
import { VoiceStateTracker } from "./voice-state-tracker.ts";

describe("voice state tracker", (): void => {
  it("treats a guild snapshot as the starting state", (): void => {
    const tracker = new VoiceStateTracker();
    tracker.seed("guild", [{ userId: "user", channelId: "general" }]);

    expect(tracker.update("guild", "user", "general")).toEqual([]);
    expect(tracker.update("guild", "user", "secret")).toEqual([
      { channelId: "general", action: "退出" },
      { channelId: "secret", action: "入室" },
    ]);
    expect(tracker.update("guild", "user", null)).toEqual([
      { channelId: "secret", action: "退出" },
    ]);
  });

  it("keeps each guild separate and forgets a removed guild", (): void => {
    const tracker = new VoiceStateTracker();
    expect(tracker.update("first", "user", "general")).toEqual([
      { channelId: "general", action: "入室" },
    ]);
    expect(tracker.update("second", "user", "general")).toEqual([
      { channelId: "general", action: "入室" },
    ]);
    tracker.removeGuild("first");
    expect(tracker.update("first", "user", "general")).toEqual([
      { channelId: "general", action: "入室" },
    ]);
  });
});
