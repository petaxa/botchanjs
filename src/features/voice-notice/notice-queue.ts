/** Preserves notice order within each guild while allowing guilds to work independently. */
export class GuildNoticeQueue {
  private readonly pending = new Map<string, Promise<void>>();

  enqueue(guildId: string, publish: () => Promise<void>): Promise<void> {
    const previous = this.pending.get(guildId) ?? Promise.resolve();
    const current = previous.catch((): void => undefined).then(publish);
    this.pending.set(guildId, current);

    const cleanup = (): void => {
      if (this.pending.get(guildId) === current) this.pending.delete(guildId);
    };
    void current.then(cleanup, cleanup);
    return current;
  }
}
