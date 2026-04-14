/** Fecha/hora corta para cabeceras de post (feed y explorar). */
export function formatFeedTime(createdAt: string, createdAtFormatted?: string): string {
  const pre = createdAtFormatted?.trim();
  if (pre) return pre;
  try {
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
