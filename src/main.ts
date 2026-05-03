import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { dispatchOnChannelUpdate } from "./dispatch/onChannelUpdate";
import { dispatchOnInteractionCreate } from "./dispatch/onInteractionCreate";
import { dispatchOnReady } from "./dispatch/onReady";
import { dispatchOnVoiceStateUpdate } from "./dispatch/onVoiceStateUpdate";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});
dispatchAllEvents(client);

await client.login(process.env.TOKEN);

function dispatchAllEvents(client: Client) {
  dispatchOnReady(client);
  dispatchOnInteractionCreate(client);
  dispatchOnChannelUpdate(client);
  dispatchOnVoiceStateUpdate(client);
}
