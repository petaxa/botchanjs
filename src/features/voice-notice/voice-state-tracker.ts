export interface VoiceChange {
  channelId: string;
  action: "入室" | "退出";
}

export interface VoiceStateSnapshot {
  userId: string;
  channelId: string | null;
}

/** Tracks only the channel needed to distinguish movement from mute updates. */
export class VoiceStateTracker {
  private readonly guilds = new Map<string, Map<string, string>>();

  seed(guildId: string, states: readonly VoiceStateSnapshot[]): void {
    const members = new Map<string, string>();
    for (const state of states) {
      if (state.channelId) members.set(state.userId, state.channelId);
    }
    this.guilds.set(guildId, members);
  }

  removeGuild(guildId: string): void {
    this.guilds.delete(guildId);
  }

  update(guildId: string, userId: string, channelId: string | null): VoiceChange[] {
    let members = this.guilds.get(guildId);
    if (!members) {
      members = new Map();
      this.guilds.set(guildId, members);
    }

    const previous = members.get(userId) ?? null;
    if (channelId) members.set(userId, channelId);
    else members.delete(userId);

    if (previous === channelId) return [];
    const changes: VoiceChange[] = [];
    if (previous) changes.push({ channelId: previous, action: "退出" });
    if (channelId) changes.push({ channelId, action: "入室" });
    return changes;
  }
}
