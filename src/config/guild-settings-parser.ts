export interface GuildSetting {
  key: string;
  value: string;
}

export function parseGuildSetting(content: string): GuildSetting | undefined {
  const separator = content.indexOf(":");
  if (separator < 1 || content.includes("\n")) return undefined;

  const key = content.slice(0, separator).trim();
  const value = content.slice(separator + 1).trim();
  return key && value ? { key, value } : undefined;
}
