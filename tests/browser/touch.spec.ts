import { chooseOption } from "./select-helper.js";
import { test, expect } from "@playwright/test";
test("mobile layout stays within viewport and touch activates events", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".fc-calendar")).toBeVisible();
  await chooseOption(page, "#scenario", "Personal calendar");
  await page.getByRole("button", { name: "Day", exact: true }).tap();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator('[data-event-id="1"]').tap();
  await expect(page.locator("#editor")).toBeVisible();
  await expect(page.locator("#event-title")).toHaveValue(
    "Design the next chapter",
  );
});
test("touch taps empty cells to create a new event", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".fc-calendar")).toBeVisible();
  await chooseOption(page, "#scenario", "Personal calendar");
  await page.getByRole("button", { name: "Day", exact: true }).tap();
  await expect(
    page.getByRole("button", { name: "Day", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const column = page.locator(".fc-time-column");
  const position = await column.evaluate((node) => ({
    x: node.clientWidth / 2,
    y: (node.clientHeight * 690) / 1440,
  }));
  await column.tap({ position });
  await expect(page.locator("#event-start-time")).toHaveValue("11:30");
  await page.locator("#event-title").fill("Touch event");
  await page.locator("#save").tap();
  await expect(page.getByRole("button", { name: /Touch event/ })).toHaveCount(
    1,
  );
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`touch editor fits ${viewport.width}x${viewport.height} through date and column selection`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(
      viewport.width > viewport.height ? { width: 390, height: 844 } : viewport,
    );
    await page.goto("/");
    await expect(page.locator(".fc-calendar")).toBeVisible();
    await page.locator('[data-event-id="1"]').first().tap();
    const editor = page.locator("#editor");
    await expect(editor).toBeVisible();
    await page.setViewportSize(viewport);
    await editor.evaluate(async (node) => {
      await Promise.all(node.getAnimations().map((a) => a.finished));
    });
    const bounds = await editor.evaluate((node) => ({
      left: node.getBoundingClientRect().left,
      right: node.getBoundingClientRect().right,
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(viewport.width);
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.client + 1);
    for (const field of ["start", "end"]) {
      const input = page.locator(`#event-${field}-time`);
      await input.scrollIntoViewIfNeeded();
      const rect = (await input.boundingBox())!;
      expect(rect.x).toBeGreaterThanOrEqual(bounds.left);
      expect(rect.x + rect.width).toBeLessThanOrEqual(bounds.right);
    }
    await page.locator("#event-start-time").fill("23:10");
    await page.locator("#event-end").tap();
    const popup = page.locator("#event-end-popover");
    await expect(popup).toBeVisible();
    await popup.evaluate(async (node) => {
      await Promise.all(node.getAnimations().map((a) => a.finished));
    });
    const popupRect = (await popup.boundingBox())!;
    expect(popupRect.x).toBeGreaterThanOrEqual(0);
    expect(popupRect.x + popupRect.width).toBeLessThanOrEqual(viewport.width);
    expect(popupRect.y).toBeGreaterThanOrEqual(0);
    expect(popupRect.y + popupRect.height).toBeLessThanOrEqual(viewport.height);
    await popup
      .getByRole("button", { name: /Wednesday, November 4th, 2026/ })
      .tap();
    await page.locator("#event-end-time").fill("01:25");
    await page.locator("#event-resource").tap();
    const options = page.getByRole("listbox");
    await expect(options).toBeVisible();
    const optionRect = (await options.boundingBox())!;
    expect(optionRect.x).toBeGreaterThanOrEqual(0);
    expect(optionRect.x + optionRect.width).toBeLessThanOrEqual(viewport.width);
    await options.getByRole("option", { name: "DO", exact: true }).tap();
    await page.locator("#save").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`touch-editor-${viewport.width}.png`),
    });
    await page.locator("#save").tap();
    await expect(editor).not.toBeVisible();
    expect(
      await page.evaluate(() => {
        const event = window.demoCalendar
          .getOptions()
          .events.find((e) => e.id === "1")!;
        return [
          event.start.toISOString(),
          event.end.toISOString(),
          event.resourceId,
        ];
      }),
    ).toEqual(["2026-11-03T14:10:00.000Z", "2026-11-03T16:25:00.000Z", "do"]);
  });
}

test("landscape keeps timed events reachable below the toolbar and headers", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await expect(page.locator(".fc-calendar")).toBeVisible();
  await page.locator('[data-event-id="1"]').first().tap();
  await expect(page.locator("#editor")).toBeVisible();
});
