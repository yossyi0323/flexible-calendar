import { test, expect } from "@playwright/test";
test("mobile layout stays within viewport and touch activates events", async ({
  page,
}) => {
  await page.goto("/");
  await page.selectOption("#scenario", "plain");
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
  await page.selectOption("#scenario", "plain");
  await page.getByRole("button", { name: "Day", exact: true }).tap();
  const p = await page.locator(".fc-time-column").evaluate((node) => {
    const r = node.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + (r.height * 690) / 1440 };
  });
  await page.touchscreen.tap(p.x, p.y);
  await expect(page.locator("#editor")).toBeVisible();
  await page.locator("#event-title").fill("Touch event");
  await page.locator("#save").tap();
  await expect(page.getByRole("button", { name: /Touch event/ })).toHaveCount(
    1,
  );
});
