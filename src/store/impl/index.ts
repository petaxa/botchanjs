export function createStore<T>() {
  const store = new Map<string, T>();

  return {
    get: (guildId: string): T | undefined => {
      return store.get(guildId);
    },
    set: (guildId: string, data: T): void => {
      store.set(guildId, data);
    },
  };
}
