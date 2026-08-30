export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatRelative(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = Date.now();
    const diffSeconds = Math.round((date.getTime() - now) / 1000);
    const absDiffSeconds = Math.abs(diffSeconds);

    if (absDiffSeconds < 60) {
      return "just now";
    }

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    const diffMinutes = Math.round(diffSeconds / 60);
    if (Math.abs(diffMinutes) < 60) {
      return rtf.format(diffMinutes, "minute");
    }

    const diffHours = Math.round(diffSeconds / 3600);
    if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, "hour");
    }

    const diffDays = Math.round(diffSeconds / 86400);
    if (Math.abs(diffDays) < 30) {
      return rtf.format(diffDays, "day");
    }

    return formatDate(isoString);
  } catch {
    return isoString;
  }
}
