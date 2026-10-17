export function getDiscordToken(): string {
  const token = process.env.DISCORD_TOKEN;

  if (!token) {
    throw new Error("DISCORD_TOKEN is required");
  }

  return token;
}
