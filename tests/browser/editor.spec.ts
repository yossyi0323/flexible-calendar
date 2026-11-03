import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { CalendarHandle } from "../../src/dom/index.js";
declare global {
  interface Window {
    demoCalendar: CalendarHandle;
  }
}
test.use({ timezoneId: "America/New_York" });
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("edits exact dates and times in the calendar zone, including overnight events", async ({
  page,
}) => {
  await page.locator('[data-event-id="2"]').click();
  await expect(page.locator("#event-start")).toHaveValue("2026-11-03T09:15");
  await page.locator("#event-start").fill("2026-11-03T23:10");
  await page.locator("#event-end").fill("2026-11-04T01:25");
  await page.locator("#save").click();
  await expect(page.locator("#editor")).not.toBeVisible();
  expect(
    await page.evaluate(() => {
      const e = window.demoCalendar
        .getOptions()
        .events.find((e) => e.id === "2")!;
      return [e.start.toISOString(), e.end.toISOString(), e.resourceId];
    }),
  ).toEqual(["2026-11-03T14:10:00.000Z", "2026-11-03T16:25:00.000Z", "do"]);
  await expect(page.locator('[data-event-id="2"]')).toHaveCount(2);
});
test("rejects reversed intervals without closing or changing the event", async ({
  page,
}) => {
  await page.locator('[data-event-id="2"]').click();
  await page.locator("#event-end").fill("2026-11-03T08:00");
  await page.locator("#save").click();
  await expect(page.getByRole("alert")).toHaveText("End must be after start.");
  expect(
    await page.evaluate(() =>
      window.demoCalendar
        .getOptions()
        .events.find((e) => e.id === "2")!
        .end.toISOString(),
    ),
  ).toBe("2026-11-03T01:15:00.000Z");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator('[data-event-id="2"]')).toBeFocused();
});
test("new events accept typed times independently of the selection interval", async ({
  page,
}) => {
  await page.locator(".fc-time-column").nth(1).focus();
  await page.keyboard.press("Enter");
  await page.locator("#event-title").fill("Typed schedule");
  await page.locator("#event-start").fill("2026-11-03T12:07");
  await page.locator("#event-end").fill("2026-11-03T12:42");
  await page.locator("#save").click();
  expect(
    await page.evaluate(() => {
      const e = window.demoCalendar
        .getOptions()
        .events.find((e) => e.title === "Typed schedule")!;
      return [e.start.toISOString(), e.end.toISOString()];
    }),
  ).toEqual(["2026-11-03T03:07:00.000Z", "2026-11-03T03:42:00.000Z"]);
});
test("all-day date input uses an inclusive end without changing the exclusive event contract", async ({
  page,
}) => {
  await page.locator('[data-event-id="6"]').click();
  await expect(page.locator("#event-start")).toHaveValue("2026-11-04");
  await expect(page.locator("#event-end")).toHaveValue("2026-11-04");
  await page.locator("#event-end").fill("2026-11-05");
  await page.locator("#save").click();
  expect(
    await page.evaluate(() =>
      window.demoCalendar
        .getOptions()
        .events.find((e) => e.id === "6")!
        .end.toISOString(),
    ),
  ).toBe("2026-11-05T15:00:00.000Z");
});
for (const theme of ["light", "dark"])
  test(`shadcn editor in ${theme} has no automatic accessibility violations`, async ({
    page,
  }, testInfo) => {
    await page.selectOption("#theme", theme);
    await page.locator('[data-event-id="2"]').click();
    await expect(page.locator("#editor")).toBeVisible();
    await page.locator("#editor").evaluate(async (node) => {
      await Promise.all(
        node.getAnimations().map((animation) => animation.finished),
      );
    });
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`editor-${theme}.png`),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(page.locator("#editor")).not.toBeVisible();
  });
