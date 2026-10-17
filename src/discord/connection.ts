import { Client, GatewayIntentBits } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";

export interface DiscordConnection {
  client: Client;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export function createDiscordConnection(token: string): DiscordConnection {
  const rest = new REST({ version: "10" }).setToken(token);
  const gateway = new WebSocketManager({
    token,
    rest,
    intents: GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages,
  });
  const client = new Client({ rest, gateway });

  return {
    client,
    async connect(): Promise<void> {
      await gateway.connect();
    },
    async disconnect(): Promise<void> {
      await gateway.destroy();
    },
  };
}
