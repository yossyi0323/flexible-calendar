import { Temporal } from "@js-temporal/polyfill";
import type { DateKey, View, CalendarConfig } from "./types.js";
export const MINUTES_PER_DAY = 1440;
export const MS_PER_MINUTE = 60_000;
export const defaultTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;
export function zoned(date: Date, timeZone = defaultTimeZone()) {
  return Temporal.Instant.fromEpochMilliseconds(
    date.getTime(),
  ).toZonedDateTimeISO(timeZone);
}
export function dateKey(date: Date, timeZone = defaultTimeZone()): DateKey {
  return zoned(date, timeZone).toPlainDate().toString();
}
export function addDays(date: DateKey, days: number): DateKey {
  return Temporal.PlainDate.from(date).add({ days }).toString();
}
export function atMinute(
  date: DateKey,
  minute: number,
  timeZone = defaultTimeZone(),
): Date {
  const day = Temporal.PlainDate.from(date).add({
    days: Math.floor(minute / MINUTES_PER_DAY),
  });
  const normalized =
    ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const time = day.toPlainDateTime({
    hour: Math.floor(normalized / 60),
    minute: Math.floor(normalized % 60),
  });
  // Temporal's compatible policy: spring gaps shift forward, fall folds choose the earlier instant.
  return new Date(
    time.toZonedDateTime(timeZone, { disambiguation: "compatible" })
      .epochMilliseconds,
  );
}
export function minuteOfDay(date: Date, timeZone = defaultTimeZone()): number {
  const t = zoned(date, timeZone);
  return t.hour * 60 + t.minute + t.second / 60;
}
export function dayOfWeek(date: DateKey): number {
  return Temporal.PlainDate.from(date).dayOfWeek % 7;
}
export function weekStart(date: DateKey, startsOn = 1): DateKey {
  return addDays(date, -((dayOfWeek(date) - startsOn + 7) % 7));
}
export function visibleDates(
  date: Date,
  view: View,
  days = 3,
  weekStartsOn = 1,
  timeZone = defaultTimeZone(),
): DateKey[] {
  let start = dateKey(date, timeZone);
  let count = 1;
  if (view === "week" || view === "work-week") {
    start = weekStart(start, weekStartsOn);
    count = 7;
  }
  if (view === "vertical" || view === "agenda") count = days;
  if (view === "month") {
    start = weekStart(
      Temporal.PlainDate.from(start).with({ day: 1 }).toString(),
      weekStartsOn,
    );
    count = 42;
  }
  return Array.from({ length: count }, (_, i) => addDays(start, i)).filter(
    (d) => view !== "work-week" || ![0, 6].includes(dayOfWeek(d)),
  );
}
export function navigate(
  date: Date,
  view: View,
  direction: -1 | 1,
  days = 3,
  timeZone = defaultTimeZone(),
): Date {
  const current = Temporal.PlainDate.from(dateKey(date, timeZone));
  const next =
    view === "month"
      ? current.add({ months: direction })
      : current.add({
          days:
            direction *
            (view === "day"
              ? 1
              : view === "week" || view === "work-week"
                ? 7
                : days),
        });
  return atMinute(next.toString(), 0, timeZone);
}
export function formatDate(
  date: Date,
  locale: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
}

export function differenceInDays(from: DateKey, to: DateKey): number {
  return Temporal.PlainDate.from(from).until(Temporal.PlainDate.from(to), {
    largestUnit: "day",
  }).days;
}
export function shiftDate(
  date: Date,
  days: number,
  timeZone = defaultTimeZone(),
): Date {
  return new Date(zoned(date, timeZone).add({ days }).epochMilliseconds);
}

export function getViewDates(config: CalendarConfig): DateKey[] {
  const custom = config.customViews?.[config.view ?? "week"];
  if (custom)
    return [...custom.dates(config.date, config.timeZone ?? defaultTimeZone())];
  return visibleDates(
    config.date,
    config.view ?? "week",
    config.days,
    config.weekStartsOn,
    config.timeZone,
  );
}
export function navigateCalendar(
  config: CalendarConfig,
  direction: -1 | 1,
): Date {
  const custom = config.customViews?.[config.view ?? "week"];
  return custom
    ? custom.navigate(
        config.date,
        direction,
        config.timeZone ?? defaultTimeZone(),
      )
    : navigate(
        config.date,
        config.view ?? "week",
        direction,
        config.days,
        config.timeZone,
      );
}
