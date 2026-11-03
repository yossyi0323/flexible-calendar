import { test, expect } from "@playwright/test";
import type { CalendarHandle } from "../../src/dom/index.js";
declare global {
  interface Window {
    demoCalendar: CalendarHandle;
  }
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".fc-calendar")).toBeVisible();
});
test("event updates preserve unrelated columns, header, scroller and scroll position", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const c = window.demoCalendar;
    const columns = [...document.querySelectorAll(".fc-time-column")];
    const header = document.querySelector(".fc-toolbar");
    const scroller = document.querySelector(".fc-scroller")!;
    scroller.scrollTop = 300;
    c.update({
      events: c
        .getOptions()
        .events.map((e) =>
          e.id === "2" ? { ...e, title: "Updated title" } : e,
        ),
    });
    const next = [...document.querySelectorAll(".fc-time-column")];
    return {
      retained: columns.map((n, i) => n === next[i]),
      header: header === document.querySelector(".fc-toolbar"),
      scroller: scroller === document.querySelector(".fc-scroller"),
      top: scroller.scrollTop,
    };
  });
  expect(result).toEqual({
    retained: [true, false, true, true, true, true],
    header: true,
    scroller: true,
    top: 300,
  });
  await expect(page.locator('[data-event-id="2"]')).toContainText(
    "Updated title",
  );
});
test("callback-only updates retain events and invoke the latest callback", async ({
  page,
}) => {
  expect(
    await page.evaluate(() => {
      const event = document.querySelector<HTMLElement>('[data-event-id="2"]')!;
      let selected = "";
      window.demoCalendar.update({
        onSelectEvent: (e) => {
          selected = e.id;
        },
      });
      event.click();
      return {
        same: event === document.querySelector('[data-event-id="2"]'),
        selected,
      };
    }),
  ).toEqual({ same: true, selected: "2" });
});
test("resource moves replace source and destination and deletion removes all fragments", async ({
  page,
}) => {
  await page.evaluate(() => {
    const c = window.demoCalendar;
    c.update({
      events: c
        .getOptions()
        .events.map((e) => (e.id === "2" ? { ...e, resourceId: "plan" } : e)),
    });
  });
  await expect(
    page.locator(".fc-time-column").nth(0).locator('[data-event-id="2"]'),
  ).toHaveCount(1);
  await expect(
    page.locator(".fc-time-column").nth(1).locator('[data-event-id="2"]'),
  ).toHaveCount(0);
  await page.evaluate(() => {
    const c = window.demoCalendar;
    c.update({ events: c.getOptions().events.filter((e) => e.id !== "5") });
  });
  await expect(page.locator('[data-event-id="5"]')).toHaveCount(0);
});

test("reordering equal-time all-day events updates their displayed order", async ({
  page,
}) => {
  expect(
    await page.evaluate(() => {
      const c = window.demoCalendar;
      const original = c.getOptions().events.find((e) => e.id === "6")!;
      const a = { ...original, id: "order-a" },
        b = { ...original, id: "order-b" };
      c.update({ events: [a, b] });
      c.update({ events: [b, a] });
      return [
        ...document.querySelectorAll<HTMLElement>(".fc-all-day-cell .fc-event"),
      ].map((e) => e.dataset.eventId);
    }),
  ).toEqual(["order-b", "order-a"]);
});
