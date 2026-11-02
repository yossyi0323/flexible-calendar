import {
  addDays,
  atMinute,
  dateKey,
  defaultTimeZone,
  minuteOfDay,
  getViewDates,
} from "./dates.js";
import type {
  CalendarConfig,
  CalendarEvent,
  Column,
  DateKey,
  PositionedSegment,
  Resource,
  Segment,
} from "./types.js";
export function validateEvent(event: CalendarEvent): void {
  if (
    !event.id ||
    !Number.isFinite(event.start.getTime()) ||
    !Number.isFinite(event.end.getTime()) ||
    event.end <= event.start
  )
    throw new RangeError(`Invalid event interval: ${event.id}`);
}
export function validateConfig(config: CalendarConfig): void {
  dateKey(config.date, config.timeZone);
  new Intl.DateTimeFormat(config.locale ?? "en-US");
  if (
    config.view &&
    !["day", "week", "work-week", "month", "agenda", "vertical"].includes(
      config.view,
    ) &&
    !config.customViews?.[config.view]
  )
    throw new RangeError("Unknown calendar view");
  const min = config.minMinute ?? 0,
    max = config.maxMinute ?? 1440,
    step = config.step ?? 30;
  if (
    !Number.isInteger(step) ||
    step <= 0 ||
    step > 1440 ||
    min < 0 ||
    max > 1440 ||
    min >= max ||
    !Number.isInteger(min) ||
    !Number.isInteger(max)
  )
    throw new RangeError(
      "Expected 0 <= minMinute < maxMinute <= 1440 and positive integer step <= 1440",
    );
  if (
    !Number.isInteger(config.days ?? 3) ||
    (config.days ?? 3) < 1 ||
    (config.days ?? 3) > 366
  )
    throw new RangeError("days must be an integer from 1 to 366");
  if (
    !Number.isInteger(config.weekStartsOn ?? 1) ||
    (config.weekStartsOn ?? 1) < 0 ||
    (config.weekStartsOn ?? 1) > 6
  )
    throw new RangeError("weekStartsOn must be 0–6");
  const ids = new Set<string>();
  for (const e of config.events) {
    validateEvent(e);
    if (ids.has(e.id)) throw new RangeError(`Duplicate event id: ${e.id}`);
    ids.add(e.id);
  }
  const dates = getViewDates(config);
  if (
    !dates.length ||
    dates.length > 366 ||
    new Set(dates).size !== dates.length ||
    dates.some((d, i) => i > 0 && d <= dates[i - 1]!)
  )
    throw new RangeError(
      "View dates must be unique, ascending and contain 1–366 dates",
    );
  for (const day of dates) atMinute(day, 0, config.timeZone);
  buildColumns(config);
}
export function resourcesForDate(
  config: CalendarConfig,
  date: DateKey,
): readonly Resource[] {
  return config.resourcesForDate?.(date) ?? config.resources ?? [];
}
export function buildColumns(config: CalendarConfig): Column[] {
  return getViewDates(config).flatMap((date) => {
    const resources = resourcesForDate(config, date);
    if (resources.some((r) => !r.id))
      throw new RangeError(`Resource IDs must be nonempty on ${date}`);
    const ids = new Set(resources.map((r) => r.id));
    if (ids.size !== resources.length)
      throw new RangeError(`Duplicate resource id on ${date}`);
    return resources.length
      ? resources.map((r) => ({
          key: JSON.stringify([date, r.id]),
          date,
          resourceId: r.id,
          title: r.title,
        }))
      : [{ key: JSON.stringify([date]), date, title: "" }];
  });
}
export function splitEvent<E extends CalendarEvent>(
  event: E,
  dates: readonly DateKey[],
  timeZone = defaultTimeZone(),
): Segment<E>[] {
  validateEvent(event);
  return dates.flatMap((date) => {
    const dayStart = atMinute(date, 0, timeZone),
      dayEnd = atMinute(addDays(date, 1), 0, timeZone);
    const start = new Date(Math.max(+event.start, +dayStart)),
      end = new Date(Math.min(+event.end, +dayEnd));
    if (end <= start) return [];
    return [
      {
        event,
        date,
        start,
        end,
        startMinute: +start === +dayStart ? 0 : minuteOfDay(start, timeZone),
        endMinute: +end === +dayEnd ? 1440 : minuteOfDay(end, timeZone),
        continuesBefore: event.start < dayStart,
        continuesAfter: event.end > dayEnd,
      },
    ];
  });
}
/** Interval partitioning with independent overlap clusters; touching endpoints do not overlap. */
export function layoutSegments<E extends CalendarEvent>(
  segments: readonly Segment<E>[],
): PositionedSegment<E>[] {
  const sorted = [...segments].sort(
    (a, b) =>
      a.startMinute - b.startMinute ||
      b.endMinute - a.endMinute ||
      a.event.id.localeCompare(b.event.id),
  );
  const result: PositionedSegment<E>[] = [];
  let cluster: PositionedSegment<E>[] = [],
    laneEnds: number[] = [],
    clusterEnd = -Infinity;
  const flush = () => {
    for (const item of cluster) {
      item.lanes = laneEnds.length;
      item.left = item.lane / item.lanes;
      item.width = 1 / item.lanes;
      result.push(item);
    }
    cluster = [];
    laneEnds = [];
  };
  for (const segment of sorted) {
    if (segment.startMinute >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    let lane = laneEnds.findIndex((end) => end <= segment.startMinute);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = segment.endMinute;
    clusterEnd = Math.max(clusterEnd, segment.endMinute);
    cluster.push({ ...segment, lane, lanes: 1, left: 0, width: 1 });
  }
  flush();
  return result;
}
export function eventsInDay<E extends CalendarEvent>(
  events: readonly E[],
  day: DateKey,
  timeZone = defaultTimeZone(),
): E[] {
  const start = atMinute(day, 0, timeZone),
    end = atMinute(addDays(day, 1), 0, timeZone);
  return events
    .filter((e) => e.start < end && e.end > start)
    .sort(
      (a, b) => Number(!!b.allDay) - Number(!!a.allDay) || +a.start - +b.start,
    );
}

export function eventResourceIds(event: CalendarEvent): readonly string[] {
  return event.resourceId === undefined
    ? []
    : typeof event.resourceId === "string"
      ? [event.resourceId]
      : event.resourceId;
}
export function matchesResource(
  event: CalendarEvent,
  resourceId?: string,
): boolean {
  return (
    resourceId === undefined || eventResourceIds(event).includes(resourceId)
  );
}
