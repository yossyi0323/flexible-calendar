import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1400, height: 1100 } });

for (const direction of ["ltr", "rtl"] as const) {
  for (const action of ["move", "resize"] as const) {
    test(`${direction} ${action} preview preserves both overlap lanes`, async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.locator(".fc-calendar")).toBeVisible();
      await page.evaluate(
        (direction) => window.demoCalendar.update({ direction }),
        direction,
      );
      const column = page.locator(".fc-time-column").first();
      const events = column.locator(".fc-timed-event");
      // The first two events overlap and occupy opposite half-width lanes.
      for (const index of [0, 1]) {
        const event = events.nth(index);
        const source = (await event.boundingBox())!;
        const origin = (await column.boundingBox())!;
        expect(source.width).toBeLessThan(origin.width * 0.6);
        const x = source.x + source.width / 2;
        const y =
          action === "resize"
            ? source.y + source.height - 2
            : source.y + source.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        const targetColumn =
          action === "move" ? page.locator(".fc-time-column").nth(1) : column;
        const target = (await targetColumn.boundingBox())!;
        await page.mouse.move(target.x + target.width / 2, y + 32, {
          steps: 5,
        });
        const preview = targetColumn.locator(".fc-preview");
        await expect(preview).toBeVisible();
        const ghost = (await preview.boundingBox())!;
        expect(Math.abs(ghost.width - source.width)).toBeLessThan(1);
        expect(
          Math.abs(ghost.x - target.x - (source.x - origin.x)),
        ).toBeLessThan(1);
        await page.keyboard.press("Escape");
        await page.mouse.up();
        await page.keyboard.press("Escape");
        await expect(page.locator(".fc-preview")).toHaveCount(0);
      }
    });
  }
}

test("empty-slot selection still spans the column", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".fc-calendar")).toBeVisible();
  const column = page.locator(".fc-time-column").nth(1);
  const rect = (await column.boundingBox())!;
  const y = rect.y + (rect.height * 12) / 24;
  await page.mouse.move(rect.x + rect.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2, y + 32, { steps: 5 });
  const preview = (await column.locator(".fc-preview").boundingBox())!;
  expect(Math.abs(preview.width - rect.width)).toBeLessThan(2);
  await page.keyboard.press("Escape");
  await page.mouse.up();
});
