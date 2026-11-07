import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".fc-time-column").first()).toBeVisible();
});

for (const theme of ["light", "dark"] as const)
  for (const style of ["lines", "labels", "ticks"] as const)
    test(`${theme} ${style}: wall-clock alignment, background and hit testing`, async ({
      page,
    }, testInfo) => {
      await page.evaluate(
        ({ theme, style }) => {
          window.demoCalendar.update({
            theme,
            events: [],
            view: "vertical",
            days: 7,
            minMinute: 390,
            maxMinute: 1140,
            hourHeight: 80,
            step: 15,
            timeGridGuides: { interval: 180, style },
            columnStyle: () => ({
              style: {
                backgroundImage:
                  "linear-gradient(transparent, rgb(100, 120, 150))",
              },
            }),
          });
          window.demoCalendar.scrollToTime(540);
        },
        { theme, style },
      );
      const columns = page.locator(".fc-time-column");
      await expect(columns).toHaveCount(14);
      await expect(page.locator(".fc-time-guide")).toHaveCount(56);
      const column = columns.last();
      const guide = column.locator(".fc-time-guide").first();
      await expect(guide).toHaveCSS("top", "200px");
      await expect(column.locator(".fc-time-guides")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      await expect(column.locator(".fc-time-guides")).toHaveAttribute(
        "inert",
        "",
      );
      await expect(column).toHaveCSS("background-image", /linear-gradient/);
      await page.locator(".fc-scroller").evaluate((n) => {
        n.scrollLeft = n.scrollWidth;
      });
      await page
        .locator(".fc-calendar")
        .screenshot({ path: testInfo.outputPath("guides.png") });
      const hit = await guide.evaluate((n) => {
        const r = n.getBoundingClientRect();
        return document.elementFromPoint(r.x + 30, r.y + 5)?.className;
      });
      expect(hit).toBe("fc-time-column");
      if (style === "labels") await expect(guide).toHaveText("09:00");
      await page.evaluate(() =>
        window.demoCalendar.update({ hourHeight: 60, step: 30 }),
      );
      await expect(guide).toHaveCSS("top", "150px");
    });

test("partial updates preserve one guide layer, and disabling removes it", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.demoCalendar.update({
      timeGridGuides: { interval: 360, style: "labels" },
    }),
  );
  const count = await page.locator(".fc-time-column").count();
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const c = window.demoCalendar;
      c.update({
        events: c
          .getOptions()
          .events.map((e) => ({ ...e, title: e.title + "!" })),
      });
    });
    await expect(page.locator(".fc-time-guides")).toHaveCount(count);
    await expect(page.locator(".fc-time-guide")).toHaveCount(count * 4);
  }
  await expect(page.locator(".fc-timed-event").first()).toHaveCSS(
    "z-index",
    "2",
  );
  await page.evaluate(() =>
    window.demoCalendar.update({ timeGridGuides: false }),
  );
  await expect(page.locator(".fc-time-guides")).toHaveCount(0);
});

for (const date of ["2026-03-08T12:00:00-04:00", "2026-11-01T12:00:00-05:00"])
  test(`DST wall-clock positions ${date}`, async ({ page }) => {
    await page.evaluate(
      (date) =>
        window.demoCalendar.update({
          date: new Date(date),
          timeZone: "America/New_York",
          view: "day",
          resources: [],
          events: [],
          timeGridGuides: { interval: 60, style: "labels" },
        }),
      date,
    );
    const guides = page.locator(".fc-time-guide");
    await expect(guides).toHaveCount(24);
    await expect(guides.nth(2)).toHaveText("02:00");
    await expect(guides.nth(2)).toHaveCSS("top", "128px");
    await expect(guides.nth(3)).toHaveText("03:00");
    await expect(guides.nth(3)).toHaveCSS("top", "192px");
  });

test("overnight labels use column context and restore after cancellation", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.demoCalendar.update({
      view: "day",
      resources: [],
      events: [],
      minMinute: 360,
      timeGridGuides: {
        interval: 360,
        style: "labels",
        renderLabel: ({ column, minute, dayOffset }) => {
          const node = document.createElement("button");
          node.textContent = `${column.date}/${minute}/${dayOffset}`;
          return node;
        },
      },
      onSelectSlot() {},
    });
    window.demoCalendar.scrollToTime(1320);
  });
  const column = page.locator(".fc-time-column");
  await expect(column.locator(".fc-time-guide")).toHaveCount(3);
  const p = await column.evaluate((n) => {
    const r = n.getBoundingClientRect();
    return { x: r.x + 40, y: r.y + ((1380 - 360) / 60) * 64 };
  });
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x, p.y - 10);
  await expect(column.locator(".fc-time-guides")).toHaveCount(2);
  await expect(column.locator(".fc-time-guide")).toHaveCount(7);
  const midnight = column.locator(".fc-time-guide").nth(3);
  await expect(midnight).toHaveText("2026-11-03/0/1");
  await expect(midnight).toHaveCSS("top", "1152px");
  await midnight.locator("button").evaluate((n) => n.focus());
  await expect(midnight.locator("button")).not.toBeFocused();
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(column.locator(".fc-time-guides")).toHaveCount(1);
  await expect(column.locator(".fc-time-guide")).toHaveCount(3);
});

test("rejects invalid intervals without replacing the calendar", async ({
  page,
}) => {
  const errors = await page.evaluate(() =>
    [0, -60, 180.5, 181, Infinity, NaN].map((interval) => {
      try {
        window.demoCalendar.update({ timeGridGuides: { interval } });
        return false;
      } catch (e) {
        return e instanceof RangeError;
      }
    }),
  );
  expect(errors).toEqual(Array(6).fill(true));
  await expect(page.locator(".fc-time-column").first()).toBeVisible();
});
