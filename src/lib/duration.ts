// Jira-style duration handling: "2w 4d 6h 45m" <-> integer minutes.
// Ratios (Jira default working-time): 1w = 5d, 1d = 8h, 1h = 60m.
// Ported verbatim from the web dashboard (lib/duration.ts) so estimate/spent
// values round-trip identically across both apps.

export const MIN_PER_HOUR = 60;
export const HOURS_PER_DAY = 8;
export const DAYS_PER_WEEK = 5;
export const MIN_PER_DAY = MIN_PER_HOUR * HOURS_PER_DAY; // 480
export const MIN_PER_WEEK = MIN_PER_DAY * DAYS_PER_WEEK; // 2400

const UNIT_MINUTES: Record<string, number> = {
  w: MIN_PER_WEEK,
  d: MIN_PER_DAY,
  h: MIN_PER_HOUR,
  m: 1,
};

/**
 * Parse a duration string like "2w 4d 6h 45m" into total minutes.
 * Tolerant of extra whitespace, missing units, and any unit order.
 * Returns null for empty/blank input; throws on an unrecognised token.
 */
export function parseDuration(input: string | null | undefined): number | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;

  // A plain number with no unit is interpreted as hours (common shorthand).
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Math.round(parseFloat(trimmed) * MIN_PER_HOUR);
  }

  const tokens = trimmed.toLowerCase().match(/\d+(?:\.\d+)?\s*[wdhm]/g);
  if (
    !tokens ||
    tokens.join("").replace(/\s/g, "") !==
      trimmed.toLowerCase().replace(/\s/g, "")
  ) {
    throw new Error(
      `Invalid duration "${input}". Use a format like "2w 4d 6h 45m".`
    );
  }

  let total = 0;
  for (const token of tokens) {
    const unit = token.trim().slice(-1);
    const value = parseFloat(token.trim().slice(0, -1));
    total += value * UNIT_MINUTES[unit];
  }
  return Math.round(total);
}

/**
 * Format total minutes into a Jira-style "2w 4d 6h 45m" string.
 * Omits zero-valued units. Returns "" for null/0.
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return "";
  let remaining = Math.round(minutes);
  const parts: string[] = [];
  const weeks = Math.floor(remaining / MIN_PER_WEEK);
  if (weeks) parts.push(`${weeks}w`);
  remaining %= MIN_PER_WEEK;
  const days = Math.floor(remaining / MIN_PER_DAY);
  if (days) parts.push(`${days}d`);
  remaining %= MIN_PER_DAY;
  const hours = Math.floor(remaining / MIN_PER_HOUR);
  if (hours) parts.push(`${hours}h`);
  remaining %= MIN_PER_HOUR;
  if (remaining) parts.push(`${remaining}m`);
  return parts.join(" ");
}
