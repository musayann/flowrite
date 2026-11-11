import { LOCALE } from "./constants";

/*
 * Dates and times in British English (day before month, 24-hour clock),
 * whatever the browser's own locale.
 */

const time = new Intl.DateTimeFormat(LOCALE, { timeStyle: "short" });
const dateTime = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
});
const shortDateTime = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "16:05" */
export function formatTime(at: number): string {
  return time.format(new Date(at));
}

/** "7 Nov 2026, 14:51" */
export function formatDateTime(at: number): string {
  return dateTime.format(new Date(at));
}

/** "7 Nov, 14:51": for recent dates, where the year goes without saying. */
export function formatShortDateTime(at: number): string {
  return shortDateTime.format(new Date(at));
}

export type DayGroup = "today" | "yesterday" | "earlier";

/** Which calendar day `at` falls on, relative to `now`, in local time. */
export function dayGroup(at: number, now: number = Date.now()): DayGroup {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (at >= today.getTime()) return "today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (at >= yesterday.getTime()) return "yesterday";
  return "earlier";
}

/** When a text was analysed, to follow "Analysed": "just now", "today at 16:05"… */
export function analysedLabel(at: number, now: number = Date.now()): string {
  if (now - at < 60_000) return "just now";
  switch (dayGroup(at, now)) {
    case "today":
      return `today at ${formatTime(at)}`;
    case "yesterday":
      return `yesterday at ${formatTime(at)}`;
    default:
      return `on ${formatDateTime(at)}`;
  }
}

/** "1 issue", "3 issues" */
export function issueCount(n: number): string {
  return `${n} issue${n === 1 ? "" : "s"}`;
}
