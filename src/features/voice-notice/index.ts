import { GatewayDispatchEvents, type Client } from "@discordjs/core";
import { GuildNoticeQueue } from "./notice-queue.ts";
import { publishVoiceNotices } from "./publisher.ts";
import { VoiceStateTracker, type VoiceStateSnapshot } from "./voice-state-tracker.ts";

export const voiceNoticeFeature = {
  name: "voice-notice",
  register(client: Client): void {
    const tracker = new VoiceStateTracker();
    const queue = new GuildNoticeQueue();

    client.on(GatewayDispatchEvents.GuildCreate, ({ data }): void => {
      if (data.unavailable) return;
      tracker.seed(
        data.id,
        data.voice_states.map((state): VoiceStateSnapshot => ({
          userId: state.user_id,
          channelId: state.channel_id,
        })),
      );
    });

    client.on(GatewayDispatchEvents.GuildDelete, ({ data }): void => {
      if (!data.unavailable) tracker.removeGuild(data.id);
    });

    client.on(GatewayDispatchEvents.VoiceStateUpdate, ({ data }): void => {
      if (!data.guild_id) return;
      const changes = tracker.update(data.guild_id, data.user_id, data.channel_id);
      if (changes.length === 0) return;

      void queue
        .enqueue(data.guild_id, (): Promise<void> => publishVoiceNotices(client, data, changes))
        .catch((error: unknown): void => {
          console.error("Failed to send voice notice", error);
        });
    });
  },
};
