import { describe, expect, it } from "vite-plus/test";
import { formatNotice } from "./notice-message.ts";
import { planNotices, type NoticeChannel } from "./notice-policy.ts";

const channels: NoticeChannel[] = [
  { id: "public", name: "vc-notice", kind: "text" },
  { id: "private", name: "private-notice", kind: "text" },
  { id: "general", name: "general", kind: "voice" },
  { id: "secret", name: "secret", kind: "voice" },
];

describe("notice policy", (): void => {
  it("uses the named fallback only without an explicit destination", (): void => {
    const change = [{ channelId: "general", action: "入室" as const }];
    expect(planNotices(change, channels, new Map())[0]?.destinationId).toBe("public");
    expect(planNotices(change, channels, new Map([["noticeChannel", "missing"]]))).toEqual([]);
  });

  it("never sends a secret VC notice to the public destination", (): void => {
    const change = [{ channelId: "secret", action: "入室" as const }];
    expect(planNotices(change, channels, new Map([["secretChannel", "secret"]]))).toEqual([]);
    expect(
      planNotices(
        change,
        channels,
        new Map([
          ["secretChannel", "secret"],
          ["secretNoticeChannel", "private"],
        ]),
      )[0]?.destinationId,
    ).toBe("private");
  });

  it("formats the notice in Japan time", (): void => {
    expect(
      formatNotice(
        { voiceName: "general", action: "入室" },
        "ゆうま",
        new Date("2026-08-24T02:47:00Z"),
      ),
    ).toBe("08/24 11:47 に ゆうま が general に入室しました");
  });
});
