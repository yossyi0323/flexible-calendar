import { addDays, atMinute, defaultTimeZone, minuteOfDay } from "./dates.js";
import { validateEvent } from "./layout.js";
import type { CalendarEvent, DateKey, Segment } from "./types.js";
/** Compute civil-day boundaries once per range, rather than once per event/column. */
export function indexSegments<E extends CalendarEvent>(
  events: readonly E[],
  dates: readonly DateKey[],
  timeZone = defaultTimeZone(),
): Map<DateKey, Segment<E>[]> {
  const result = new Map<DateKey, Segment<E>[]>();
  const days = dates.map((date) => {
    const segments: Segment<E>[] = [];
    result.set(date, segments);
    return {
      date,
      start: +atMinute(date, 0, timeZone),
      end: +atMinute(addDays(date, 1), 0, timeZone),
      segments,
    };
  });
  for (const event of events) {
    validateEvent(event);
    const start = +event.start,
      end = +event.end;
    let startMinute: number | undefined, endMinute: number | undefined;
    for (const day of days) {
      if (start >= day.end || end <= day.start) continue;
      day.segments.push({
        event,
        date: day.date,
        start: new Date(Math.max(start, day.start)),
        end: new Date(Math.min(end, day.end)),
        startMinute:
          start <= day.start
            ? 0
            : (startMinute ??= minuteOfDay(event.start, timeZone)),
        endMinute:
          end >= day.end
            ? 1440
            : (endMinute ??= minuteOfDay(event.end, timeZone)),
        continuesBefore: start < day.start,
        continuesAfter: end > day.end,
      });
    }
  }
  for (const segments of result.values())
    segments.sort(
      (a, b) =>
        Number(!!b.event.allDay) - Number(!!a.event.allDay) ||
        +a.event.start - +b.event.start,
    );
  return result;
}
