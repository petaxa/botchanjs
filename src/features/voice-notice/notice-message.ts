interface NoticeContent {
  action: "入室" | "退出";
  voiceName: string;
}

function formatTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part): boolean => part.type === type)?.value ?? "";
  return `${value("month")}/${value("day")} ${value("hour")}:${value("minute")}`;
}

export function formatNotice(notice: NoticeContent, displayName: string, date: Date): string {
  const action = notice.action === "退出" ? "から退出" : "に入室";
  return `${formatTime(date)} に ${displayName} が ${notice.voiceName} ${action}しました`;
}
