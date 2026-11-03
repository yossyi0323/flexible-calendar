import { test, expect } from "@playwright/test";

for (const direction of ["ltr", "rtl"] as const) {
  test(`${direction} horizontal scrolling keeps all gutter rows pinned and date columns aligned`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 760, height: 800 });
    await page.goto("/");
    await expect(page.locator(".fc-calendar")).toBeVisible();
    await page.evaluate(
      (direction) =>
        window.demoCalendar.update({ direction, columnWidth: 200 }),
      direction,
    );
    const scroller = page.locator(".fc-scroller");
    for (const offset of [100, 260, 480, 0]) {
      await scroller.evaluate(
        (node, offset) => {
          node.scrollLeft = offset;
          node.scrollTop = 640;
        },
        direction === "rtl" ? -offset : offset,
      );
      await expect
        .poll(async () =>
          scroller.evaluate((node) => Math.abs(node.scrollLeft)),
        )
        .toBe(offset);
      const geometry = await page.evaluate(() => {
        const rect = (selector: string) => {
          const r = document.querySelector(selector)!.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width };
        };
        const gutter = document
          .querySelector(".fc-zone")!
          .getBoundingClientRect();
        const allDay = document
          .querySelector(".fc-all-day-row > .fc-gutter")!
          .getBoundingClientRect();
        return {
          scroll: rect(".fc-scroller"),
          zone: rect(".fc-zone"),
          allDay: rect(".fc-all-day-row > .fc-gutter"),
          time: rect(".fc-time-gutter"),
          header: rect(".fc-column-header"),
          cell: rect(".fc-all-day-cell"),
          column: rect(".fc-time-column"),
          zoneOnTop:
            document
              .elementFromPoint(
                gutter.left + gutter.width / 2,
                gutter.top + gutter.height / 2,
              )
              ?.closest(".fc-zone") != null,
          allDayOnTop:
            document
              .elementFromPoint(
                allDay.left + allDay.width / 2,
                allDay.top + allDay.height / 2,
              )
              ?.closest(".fc-gutter") != null,
        };
      });
      const edge = direction === "rtl" ? "right" : "left";
      for (const key of ["zone", "allDay", "time"] as const) {
        expect(
          Math.abs(geometry[key][edge] - geometry.scroll[edge]),
          JSON.stringify({ key, geometry }),
        ).toBeLessThan(16);
        expect(Math.abs(geometry[key].left - geometry.time.left)).toBeLessThan(
          1,
        );
        expect(geometry[key].width).toBe(64);
      }
      expect(
        Math.abs(geometry.header.left - geometry.column.left),
      ).toBeLessThan(1);
      expect(Math.abs(geometry.cell.left - geometry.column.left)).toBeLessThan(
        1,
      );
      expect(geometry.zoneOnTop).toBe(true);
      expect(geometry.allDayOnTop).toBe(true);
    }
  });
}

test("many all-day events remain vertically scrollable without moving the corner label", async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 800 });
  await page.goto("/");
  await expect(page.locator(".fc-calendar")).toBeVisible();
  await page.evaluate(() =>
    window.demoCalendar.update({
      columnWidth: 200,
      events: Array.from({ length: 20 }, (_, i) => ({
        id: `all-${i}`,
        title: `All day ${i}`,
        start: new Date("2026-11-02T15:00:00Z"),
        end: new Date("2026-11-03T15:00:00Z"),
        allDay: true,
        resourceId: "do",
      })),
    }),
  );
  const cell = page.locator(".fc-all-day-cell").nth(1);
  expect(
    await cell.evaluate(
      (node) =>
        node.scrollHeight > node.clientHeight && node.clientHeight <= 160,
    ),
  ).toBe(true);
  await cell.evaluate((node) => (node.scrollTop = node.scrollHeight));
  expect(await cell.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await page.locator(".fc-scroller").evaluate((node) => {
    node.scrollLeft = 150;
    node.scrollTop = 640;
  });
  const gutter = (await page
    .locator(".fc-all-day-row > .fc-gutter")
    .boundingBox())!;
  const scroll = (await page.locator(".fc-scroller").boundingBox())!;
  expect(Math.abs(gutter.x - scroll.x)).toBeLessThan(1);
  await expect(cell.locator('[data-event-id="all-19"]')).toBeInViewport();
});
