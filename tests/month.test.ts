import { expect, it } from "vitest";
import {
  atMinute,
  addDays,
  layoutMonthWeek,
  getViewDates,
  type CalendarEvent,
} from "../src/core/index.js";
const zone = "Asia/Tokyo",
  first = "2026-11-02";
const dates = Array.from({ length: 7 }, (_, i) => addDays(first, i));
const event = (id: string, start: number, end: number): CalendarEvent => ({
  id,
  title: id,
  start: atMinute(first, start, zone),
  end: atMinute(first, end, zone),
  allDay: true,
});
it("renders one multi-day span with an exclusive end", () => {
  const result = layoutMonthWeek([event("a", 1440, 4 * 1440)], dates, zone);
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ startColumn: 1, endColumn: 4, lane: 0 });
});
it("packs overlapping spans into distinct lanes and reuses a free lane", () => {
  const result = layoutMonthWeek(
    [
      event("a", 0, 3 * 1440),
      event("b", 1440, 4 * 1440),
      event("c", 3 * 1440, 5 * 1440),
    ],
    dates,
    zone,
  );
  expect(result.map((s) => [s.event.id, s.lane])).toEqual([
    ["a", 0],
    ["b", 1],
    ["c", 0],
  ]);
});
it("clips across week edges without changing the original event", () => {
  const source = event("a", -1440, 9 * 1440);
  const result = layoutMonthWeek([source], dates, zone);
  expect(result[0]).toMatchObject({
    startColumn: 0,
    endColumn: 7,
    continuesBefore: true,
    continuesAfter: true,
  });
  expect(result[0]!.event).toBe(source);
});
it("uses four, five or six weeks, with an explicit fixed six-week option", () => {
  const config = {
    events: [],
    view: "month",
    date: atMinute("2027-02-01", 0, zone),
    timeZone: zone,
  };
  expect(getViewDates(config)).toHaveLength(28);
  expect(getViewDates({ ...config, monthFixedWeeks: true })).toHaveLength(42);
  expect(
    getViewDates({ ...config, date: atMinute("2026-11-01", 0, zone) }),
  ).toHaveLength(42);
  expect(
    getViewDates({ ...config, date: atMinute("2026-06-01", 0, zone) }),
  ).toHaveLength(35);
});
it("DST does not alter the number of occupied civil days", () => {
  const zone = "America/New_York";
  const dates = ["2026-03-07", "2026-03-08", "2026-03-09"];
  const e = {
    id: "dst",
    title: "DST",
    start: atMinute(dates[0]!, 0, zone),
    end: atMinute(dates[2]!, 0, zone),
    allDay: true,
  };
  expect(layoutMonthWeek([e], dates, zone)[0]).toMatchObject({
    startColumn: 0,
    endColumn: 2,
  });
});
