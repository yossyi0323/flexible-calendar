import { test, expect, type Page } from "@playwright/test";
import type { CalendarHandle } from "../../src/dom/index.js";
declare global {
  interface Window {
    demoCalendar: CalendarHandle;
  }
}
async function point(page: Page, minute: number) {
  return page
    .locator(".fc-time-column")
    .first()
    .evaluate((node, minute) => {
      const r = node.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + (minute / 60) * 64 };
    }, minute);
}
async function extend(page: Page, until: number) {
  const scroller = page.locator(".fc-scroller");
  const before = await scroller.evaluate((n) => n.scrollTop);
  const box = await scroller.boundingBox();
  const x = (await point(page, 0)).x;
  await page.mouse.move(x, box!.y + box!.height - 4, { steps: 8 });
  await expect
    .poll(() => scroller.evaluate((n) => n.scrollTop))
    .toBeGreaterThan(before + 200);
  // Leave the auto-scroll edge before measuring the final pointer coordinate.
  await page.mouse.move(x, box!.y + box!.height / 2);
  // Stop at the desired wall time after the pointer-driven scroll exposes it.
  const target = await point(page, until);
  await page.mouse.move(target.x, target.y, { steps: 2 });
  await page.mouse.up();
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".fc-calendar")).toBeVisible();
  await page.evaluate(() => {
    window.demoCalendar.update({
      onEventChange: (change) => {
        window.demoCalendar.update({
          events: window.demoCalendar
            .getOptions()
            .events.map((e) =>
              e.id === change.event.id
                ? { ...e, start: change.start, end: change.end }
                : e,
            ),
        });
      },
      view: "day",
      resources: [],
      events: [
        {
          id: "night",
          title: "Night",
          start: new Date("2026-11-03T14:00:00Z"),
          end: new Date("2026-11-03T14:30:00Z"),
        },
      ],
    });
    window.demoCalendar.scrollToTime(1320);
  });
});
for (const hour of [1, 2])
  test(`resize downward through midnight to next-day ${hour}:00`, async ({
    page,
  }) => {
    const handle = await page
      .locator('[data-event-id="night"] [data-edge="end"]')
      .boundingBox();
    await page.mouse.move(
      handle!.x + handle!.width / 2,
      handle!.y + handle!.height / 2,
    );
    await page.mouse.down();
    await expect(page.locator(".fc-next-day-label")).toHaveCount(24);
    await extend(page, 1440 + hour * 60);
    expect(
      await page.evaluate(() => {
        const e = window.demoCalendar
          .getOptions()
          .events.find((e) => e.id === "night")!;
        return [e.start.toISOString(), e.end.toISOString()];
      }),
    ).toEqual([
      "2026-11-03T14:00:00.000Z",
      `2026-11-03T${15 + hour}:00:00.000Z`,
    ]);
    await expect(page.locator(".fc-next-day-label")).toHaveCount(0);
    await expect(page.locator("#editor")).not.toBeVisible();
  });
test("selection can continue downward into next-day 02:00", async ({
  page,
}) => {
  await page.evaluate(() => window.demoCalendar.update({ events: [] }));
  const a = await point(page, 1380);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await extend(page, 1560);
  await expect(page.locator("#event-start")).toHaveAttribute(
    "data-date",
    "2026-11-03",
  );
  await expect(page.locator("#event-start-time")).toHaveValue("23:00");
  await expect(page.locator("#event-end")).toHaveAttribute(
    "data-date",
    "2026-11-04",
  );
  await expect(page.locator("#event-end-time")).toHaveValue("02:00");
});
test("Escape restores the normal time axis and leaves the interval unchanged", async ({
  page,
}) => {
  const handle = await page
    .locator('[data-event-id="night"] [data-edge="end"]')
    .boundingBox();
  await page.mouse.move(
    handle!.x + handle!.width / 2,
    handle!.y + handle!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + 20);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator(".fc-next-day-label")).toHaveCount(0);
  expect(
    await page
      .locator(".fc-time-body")
      .evaluate((n) => n.getBoundingClientRect().height),
  ).toBe(1536);
  expect(
    await page.evaluate(() =>
      window.demoCalendar.getOptions().events[0]!.end.toISOString(),
    ),
  ).toBe("2026-11-03T14:30:00.000Z");
});

test("pointer selection hides the keyboard cursor and keyboard navigation resumes after Escape", async ({
  page,
}) => {
  const column = page.locator(".fc-time-column");
  await page.locator(".fc-all-day-cell").focus();
  await page.keyboard.press("Tab");
  await expect(column).toBeFocused();
  const cursor = column.locator(".fc-keyboard-cursor");
  await expect(cursor).toBeVisible();
  await page.evaluate(() => window.demoCalendar.scrollToTime(1320));
  const a = await point(page, 1425);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x, a.y - 24);
  await expect(column.locator(".fc-preview")).toBeVisible();
  await expect(cursor).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.keyboard.press("ArrowDown");
  await expect(cursor).toBeVisible();

  // Focusing the column from outside with the pointer must also leave it clear.
  await page.locator(".fc-all-day-cell").focus();
  await page.evaluate(() => window.demoCalendar.scrollToTime(1320));
  const b = await point(page, 1425);
  await page.mouse.move(b.x, b.y);
  await page.mouse.down();
  await expect(column).toBeFocused();
  await expect(cursor).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.locator(".fc-all-day-cell").focus();
  await page.keyboard.press("Tab");
  await expect(cursor).toBeVisible();
});

