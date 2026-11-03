import { chooseOption } from "./select-helper.js";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { CalendarHandle } from "../../src/dom/index.js";
declare global {
  interface Window {
    demoCalendar: CalendarHandle;
  }
}
test.use({
  timezoneId: "America/New_York",
  viewport: { width: 1280, height: 720 },
});
async function selectDate(page: Page, field: "start" | "end", date: string) {
  await page.locator(`#event-${field}`).click();
  const [year, month, day] = date.split("-").map(Number);
  await page
    .locator(`#event-${field}-popover [data-day="${month}/${day}/${year}"]`)
    .click();
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".fc-calendar")).toBeVisible();
});
test("edits exact dates and times in the calendar zone, including overnight events", async ({
  page,
}) => {
  await page.locator('[data-event-id="2"]').click();
  await expect(page.locator("#event-start")).toHaveAttribute(
    "data-date",
    "2026-11-03",
  );
  await expect(page.locator("#event-start-time")).toHaveValue("09:15");
  await page.locator("#event-start-time").fill("23:10");
  await selectDate(page, "end", "2026-11-04");
  await page.locator("#event-end-time").fill("01:25");
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
  await page.locator("#event-end-time").fill("08:00");
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
  await page.locator("#event-start-time").fill("12:07");
  await page.locator("#event-end-time").fill("12:42");
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
  await expect(page.locator("#event-start")).toHaveAttribute(
    "data-date",
    "2026-11-04",
  );
  await expect(page.locator("#event-end")).toHaveAttribute(
    "data-date",
    "2026-11-04",
  );
  await selectDate(page, "end", "2026-11-05");
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
    await chooseOption(page, "#theme", theme === "dark" ? "Dark" : "Light");
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

test("shadcn calendar selects a date and keeps typed time in the calendar zone", async ({
  page,
}) => {
  await page.locator('[data-event-id="2"]').click();
  await expect(
    page.locator(
      '#editor input[type="datetime-local"], #editor input[type="date"]',
    ),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Choose end date", exact: true })
    .click();
  const popup = page.locator("#event-end-popover");
  await expect(popup).toBeVisible();
  await popup
    .getByRole("button", { name: /Wednesday, November 4th, 2026/ })
    .click();
  await expect(page.locator("#event-end")).toHaveAttribute(
    "data-date",
    "2026-11-04",
  );
  await page.locator("#event-end-time").fill("02:07");
  await page.locator("#save").click();
  expect(
    await page.evaluate(() =>
      window.demoCalendar
        .getOptions()
        .events.find((e) => e.id === "2")!
        .end.toISOString(),
    ),
  ).toBe("2026-11-03T17:07:00.000Z");
});
for (const theme of ["light", "dark"])
  test(`shadcn date popup ${theme} accessibility and keyboard dismissal`, async ({
    page,
  }, testInfo) => {
    await chooseOption(page, "#theme", theme === "dark" ? "Dark" : "Light");
    await page.locator('[data-event-id="2"]').click();
    await page
      .getByRole("button", { name: "Choose end date", exact: true })
      .click();
    const popup = page.locator("#event-end-popover");
    await expect(popup).toBeVisible();
    await popup.evaluate(async (n) => {
      await Promise.all(n.getAnimations().map((a) => a.finished));
    });
    const result = await new AxeBuilder({ page })
      .include("#event-end-popover")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`date-picker-${theme}.png`),
    });
    await page.keyboard.press("Escape");
    await expect(popup).not.toBeVisible();
    await expect(page.locator("#editor")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Choose end date", exact: true }),
    ).toBeFocused();
  });

test("native time fields and date popovers preserve the time interval", async ({
  page,
}) => {
  await page.locator('[data-event-id="2"]').click();
  await expect(page.locator('#editor input[type="time"]')).toHaveCount(2);
  await expect(page.locator('#editor input[type="number"]')).toHaveCount(0);
  await expect(page.locator("#event-start-time")).toHaveAttribute("step", "60");
  await selectDate(page, "start", "2026-11-05");
  await page.locator("#save").click();
  expect(
    await page.evaluate(() => {
      const e = window.demoCalendar
        .getOptions()
        .events.find((e) => e.id === "2")!;
      return [e.start.toISOString(), e.end.toISOString()];
    }),
  ).toEqual(["2026-11-05T00:15:00.000Z", "2026-11-05T01:15:00.000Z"]);
  await page.locator('[data-event-id="2"]').click();
  await page.locator("#event-all-day").check();
  await expect(page.locator('#editor input[type="time"]')).toHaveCount(0);
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
]) {
  test(`compact editor fits ${viewport.width}x${viewport.height} with date and time on the same row`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await chooseOption(page, "#theme", "Dark");
    await page.locator('[data-event-id="2"]').click();
    const editor = page.locator("#editor");
    await expect(editor).toBeVisible();
    await editor.evaluate(async (node) => {
      await Promise.all(node.getAnimations().map((a) => a.finished));
    });
    const geometry = await editor.evaluate((node) => ({
      height: node.clientHeight,
      content: node.scrollHeight,
    }));
    expect(geometry.content).toBeLessThanOrEqual(geometry.height + 1);
    await expect(page.locator('[data-slot="calendar"]')).toHaveCount(0);
    for (const field of ["start", "end"]) {
      const date = (await page.locator(`#event-${field}`).boundingBox())!;
      const time = (await page.locator(`#event-${field}-time`).boundingBox())!;
      expect(Math.abs(date.y - time.y)).toBeLessThan(3);
      expect(time.x).toBeGreaterThan(date.x);
      expect(time.x + time.width).toBeLessThan(viewport.width);
    }
    const start = (await page.locator("#event-start").boundingBox())!;
    const end = (await page.locator("#event-end").boundingBox())!;
    if (viewport.width >= 640) {
      expect(Math.abs(start.y - end.y)).toBeLessThan(2);
      expect(end.x).toBeGreaterThan(start.x + start.width);
    } else {
      expect(end.y).toBeGreaterThan(start.y);
    }
    const save = (await page.locator("#save").boundingBox())!;
    expect(save.y + save.height).toBeLessThan(viewport.height);
    await page.screenshot({
      path: testInfo.outputPath(`compact-${viewport.width}.png`),
    });
  });
}

for (const theme of ["light", "dark"]) {
  test(`shadcn resource select in ${theme} supports keyboard selection and persists the column`, async ({
    page,
  }) => {
    await chooseOption(page, "#theme", theme === "dark" ? "Dark" : "Light");
    await page.locator('[data-event-id="2"]').click();
    const dialog = (await page.locator("#editor").boundingBox())!;
    const date = (await page.locator("#event-start").boundingBox())!;
    const time = (await page.locator("#event-end-time").boundingBox())!;
    expect(dialog.width).toBeLessThan(600);
    expect(dialog.x + dialog.width - (time.x + time.width)).toBeLessThan(30);
    expect(date.x - dialog.x).toBeLessThan(30);
    await page.locator("#event-resource").click();
    const options = page.getByRole("listbox");
    await expect(options).toBeVisible();
    await expect(
      options.getByRole("option", { name: "DO", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    const result = await new AxeBuilder({ page })
      .include('[role="listbox"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    await page.keyboard.press("Home");
    await page.keyboard.press("Enter");
    await expect(options).not.toBeVisible();
    await expect(page.locator("#event-resource")).toContainText("PLAN");
    await page.locator("#save").click();
    expect(
      await page.evaluate(
        () =>
          window.demoCalendar.getOptions().events.find((e) => e.id === "2")!
            .resourceId,
      ),
    ).toBe("plan");
  });
}
