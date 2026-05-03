import type { Client } from "discord.js";
import { createNotice, voiceChannelNotice } from "../feature/voiceChannelNotice";

export function dispatchOnVoiceStateUpdate(client: Client) {
  client.on("voiceStateUpdate", async (oldState, newState) => {
    await voiceChannelNotice(oldState, newState, createNotice(client));
  });
}
