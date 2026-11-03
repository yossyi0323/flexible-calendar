import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { CalendarHandle } from "../../src/dom/index.js";
declare global {
  interface Window {
    demoCalendar: CalendarHandle;
  }
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Month", exact: true }).click();
});
test("midnight event is a single two-day bar and spans exact date columns", async ({
  page,
}) => {
  const bar = page.locator('.fc-month-event[data-event-id="5"]');
  await expect(bar).toHaveCount(1);
  await expect(bar).toHaveAttribute("data-span-days", "2");
  const bounds = await bar.boundingBox();
  const first = await page
    .locator('.fc-month-day[data-date="2026-11-03"]')
    .boundingBox();
  const last = await page
    .locator('.fc-month-day[data-date="2026-11-04"]')
    .boundingBox();
  expect(bounds!.x).toBeCloseTo(first!.x + 3, 0);
  expect(bounds!.x + bounds!.width).toBeCloseTo(last!.x + last!.width - 3, 0);
});
test("overflow popup contains all events, closes with Escape and restores focus", async ({
  page,
}) => {
  const more = page.locator(
    '.fc-month-day[data-date="2026-11-03"] .fc-show-more',
  );
  await more.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".fc-month-popup .fc-event")).toHaveCount(5);
  const result = await new AxeBuilder({ page })
    .include(".fc-month-popup")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.locator(".fc-month-popup")).toHaveCount(0);
  await expect(more).toBeFocused();
});
test("selecting an event in the popup activates the original event", async ({
  page,
}) => {
  await page
    .locator('.fc-month-day[data-date="2026-11-03"] .fc-show-more')
    .click();
  await page.locator('.fc-month-popup [data-event-id="4"]').click();
  await expect(page.locator("#editor")).toBeVisible();
  await expect(page.locator("#event-title")).toHaveValue("Lunch with the team");
  await expect(page.locator(".fc-month-popup")).toHaveCount(0);
});
test("inline expansion remains available", async ({ page }) => {
  await page.evaluate(() =>
    window.demoCalendar.update({ monthOverflow: "expand" }),
  );
  await page
    .locator('.fc-month-day[data-date="2026-11-03"] .fc-show-more')
    .click();
  await expect(page.locator(".fc-month-popup")).toHaveCount(0);
  await expect(
    page.locator('.fc-month-event[data-date="2026-11-03"]'),
  ).toHaveCount(5);
});
test("changing views cleans up an open popup", async ({ page }) => {
  await page
    .locator('.fc-month-day[data-date="2026-11-03"] .fc-show-more')
    .click();
  await page.evaluate(() => window.demoCalendar.update({ view: "day" }));
  await expect(page.locator(".fc-month-popup")).toHaveCount(0);
  await expect(page.locator(".fc-time-column")).toHaveCount(2);
});
test("month height follows the actual week count", async ({ page }) => {
  await page.evaluate(() =>
    window.demoCalendar.update({ date: new Date("2027-02-01T00:00:00Z") }),
  );
  await expect(page.locator(".fc-month-week")).toHaveCount(4);
  await page.evaluate(() =>
    window.demoCalendar.update({ monthFixedWeeks: true }),
  );
  await expect(page.locator(".fc-month-week")).toHaveCount(6);
});
