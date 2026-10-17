import { Client, GatewayIntentBits } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";

export function createDiscordConnection(token: string) {
  const rest = new REST({ version: "10" }).setToken(token);
  const gateway = new WebSocketManager({
    token,
    rest,
    intents: GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages,
  });
  const client = new Client({ rest, gateway });

  return {
    client,
    async connect() {
      await gateway.connect();
    },
    async disconnect() {
      await gateway.destroy();
    },
  };
}
