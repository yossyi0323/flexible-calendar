import {
  atMinute,
  dateKey,
  differenceInDays,
  shiftDate,
  MS_PER_MINUTE,
} from "./dates.js";
import { validateEvent } from "./layout.js";
import type {
  CalendarEvent,
  DateKey,
  EventChange,
  ResourceAssignment,
} from "./types.js";
export function snapMinute(
  minute: number,
  step: number,
  min = 0,
  max = 1440,
): number {
  if (
    ![minute, step, min, max].every(Number.isFinite) ||
    step <= 0 ||
    max < min
  )
    throw new RangeError("Invalid snap range or step");
  return Math.max(
    min,
    Math.min(max, min + Math.round((minute - min) / step) * step),
  );
}
export function moveEvent<E extends CalendarEvent>(
  event: E,
  date: DateKey,
  minute: number,
  timeZone: string,
  resourceId?: ResourceAssignment,
): EventChange<E> {
  validateEvent(event);
  const start = atMinute(date, minute, timeZone);
  const end = event.allDay
    ? shiftDate(
        event.end,
        differenceInDays(dateKey(event.start, timeZone), date),
        timeZone,
      )
    : new Date(+start + (+event.end - +event.start));
  return {
    event,
    start,
    end,
    ...(resourceId === undefined ? {} : { resourceId }),
    allDay: !!event.allDay,
    action: "move",
  };
}
export function resizeEvent<E extends CalendarEvent>(
  event: E,
  edge: "start" | "end",
  date: DateKey,
  minute: number,
  timeZone: string,
  minimumMinutes = 1,
): EventChange<E> {
  validateEvent(event);
  if (!Number.isFinite(minimumMinutes) || minimumMinutes <= 0)
    throw new RangeError("Minimum duration must be positive");
  const target = atMinute(date, minute, timeZone),
    minimum = minimumMinutes * MS_PER_MINUTE;
  const latestStart = event.allDay
    ? +shiftDate(event.end, -1, timeZone)
    : +event.end - minimum;
  const earliestEnd = event.allDay
    ? +shiftDate(event.start, 1, timeZone)
    : +event.start + minimum;
  return {
    event,
    start:
      edge === "start"
        ? new Date(Math.min(+target, latestStart))
        : new Date(event.start),
    end:
      edge === "end"
        ? new Date(Math.max(+target, earliestEnd))
        : new Date(event.end),
    ...(event.resourceId === undefined ? {} : { resourceId: event.resourceId }),
    allDay: !!event.allDay,
    action: edge === "start" ? "resize-start" : "resize-end",
  };
}
