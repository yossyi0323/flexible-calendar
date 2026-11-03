import { expect, it } from "vitest";
import {
  indexSegments,
  splitEvent,
  atMinute,
  type CalendarEvent,
} from "../src/core/index.js";
it.each(["Asia/Tokyo", "America/New_York"])(
  "indexed segments equal individual segmentation in %s",
  (zone) => {
    const dates = ["2026-11-01", "2026-11-02", "2026-11-03"];
    const events: CalendarEvent[] = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      title: "Test",
      start: atMinute(dates[i % 3]!, (i * 13) % 1440, zone),
      end: atMinute(dates[i % 3]!, ((i * 13) % 1440) + 150, zone),
    }));
    const index = indexSegments(events, dates, zone);
    for (const day of dates)
      expect(index.get(day)).toEqual(
        events
          .flatMap((e) => splitEvent(e, [day], zone))
          .sort((a, b) => +a.event.start - +b.event.start),
      );
  },
);
