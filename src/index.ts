import { GatewayDispatchEvents } from "@discordjs/core";
import { getDiscordToken } from "./config.ts";
import { createDiscordConnection } from "./discord/connection.ts";
import { features } from "./features/index.ts";
import { HttpService } from "./service/http/index.ts";

async function main(): Promise<void> {
  const connection = createDiscordConnection(getDiscordToken());
  const http = new HttpService();

  connection.client.on(GatewayDispatchEvents.Ready, (): void => {
    console.info("Discord gateway ready");
  });

  for (const feature of features) {
    feature.register(connection.client, http);
    console.info(`Registered feature: ${feature.name}`);
  }

  let stopping = false;
  const shutdown = async (): Promise<void> => {
    if (stopping) return;
    stopping = true;
    try {
      try {
        await http.stop();
      } finally {
        await connection.disconnect();
      }
    } catch (error) {
      console.error(
        "Failed to disconnect from Discord",
        error instanceof Error ? error.message : "Unknown error",
      );
      process.exitCode = 1;
    }
  };

  process.once("SIGINT", (): void => void shutdown());
  process.once("SIGTERM", (): void => void shutdown());

  try {
    await connection.connect();
    await http.start();
  } catch (error) {
    await connection.disconnect();
    throw error;
  }
}

main().catch((error: unknown): void => {
  console.error("Bot failed to start", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
