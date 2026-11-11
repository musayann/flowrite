import { describe, expect, it } from "vitest";
import {
  analysedLabel,
  dayGroup,
  formatDateTime,
  formatShortDateTime,
  formatTime,
  issueCount,
} from "@/lib/format";

// vitest.config.mts pins TZ to UTC, so these clock times are stable.
const NOW = Date.UTC(2026, 10, 11, 10, 42); // Wed 11 Nov 2026, 10:42
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe("formatting", () => {
  const at = Date.UTC(2026, 10, 7, 14, 51);

  it("writes times on a 24-hour clock", () => {
    expect(formatTime(at)).toBe("14:51");
  });

  it("puts the day before the month", () => {
    expect(formatDateTime(at)).toBe("7 Nov 2026, 14:51");
  });

  it("drops the year from short dates", () => {
    expect(formatShortDateTime(at)).toBe("7 Nov, 14:51");
  });
});

describe("dayGroup", () => {
  it("counts anything since midnight as today", () => {
    expect(dayGroup(Date.UTC(2026, 10, 11, 0, 0), NOW)).toBe("today");
    expect(dayGroup(NOW - MINUTE, NOW)).toBe("today");
  });

  it("counts the whole previous calendar day as yesterday", () => {
    expect(dayGroup(Date.UTC(2026, 10, 10, 23, 59), NOW)).toBe("yesterday");
    expect(dayGroup(Date.UTC(2026, 10, 10, 0, 0), NOW)).toBe("yesterday");
  });

  it("counts anything older as earlier", () => {
    expect(dayGroup(Date.UTC(2026, 10, 9, 23, 59), NOW)).toBe("earlier");
  });
});

describe("analysedLabel", () => {
  it("says just now for the first minute", () => {
    expect(analysedLabel(NOW, NOW)).toBe("just now");
    expect(analysedLabel(NOW - 59_000, NOW)).toBe("just now");
  });

  it("gives the time for earlier today", () => {
    expect(analysedLabel(NOW - 2 * HOUR, NOW)).toBe("today at 08:42");
  });

  it("gives the time for yesterday", () => {
    expect(analysedLabel(NOW - 24 * HOUR, NOW)).toBe("yesterday at 10:42");
  });

  it("gives the date for anything older", () => {
    expect(analysedLabel(Date.UTC(2026, 10, 7, 14, 51), NOW)).toBe(
      "on 7 Nov 2026, 14:51",
    );
  });

  it("measures against the clock by default", () => {
    expect(analysedLabel(Date.now())).toBe("just now");
  });
});

describe("issueCount", () => {
  it("is singular for one issue only", () => {
    expect(issueCount(0)).toBe("0 issues");
    expect(issueCount(1)).toBe("1 issue");
    expect(issueCount(5)).toBe("5 issues");
  });
});
