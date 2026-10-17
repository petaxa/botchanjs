import { GatewayDispatchEvents } from "@discordjs/core";
import { getDiscordToken } from "./config.ts";
import { createDiscordConnection } from "./discord/connection.ts";
import { features } from "./features/index.ts";

async function main(): Promise<void> {
  const connection = createDiscordConnection(getDiscordToken());

  connection.client.on(GatewayDispatchEvents.Ready, () => {
    console.info("Discord gateway ready");
  });

  for (const feature of features) {
    feature.register(connection.client);
    console.info(`Registered feature: ${feature.name}`);
  }

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    try {
      await connection.disconnect();
    } catch (error) {
      console.error(
        "Failed to disconnect from Discord",
        error instanceof Error ? error.message : "Unknown error",
      );
      process.exitCode = 1;
    }
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());

  await connection.connect();
}

main().catch((error: unknown) => {
  console.error("Bot failed to start", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
