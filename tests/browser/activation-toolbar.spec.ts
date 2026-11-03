import { expect, test } from "@playwright/test";

test("React toolbar reads app context and navigates the controlled period and view", async ({
  page,
}) => {
  await page.goto("/examples/react.html");
  const toolbar = page.locator(".fc-toolbar");
  await expect(toolbar.getByText("Tue, Nov 3")).toBeVisible();
  await toolbar.getByRole("button", { name: "Next" }).click();
  await expect(page.locator(".fc-time-column")).toHaveAttribute(
    "data-date",
    "2026-11-04",
  );
  await expect(toolbar.getByText("Wed, Nov 4")).toBeVisible();
  await toolbar.getByRole("button", { name: "Previous" }).click();
  await expect(page.locator(".fc-time-column")).toHaveAttribute(
    "data-date",
    "2026-11-03",
  );
  await toolbar.getByRole("button", { name: "Week" }).click();
  await expect(toolbar.getByRole("button", { name: "Week" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".fc-time-column")).toHaveCount(7);
});

test("pointer and keyboard activation identify the same overnight continuation", async ({
  page,
}) => {
  await page.goto("/");
  const continuation = page.locator(
    '[data-event-id="5"][data-date="2026-11-04"]',
  );
  await continuation.evaluate((button) => {
    const calendar = window.demoCalendar;
    const original = calendar.getOptions().events.find((e) => e.id === "5");
    calendar.update({
      onSelectEvent: (event, _source, { date, anchor }) => {
        if (event !== original || button !== anchor)
          throw new Error("Incorrect event or anchor");
        button.dataset.activation = date;
      },
    });
    calendar.scrollToTime(0);
  });
  await continuation.click();
  await expect(continuation).toHaveAttribute("data-activation", "2026-11-04");
  await continuation.evaluate((button) =>
    button.removeAttribute("data-activation"),
  );
  await continuation.press("Enter");
  await expect(continuation).toHaveAttribute("data-activation", "2026-11-04");
});

test("month overflow selection can measure the anchor before the list closes", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    window.demoCalendar.update({
      view: "month",
      onSelectEvent: (_event, _source, { date, anchor }) => {
        if (anchor.getBoundingClientRect().width > 0)
          document.body.dataset.selectedDate = date;
      },
    }),
  );
  await page
    .locator('.fc-month-day[data-date="2026-11-03"] .fc-show-more')
    .click();
  await page.locator(".fc-month-popup .fc-event").first().press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-selected-date",
    "2026-11-03",
  );
  await expect(page.locator(".fc-month-popup")).toHaveCount(0);
});
