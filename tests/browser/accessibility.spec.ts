import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const theme of ["light", "dark"]) {
  test(`${theme} calendar views have no automatic WCAG A/AA violations`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.selectOption("#theme", theme);
    for (const view of ["Vertical", "Month", "Agenda"]) {
      await page.getByRole("button", { name: view, exact: true }).click();
      const result = await new AxeBuilder({ page })
        .include(".fc-calendar")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    }
  });
}
test("custom React and Vue content survives navigation", async ({ page }) => {
  for (const framework of ["react", "vue"]) {
    await page.goto(`/examples/${framework}.html`);
    await expect(page.locator(`[data-custom="${framework}"]`)).toHaveCount(1);
    await page.getByRole("button", { name: "Week", exact: true }).click();
    await expect(page.locator(`[data-custom="${framework}"]`)).toHaveCount(1);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.locator(`[data-custom="${framework}"]`)).toHaveCount(0);
    await page.getByRole("button", { name: "Previous", exact: true }).click();
    await expect(page.locator(`[data-custom="${framework}"]`)).toHaveCount(1);
  }
});
test("screenshots for visual review", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const theme of ["light", "dark"]) {
    await page.selectOption("#theme", theme);
    await page.screenshot({
      path: testInfo.outputPath(`${theme}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("month.png"),
    fullPage: true,
  });
});
