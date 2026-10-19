import { describe, expect, it } from "vite-plus/test";
import { GuildNoticeQueue } from "./notice-queue.ts";

describe("guild notice queue", (): void => {
  it("preserves guild order after a failed publication", async (): Promise<void> => {
    const queue = new GuildNoticeQueue();
    const order: string[] = [];
    const first = queue.enqueue("guild", async (): Promise<void> => {
      order.push("first");
      throw new Error("send failed");
    });
    const second = queue.enqueue("guild", async (): Promise<void> => {
      order.push("second");
    });

    await expect(first).rejects.toThrow("send failed");
    await second;
    expect(order).toEqual(["first", "second"]);
  });
});
