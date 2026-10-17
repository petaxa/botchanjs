import { defineRailway, preserve, project, service } from "railway/iac";

export default defineRailway(() => {
  const botchan = service("botchan", {
    build: "pnpm build",
    start: "pnpm start",
    replicas: 1,
    env: {
      DISCORD_TOKEN: preserve(),
    },
  });

  return project("project-titan", { resources: [botchan] });
});