for (const finish of ["release", "cancel"] as const)
  test(`next-day occupancy follows the resource column and disappears on ${finish}`, async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.demoCalendar.update({
        resources: [
          { id: "a", title: "A" },
          { id: "b", title: "B" },
        ],
        events: [
          {
            id: "night",
            title: "Continuing",
            resourceId: "a",
            start: new Date("2026-11-03T23:45:00+09:00"),
            end: new Date("2026-11-04T00:30:00+09:00"),
          },
          {
            id: "occupied",
            title: "Occupied",
            resourceId: "b",
            start: new Date("2026-11-04T01:00:00+09:00"),
            end: new Date("2026-11-04T02:00:00+09:00"),
          },
          {
            id: "later",
            title: "Later",
            resourceId: "a",
            start: new Date("2026-11-05T01:00:00+09:00"),
            end: new Date("2026-11-05T02:00:00+09:00"),
          },
        ],
        onSelectSlot() {},
      });
      window.demoCalendar.scrollToTime(1320);
    });
    const a = await point(page, 1410);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(a.x, a.y - 12);
    const temporary = page.locator(".fc-next-day-event");
    await expect(temporary).toHaveCount(1);
    const continuing = page.locator(
      '[data-resource-id="a"] > [data-event-id="night"]',
    );
    await expect(continuing).toContainText("Continuing");
    await expect(continuing).not.toHaveClass(/fc-continues-after/);
    await expect(continuing).toHaveCSS("top", "1520px");
    await expect(continuing).toHaveCSS("height", "48px");
    const occupied = page.locator(
      '[data-resource-id="b"] > .fc-next-day-event',
    );
    await expect(occupied).toHaveText("Occupied");
    await expect(occupied).toHaveCSS("top", "1600px");
    await expect(occupied).toHaveCSS("height", "64px");
    await expect(occupied).toHaveCSS("pointer-events", "none");
    if (finish === "cancel") await page.keyboard.press("Escape");
    await page.mouse.up();
    await expect(temporary).toHaveCount(0);
    await expect(continuing).toHaveClass(/fc-continues-after/);
    await expect(continuing).toHaveCSS("height", "16px");
  });

for (const theme of ["light", "dark"] as const)
  test(`continuous overnight boxes share overlap lanes in ${theme} theme`, async ({
    page,
  }) => {
    await page.evaluate((theme) => {
      window.demoCalendar.update({
        theme,
        minMinute: 1200,
        events: [
          {
            id: "across",
            title: "Same title",
            start: new Date("2026-11-03T23:00:00+09:00"),
            end: new Date("2026-11-04T02:00:00+09:00"),
          },
          {
            id: "next",
            title: "Same title",
            start: new Date("2026-11-04T00:30:00+09:00"),
            end: new Date("2026-11-04T01:30:00+09:00"),
          },
          {
            id: "midnight",
            title: "Ends at midnight",
            start: new Date("2026-11-03T22:00:00+09:00"),
            end: new Date("2026-11-04T00:00:00+09:00"),
          },
        ],
        onSelectSlot() {},
      });
      window.demoCalendar.scrollToTime(1200);
    }, theme);
    const original = page.locator('[data-event-id="across"]');
    const before = await original.getAttribute("style");
    const column = await page.locator(".fc-time-column").boundingBox();
    await page.mouse.move(column!.x + 10, column!.y + 10);
    await page.mouse.down();
    await expect(page.locator(".fc-overnight-drag")).toHaveCount(1);
    await expect(original).toHaveCount(1);
    await expect(original).toHaveCSS("top", "192px");
    await expect(original).toHaveCSS("height", "192px");
    await expect(original).not.toHaveClass(/fc-continues-after/);
    await expect(page.locator('[data-event-id="midnight"]')).toHaveCSS(
      "height",
      "128px",
    );
    const next = page.locator(".fc-next-day-event");
    await expect(next).toHaveCount(1);
    await expect(next).toHaveText("Same title");
    const a = await original.boundingBox(),
      b = await next.boundingBox();
    expect(
      Math.min(a!.x + a!.width, b!.x + b!.width) - Math.max(a!.x, b!.x),
    ).toBeLessThanOrEqual(0);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expect(original).toHaveAttribute("style", before!);
    await expect(original).toHaveClass(/fc-continues-after/);
    await expect(next).toHaveCount(0);
  });
