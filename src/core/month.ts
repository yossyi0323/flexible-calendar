import { addDays, atMinute, defaultTimeZone } from "./dates.js";
import type { CalendarEvent, DateKey } from "./types.js";
export interface MonthSpan<E extends CalendarEvent = CalendarEvent> {
  event: E;
  startColumn: number;
  /** Exclusive column index. */
  endColumn: number;
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}
/** Pack whole event spans into collision-free lanes within a week. */
export function layoutMonthWeek<E extends CalendarEvent>(
  events: readonly E[],
  dates: readonly DateKey[],
  timeZone = defaultTimeZone(),
): MonthSpan<E>[] {
  if (!dates.length) return [];
  if (dates.length > 7)
    throw new RangeError("A week can contain at most seven dates");
  const boundaries = dates.map((date) => ({
    start: +atMinute(date, 0, timeZone),
    end: +atMinute(addDays(date, 1), 0, timeZone),
  }));
  const spans = events
    .flatMap((event) => {
      const columns = boundaries.flatMap((day, index) =>
        +event.start < day.end && +event.end > day.start ? [index] : [],
      );
      if (!columns.length) return [];
      return [
        {
          event,
          startColumn: columns[0]!,
          endColumn: columns.at(-1)! + 1,
          lane: 0,
          continuesBefore: +event.start < boundaries[0]!.start,
          continuesAfter: +event.end > boundaries.at(-1)!.end,
        },
      ];
    })
    .sort(
      (a, b) =>
        a.startColumn - b.startColumn ||
        b.endColumn - b.startColumn - (a.endColumn - a.startColumn) ||
        Number(!!b.event.allDay) - Number(!!a.event.allDay) ||
        +a.event.start - +b.event.start ||
        a.event.id.localeCompare(b.event.id),
    );
  const occupied: number[] = [];
  for (const span of spans) {
    const mask =
      ((1 << (span.endColumn - span.startColumn)) - 1) << span.startColumn;
    let lane = occupied.findIndex((value) => (value & mask) === 0);
    if (lane === -1) lane = occupied.length;
    occupied[lane] = (occupied[lane] ?? 0) | mask;
    span.lane = lane;
  }
  return spans;
}
