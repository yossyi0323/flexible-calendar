import { expect, test } from "@playwright/test";
import { chooseOption } from "./select-helper.js";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await chooseOption(page, "#scenario", "Styled schedule");
});

test("slot lines keep their scale above custom column shading", async ({
  page,
}) => {
  const column = page.locator(".fc-time-column").first();
  for (const [step, hourHeight] of [
    [15, 80],
    [30, 72],
  ] as const) {
    await page.evaluate(
      ({ step, hourHeight }) =>
        window.demoCalendar.update({ step, hourHeight }),
      { step, hourHeight },
    );
    await expect(column).toHaveCSS("background-image", /linear-gradient/);
    const grid = await column.evaluate((node) => {
      const lines = getComputedStyle(node, "::before");
      return [lines.backgroundImage, lines.backgroundSize, lines.pointerEvents];
    });
    expect(grid[0]).toContain("linear-gradient");
    expect(grid.slice(1)).toEqual([
      `100% ${(step * hourHeight) / 60}px`,
      "none",
    ]);
  }
});

test("both sides of a narrow card resize beyond the painted grip", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.demoCalendar.update({
      onEventChange: (change) => {
        document.body.dataset.action = change.action;
      },
    }),
  );
  const card = page.locator('.fc-timed-event[data-event-id="3"]').first();
  await card.scrollIntoViewIfNeeded();
  const initial = (await card.boundingBox())!;
  const column = (await card.locator("..").boundingBox())!;
  expect(initial.width).toBeLessThan(column.width * 0.6);
  for (const [edge, side] of [
    ["start", "left"],
    ["end", "right"],
  ] as const) {
    const handle = card.locator(`[data-edge="${edge}"]`);
    const rect = (await handle.boundingBox())!;
    const offset = {
      x: side === "left" ? 2 : rect.width - 2,
      y: rect.height / 2,
    };
    await handle.hover({ position: offset });
    const visible = (await handle.boundingBox())!;
    const x = visible.x + offset.x;
    const y = visible.y + offset.y;
    expect(
      await handle.evaluate((node) => {
        const grip = getComputedStyle(node, "::after");
        return [grip.width, grip.height];
      }),
    ).toEqual(["24px", "2px"]);
    await page.mouse.down();
    await page.mouse.move(x, y + (edge === "start" ? -32 : 32), { steps: 5 });
    await page.mouse.up();
    await expect(page.locator("body")).toHaveAttribute(
      "data-action",
      `resize-${edge}`,
    );
  }
});

test("inset preserves short-event hit bounds and light/dark continuation edges", async ({
  page,
}) => {
  const short = page
    .locator('.fc-timed-event[data-event-id="handoff"]')
    .first();
  await short.scrollIntoViewIfNeeded();
  const original = await short.boundingBox();
  await short.evaluate((node) =>
    node.style.setProperty("--fc-event-inset", "3px"),
  );
  expect(await short.boundingBox()).toEqual(original);
  await short.click({ position: { x: 1, y: original!.height / 2 } });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  for (const theme of ["Light", "Dark"]) {
    await chooseOption(page, "#theme", theme);
    const ending = page.locator(".fc-continues-after").first();
    const starting = page.locator(".fc-continues-before").first();
    expect(
      await ending.evaluate(
        (node) => getComputedStyle(node, "::before").borderBottomStyle,
      ),
    ).toBe("dashed");
    expect(
      await starting.evaluate(
        (node) => getComputedStyle(node, "::before").borderTopStyle,
      ),
    ).toBe("dashed");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    // Select restores trigger focus asynchronously after its listbox unmounts.
    await expect(page.locator("#theme")).toBeFocused();
    await short.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(short).toBeFocused();
    await expect(short).toHaveCSS("outline-style", "solid");
  }
});
