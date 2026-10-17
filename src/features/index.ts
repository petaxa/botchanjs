import { GatewayDispatchEvents, type Client } from "@discordjs/core";

export interface Feature {
  name: string;
  register(client: Client): void;
}

const ping: Feature = {
  name: "ping",
  register(client) {
    let botId: string | undefined;

    client.on(GatewayDispatchEvents.Ready, ({ data }) => {
      botId = data.user.id;
    });

    client.on(GatewayDispatchEvents.MessageCreate, async ({ data, api }) => {
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

export const features: readonly Feature[] = [ping];
