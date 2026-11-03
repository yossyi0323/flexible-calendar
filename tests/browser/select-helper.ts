import type { Page } from "@playwright/test";

export async function chooseOption(
  page: Page,
  selector: string,
  label: string,
) {
  await page.locator(selector).click();
  await page.getByRole("option", { name: label, exact: true }).click();
}
