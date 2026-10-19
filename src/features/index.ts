import { GatewayDispatchEvents, type Client } from "@discordjs/core";
import type { HttpService } from "../service/http/index.ts";
import { morningReportFeature } from "./morning-report/index.ts";
import { voiceNoticeFeature } from "./voice-notice/index.ts";

interface Feature {
  name: string;
  register(client: Client, http: HttpService): void;
}

const ping: Feature = {
  name: "ping",
  register(client): void {
    let botId: string | undefined;

    client.on(GatewayDispatchEvents.Ready, ({ data }): void => {
      botId = data.user.id;
    });

    client.on(GatewayDispatchEvents.MessageCreate, async ({ data, api }): Promise<void> => {
      if (!botId || !data.guild_id || data.author.bot) return;

      const content = data.content.trim();
      if (content !== `<@${botId}> ping` && content !== `<@!${botId}> ping`) return;

      try {
        await api.channels.createMessage(data.channel_id, { content: "pong" });
      } catch (error) {
        console.error(
          "Failed to send pong",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    });
  },
};

export const features: readonly Feature[] = [ping, morningReportFeature, voiceNoticeFeature];
