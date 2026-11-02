import { describe, it, expect } from "vitest";
import {
  addDays,
  atMinute,
  dateKey,
  minuteOfDay,
  visibleDates,
  navigate,
  buildColumns,
  splitEvent,
  layoutSegments,
  eventsInDay,
  validateConfig,
  moveEvent,
  resizeEvent,
  snapMinute,
  type CalendarEvent,
} from "../src/core/index.js";
const zone = "Asia/Tokyo",
  day = "2026-11-03";
const at = (minute: number, offset = 0) =>
  atMinute(addDays(day, offset), minute, zone);
const event = (id: string, start: number, end: number): CalendarEvent => ({
  id,
  title: id,
  start: at(start),
  end: at(end),
});
describe("civil dates and zones", () => {
  it("roundtrips Tokyo wall time without the host timezone", () => {
    expect(at(540).toISOString()).toBe("2026-11-03T00:00:00.000Z");
    expect(dateKey(at(0), zone)).toBe(day);
    expect(minuteOfDay(at(735), zone)).toBe(735);
  });
  it("adds calendar days across year and leap boundaries", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("supports midnight and negative minute offsets", () => {
    expect(at(1440)).toEqual(at(0, 1));
    expect(at(-30)).toEqual(at(1410, -1));
  });
  it("uses actual 23 / 25 hour day lengths across DST", () => {
    const ny = "America/New_York";
    expect(
      +atMinute("2026-03-09", 0, ny) - +atMinute("2026-03-08", 0, ny),
    ).toBe(23 * 3600000);
    expect(
      +atMinute("2026-11-02", 0, ny) - +atMinute("2026-11-01", 0, ny),
    ).toBe(25 * 3600000);
  });
  it("resolves missing / ambiguous wall times explicitly", () => {
    expect(atMinute("2026-03-08", 150, "America/New_York").toISOString()).toBe(
      "2026-03-08T07:30:00.000Z",
    );
    expect(atMinute("2026-11-01", 90, "America/New_York").toISOString()).toBe(
      "2026-11-01T05:30:00.000Z",
    );
  });
  it("rejects bad zones", () =>
    expect(() => atMinute(day, 0, "Mars/Olympus")).toThrow());
});
describe("views and navigation", () => {
  it.each([
    ["day", 1],
    ["week", 7],
    ["work-week", 5],
    ["month", 42],
    ["agenda", 3],
    ["vertical", 3],
  ] as const)("%s has %i days", (view, n) =>
    expect(visibleDates(at(0), view, 3, 1, zone)).toHaveLength(n),
  );
  it("respects week start and skips weekends", () => {
    expect(visibleDates(at(0), "week", 3, 0, zone)[0]).toBe("2026-11-01");
    expect(visibleDates(at(0), "work-week", 3, 0, zone)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
    ]);
  });
  it("navigates month ends without skipping February", () =>
    expect(
      dateKey(
        navigate(atMinute("2026-01-31", 0, zone), "month", 1, 3, zone),
        zone,
      ),
    ).toBe("2026-02-28"));
  it("creates real date × resource columns", () => {
    const columns = buildColumns({
      date: at(0),
      events: [],
      view: "vertical",
      days: 3,
      timeZone: zone,
      resources: [
        { id: "plan", title: "Plan" },
        { id: "do", title: "Do" },
      ],
    });
    expect(columns).toHaveLength(6);
    expect(columns[2]).toMatchObject({
      date: "2026-11-04",
      resourceId: "plan",
    });
    expect(new Set(columns.map((c) => c.key)).size).toBe(6);
  });
  it("allows resources to differ per date", () => {
    expect(
      buildColumns({
        date: at(0),
        events: [],
        view: "vertical",
        days: 2,
        timeZone: zone,
        resourcesForDate: (d) =>
          d === day
            ? [
                { id: "a", title: "A" },
                { id: "b", title: "B" },
              ]
            : [{ id: "b", title: "B" }],
      }),
    ).toHaveLength(3);
  });
});
describe("segments and overlap layout", () => {
  it("splits midnight spans without changing event identity", () => {
    const source = event("overnight", 1380, 1500),
      segments = splitEvent(source, [day, addDays(day, 1)], zone);
    expect(segments.map((s) => [s.startMinute, s.endMinute])).toEqual([
      [1380, 1440],
      [0, 60],
    ]);
    expect(segments[0]!.continuesAfter).toBe(true);
    expect(segments[1]!.continuesBefore).toBe(true);
    expect(segments[1]!.event).toBe(source);
    expect(source.end).toEqual(at(1500));
  });
  it("treats event ends as exclusive", () => {
    const source = event("ends-at-midnight", 1380, 1440);
    expect(splitEvent(source, [day, addDays(day, 1)], zone)).toHaveLength(1);
    expect(eventsInDay([source], addDays(day, 1), zone)).toHaveLength(0);
  });
  it("partitions overlaps and resets width between clusters", () => {
    const events = [
      event("a", 540, 600),
      event("b", 570, 630),
      event("c", 600, 660),
      event("d", 720, 780),
    ];
    const layout = layoutSegments(
      events.flatMap((e) => splitEvent(e, [day], zone)),
    );
    expect(layout.map((s) => [s.event.id, s.lane, s.lanes])).toEqual([
      ["a", 0, 2],
      ["b", 1, 2],
      ["c", 0, 2],
      ["d", 0, 1],
    ]);
  });
  it("supports full nesting and identical starts deterministically", () => {
    const layout = layoutSegments(
      [
        event("a", 540, 780),
        event("b", 540, 600),
        event("c", 570, 590),
      ].flatMap((e) => splitEvent(e, [day], zone)),
    );
    expect(layout.map((s) => s.lanes)).toEqual([3, 3, 3]);
    expect(layout.every((s) => s.width === 1 / 3)).toBe(true);
  });
  it("touching endpoints are not overlaps", () => {
    expect(
      layoutSegments(
        [event("a", 540, 600), event("b", 600, 660)].flatMap((e) =>
          splitEvent(e, [day], zone),
        ),
      ).every((s) => s.width === 1),
    ).toBe(true);
  });
  it("handles 1000 events with bounded lane coordinates", () => {
    const result = layoutSegments(
      Array.from({ length: 1000 }, (_, i) =>
        event(String(i), i % 1300, (i % 1300) + 60),
      ).flatMap((e) => splitEvent(e, [day], zone)),
    );
    expect(result).toHaveLength(1000);
    expect(
      result.every((s) => s.left >= 0 && s.left + s.width <= 1.000001),
    ).toBe(true);
  });
});
describe("changes and validation", () => {
  it("moves across days/resources and preserves elapsed duration", () => {
    const source = event("a", 1380, 1500),
      change = moveEvent(source, addDays(day, 2), 600, zone, "do");
    expect(change.start).toEqual(at(600, 2));
    expect(change.end).toEqual(at(720, 2));
    expect(change.resourceId).toBe("do");
    expect(source.start).toEqual(at(1380));
  });
  it("clamps resizes to a positive minimum", () => {
    const source = event("a", 540, 600);
    expect(resizeEvent(source, "end", day, 500, zone, 30).end).toEqual(at(570));
    expect(resizeEvent(source, "start", day, 700, zone, 30).start).toEqual(
      at(570),
    );
  });
  it("snaps to configured boundaries", () => {
    expect(snapMinute(548, 15)).toBe(555);
    expect(snapMinute(-20, 30)).toBe(0);
    expect(snapMinute(1500, 30)).toBe(1440);
  });
  it.each([
    { step: 0 },
    { days: 0 },
    { minMinute: 120, maxMinute: 60 },
    { weekStartsOn: 7 },
    { days: 2.5 },
  ])("rejects invalid configuration %o", (invalid) =>
    expect(() =>
      validateConfig({ date: at(0), events: [], ...invalid }),
    ).toThrow(),
  );
  it("rejects duplicate IDs and backwards ranges", () => {
    expect(() =>
      validateConfig({
        date: at(0),
        events: [event("a", 1, 2), event("a", 3, 4)],
      }),
    ).toThrow("Duplicate");
    expect(() => splitEvent(event("bad", 600, 500), [day], zone)).toThrow(
      "Invalid",
    );
  });
});
describe("all-day moves across DST", () => {
  it("preserves civil-day duration when moving into spring forward", () => {
    const ny = "America/New_York";
    const source = {
      id: "day",
      title: "Day",
      start: atMinute("2026-03-07", 0, ny),
      end: atMinute("2026-03-08", 0, ny),
      allDay: true,
    };
    const change = moveEvent(source, "2026-03-08", 0, ny);
    expect(change.end).toEqual(atMinute("2026-03-09", 0, ny));
    expect(+change.end - +change.start).toBe(23 * 3600000);
  });
});
it("resizes all-day events with civil-day minimums on short DST days", () => {
  const zone = "America/New_York";
  const source = {
    id: "dst",
    title: "DST",
    start: atMinute("2026-03-08", 0, zone),
    end: atMinute("2026-03-09", 0, zone),
    allDay: true,
  };
  expect(resizeEvent(source, "end", "2026-03-08", 0, zone, 1440).end).toEqual(
    source.end,
  );
});
