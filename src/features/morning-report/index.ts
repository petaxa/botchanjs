import { type Client, type CreateMessageOptions } from "@discordjs/core";
import { ComponentType, MessageFlags, SeparatorSpacingSize } from "discord-api-types/v10";
import { MAKE_SENSE } from "../../config/channels.ts";
import type { HttpService } from "../../service/http/index.ts";

interface MorningReport {
  date: string;
  overview: string;
  events: string[];
}

function parseMorningReport(value: unknown): MorningReport | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;

  const report = value as Record<string, unknown>;
  if (
    typeof report.date !== "string" ||
    report.date.trim().length === 0 ||
    report.date.length > 100 ||
    typeof report.overview !== "string" ||
    report.overview.trim().length === 0 ||
    report.overview.length > 3000 ||
    !Array.isArray(report.events) ||
    report.events.length > 10 ||
    !report.events.every(
      (event: unknown): boolean =>
        typeof event === "string" && event.trim().length > 0 && event.length <= 200,
    )
  ) {
    return undefined;
  }

  return report as unknown as MorningReport;
}

export const morningReportFeature = {
  name: "morning-report",
  register(client: Client, http: HttpService): void {
    http.registerJsonPost<MorningReport>({
      path: "/morning-report",
      tokenEnv: "MORNING_REPORT_WEBHOOK_TOKEN",
      parse: parseMorningReport,
      publish: (report): Promise<void> => morningReport(client, report),
    });
  },
};

async function morningReport(client: Client, report: MorningReport): Promise<void> {
  await client.api.channels.createMessage(MAKE_SENSE.CURRENT_EVENTS, buildMorningReport(report));
}

function buildMorningReport(report: MorningReport): CreateMessageOptions {
  return {
    flags: MessageFlags.IsComponentsV2,
    allowed_mentions: { parse: [] },
    components: [
      {
        type: ComponentType.Container,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: [
              "# ☀️ Morning Market Brief",
              `### ${report.date}`,
              "-# DAILY MARKET REPORT",
            ].join("\n"),
          },
          {
            type: ComponentType.Separator,
            divider: true,
            spacing: SeparatorSpacingSize.Small,
          },
          {
            type: ComponentType.TextDisplay,
            content: ["### 📊 Market Overview", report.overview].join("\n\n"),
          },
          {
            type: ComponentType.Separator,
            divider: true,
            spacing: SeparatorSpacingSize.Small,
          },
          {
            type: ComponentType.TextDisplay,
            content: [
              "### 📅 Today's Watchlist",
              ...report.events.map((event): string => `- ${event}`),
            ].join("\n"),
          },
        ],
      },
    ],
  };
}
